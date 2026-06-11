import type { OutputFormat } from "../../domain/value-objects/OutputFormat";

export type CompressImageInput = {
  fileBuffer: Uint8Array;
  originalFilename: string;
  mimeType: string;
  quality?: number;
  outputFormat?: OutputFormat;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: string;
};
