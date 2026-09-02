import type { VideoOutputFormat } from "../../domain/value-objects/VideoOutputFormat";

export type StoredCompressedVideo = {
  id: string;
  filePath: string;
  filename: string;
  mimeType: string;
  outputFormat: VideoOutputFormat;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  expiresAt: Date;
};

export type SaveCompressedVideoInput = {
  filePath: string;
  filename: string;
  mimeType: string;
  outputFormat: VideoOutputFormat;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  ttlSeconds: number;
};

export interface CompressedVideoDownloadStorePort {
  save(input: SaveCompressedVideoInput): Promise<StoredCompressedVideo>;
  get(id: string): Promise<StoredCompressedVideo | null>;
}
