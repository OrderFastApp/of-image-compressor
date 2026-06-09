import type { OutputFormat } from "../value-objects/OutputFormat";
import { mimeTypeFromOutputFormat } from "../value-objects/OutputFormat";

export class CompressionResult {
  readonly fileBuffer: Uint8Array;
  readonly filename: string;
  readonly mimeType: string;
  readonly outputFormat: OutputFormat;
  readonly originalSize: number;
  readonly compressedSize: number;
  readonly compressionRatio: number;

  constructor(params: {
    fileBuffer: Uint8Array;
    filename: string;
    outputFormat: OutputFormat;
    originalSize: number;
  }) {
    this.fileBuffer = params.fileBuffer;
    this.filename = params.filename;
    this.outputFormat = params.outputFormat;
    this.mimeType = mimeTypeFromOutputFormat(params.outputFormat);
    this.originalSize = params.originalSize;
    this.compressedSize = params.fileBuffer.length;
    this.compressionRatio = CompressionResult.calculateRatio(
      params.originalSize,
      this.compressedSize,
    );
  }

  static calculateRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) {
      return 0;
    }
    const saved = ((originalSize - compressedSize) / originalSize) * 100;
    return Math.round(saved * 10) / 10;
  }
}
