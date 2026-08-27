import type { VideoOutputFormat } from "../../domain/value-objects/VideoOutputFormat";

export type CompressVideoInput = {
  fileBuffer: Uint8Array;
  originalFilename: string;
  mimeType: string;
  quality?: number;
  outputFormat?: VideoOutputFormat;
  maxWidth?: number;
  maxHeight?: number;
};
