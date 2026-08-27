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
      throw new VideoCompressionFailedError(
        `ffmpeg failed${stderr ? `: ${stderr.trim().slice(-500)}` : ""}`,
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
    const args = ["-y", "-i", inputPath, "-progress", "pipe:1", "-nostats"];

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
      "medium",
      "-crf",
      String(crf),
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

    // Keep aspect ratio; -2 ensures even dimensions for codecs.
    if (maxWidth !== undefined && maxHeight !== undefined) {
      return `scale='min(${maxWidth},iw)':'min(${maxHeight},ih)':force_original_aspect_ratio=decrease`;
    }

    if (maxWidth !== undefined) {
      return `scale=${maxWidth}:-2`;
    }

    return `scale=-2:${maxHeight}`;
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
