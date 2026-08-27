import type { VideoCompressionOptions } from "../../domain/entities/VideoCompressionOptions";
import type { VideoOutputFormat } from "../../domain/value-objects/VideoOutputFormat";

export type VideoCompressionRequest = {
  inputPath: string;
  outputPath: string;
  options: VideoCompressionOptions;
  durationSeconds: number;
  onProgress: (percent: number) => void;
};

export type VideoCompressionResponse = {
  outputPath: string;
  outputFormat: VideoOutputFormat;
  compressedSize: number;
};

export interface VideoCompressorPort {
  compress(request: VideoCompressionRequest): Promise<VideoCompressionResponse>;
}
