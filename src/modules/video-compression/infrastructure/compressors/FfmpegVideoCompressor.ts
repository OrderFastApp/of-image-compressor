import type { TempFileStoragePort } from "../../application/ports/TempFileStoragePort";
import type {
  VideoCompressionRequest,
  VideoCompressionResponse,
  VideoCompressorPort,
} from "../../application/ports/VideoCompressorPort";
import { VideoCompressionFailedError } from "../../domain/errors/VideoCompressionFailedError";
import type { VideoOutputFormat } from "../../domain/value-objects/VideoOutputFormat";

export class FfmpegVideoCompressor implements VideoCompressorPort {
  constructor(
    private readonly ffmpegPath: string,
    private readonly tempStorage: TempFileStoragePort,
    private readonly threads = 2,
  ) {}

  async compress(request: VideoCompressionRequest): Promise<VideoCompressionResponse> {
    const args = this.buildArgs(request);

    const proc = Bun.spawn([this.ffmpegPath, ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const durationMs = Math.max(request.durationSeconds * 1000, 1);
    let lastReportedPercent = -1;

    const progressPromise = this.consumeProgress(proc.stdout, durationMs, (percent) => {
      if (percent - lastReportedPercent >= 0.5 || percent >= 100) {
        lastReportedPercent = percent;
        request.onProgress(percent);
      }
    });

    const stderrPromise = new Response(proc.stderr).text();
    const [exitCode, stderr] = await Promise.all([proc.exited, stderrPromise, progressPromise]);

    if (exitCode !== 0) {
      const oomHint =
        exitCode === 137
          ? " (process killed; likely out of memory — raise container memory limit or lower WORKERS/FFMPEG_THREADS)"
          : "";
      throw new VideoCompressionFailedError(
        `ffmpeg failed (exit ${exitCode})${oomHint}${stderr ? `: ${this.extractFfmpegError(stderr)}` : ""}`,
      );
    }

    request.onProgress(100);

    const compressedSize = await this.tempStorage.size(request.outputPath);

    return {
      outputPath: request.outputPath,
      outputFormat: request.options.outputFormat,
      compressedSize,
    };
  }

  private buildArgs(request: VideoCompressionRequest): string[] {
    const { inputPath, outputPath, options } = request;
    const args = [
      "-y",
      "-threads",
      String(this.threads),
      "-i",
      inputPath,
      "-progress",
      "pipe:1",
      "-nostats",
    ];

    const scaleFilter = this.buildScaleFilter(options.maxWidth, options.maxHeight);
    if (scaleFilter) {
      args.push("-vf", scaleFilter);
    }

    args.push(...this.buildCodecArgs(options.outputFormat, options.crf.value));
    args.push(outputPath);

    return args;
  }

  private buildCodecArgs(format: VideoOutputFormat, crf: number): string[] {
    if (format === "webm") {
      return [
        "-c:v",
        "libvpx-vp9",
        "-crf",
        String(crf),
        "-b:v",
        "0",
        "-row-mt",
        "1",
        "-threads",
        String(this.threads),
        "-c:a",
        "libopus",
        "-b:a",
        "128k",
      ];
    }

    return [
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      String(crf),
      "-threads",
      String(this.threads),
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
    ];
  }

  private buildScaleFilter(maxWidth?: number, maxHeight?: number): string | null {
    if (maxWidth === undefined && maxHeight === undefined) {
      return null;
    }

    // No shell quotes: Bun.spawn passes argv literally.
    // Escape commas inside expressions (`,` separates filters in -vf).
    // force_divisible_by=2 keeps dimensions even for libx264/libvpx.
    if (maxWidth !== undefined && maxHeight !== undefined) {
      return `scale=w=min(iw\\,${maxWidth}):h=min(ih\\,${maxHeight}):force_original_aspect_ratio=decrease:force_divisible_by=2`;
    }

    if (maxWidth !== undefined) {
      return `scale=${maxWidth}:-2`;
    }

    return `scale=-2:${maxHeight}`;
  }

  private extractFfmpegError(stderr: string): string {
    const lines = stderr
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const errorLines = lines.filter((line) =>
      /error|invalid|unable|failed|not found|denied|conversion failed/i.test(line),
    );

    const selected = errorLines.length > 0 ? errorLines.slice(-5) : lines.slice(-8);
    return selected.join(" | ").slice(0, 500);
  }

  private async consumeProgress(
    stdout: ReadableStream<Uint8Array>,
    durationMs: number,
    onProgress: (percent: number) => void,
  ): Promise<void> {
    const reader = stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const percent = this.parseProgressLine(line, durationMs);
          if (percent !== null) {
            onProgress(percent);
          }
        }
      }
    } catch {
      // Stream closed or aborted; progress is best-effort.
    } finally {
      reader.releaseLock();
    }
  }

  private parseProgressLine(line: string, durationMs: number): number | null {
    const trimmed = line.trim();
    if (!trimmed.includes("=")) {
      return null;
    }

    const [key, rawValue] = trimmed.split("=", 2);
    if (!rawValue) {
      return null;
    }

    let outTimeMs: number | null = null;

    if (key === "out_time_ms") {
      const parsed = Number.parseInt(rawValue, 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        // ffmpeg reports microseconds in out_time_ms despite the name.
        outTimeMs = parsed / 1000;
      }
    } else if (key === "out_time") {
      outTimeMs = this.parseTimestampToMs(rawValue);
    }

    if (outTimeMs === null) {
      return null;
    }

    const percent = Math.min(100, Math.max(0, (outTimeMs / durationMs) * 100));
    return Math.round(percent * 10) / 10;
  }

  private parseTimestampToMs(value: string): number | null {
    // HH:MM:SS.microseconds
    const match = /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(value);
    if (!match) {
      return null;
    }

    const hours = Number.parseInt(match[1] ?? "0", 10);
    const minutes = Number.parseInt(match[2] ?? "0", 10);
    const seconds = Number.parseFloat(match[3] ?? "0");
    if (![hours, minutes, seconds].every(Number.isFinite)) {
      return null;
    }

    return ((hours * 60 + minutes) * 60 + seconds) * 1000;
  }
}
