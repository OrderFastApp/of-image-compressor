import type {
  VideoMetadata,
  VideoMetadataReaderPort,
} from "../../application/ports/VideoMetadataReaderPort";
import { InvalidVideoTypeError } from "../../domain/errors/InvalidVideoTypeError";

type FfprobeJson = {
  format?: {
    duration?: string;
    format_name?: string;
  };
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
  }>;
};

export class FfprobeVideoMetadataReader implements VideoMetadataReaderPort {
  constructor(private readonly ffprobePath: string) {}

  async read(filePath: string): Promise<VideoMetadata> {
    const proc = Bun.spawn(
      [
        this.ffprobePath,
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        filePath,
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    if (exitCode !== 0) {
      throw new InvalidVideoTypeError(
        `Unable to probe video metadata${stderr ? `: ${stderr.trim()}` : ""}`,
      );
    }

    let parsed: FfprobeJson;
    try {
      parsed = JSON.parse(stdout) as FfprobeJson;
    } catch {
      throw new InvalidVideoTypeError("Invalid ffprobe output");
    }

    const durationSeconds = Number.parseFloat(parsed.format?.duration ?? "NaN");
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new InvalidVideoTypeError("Unable to read video duration");
    }

    const videoStream = parsed.streams?.find((stream) => stream.codec_type === "video");

    return {
      durationSeconds,
      width: videoStream?.width,
      height: videoStream?.height,
      format: parsed.format?.format_name,
    };
  }
}
