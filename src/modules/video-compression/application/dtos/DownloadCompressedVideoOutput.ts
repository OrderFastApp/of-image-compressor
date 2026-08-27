import type { VideoOutputFormat } from "../../domain/value-objects/VideoOutputFormat";

export type DownloadCompressedVideoOutput = {
  fileBuffer: Uint8Array;
  filename: string;
  mimeType: string;
  outputFormat: VideoOutputFormat;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
};
