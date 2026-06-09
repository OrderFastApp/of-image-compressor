import type { OutputFormat } from "../../domain/value-objects/OutputFormat";

export type CompressImageOutput = {
  fileBuffer: Uint8Array;
  filename: string;
  mimeType: string;
  outputFormat: OutputFormat;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
};
