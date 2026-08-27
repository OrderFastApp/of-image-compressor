import {
  type VideoOutputFormat,
  mimeTypeFromVideoOutputFormat,
} from "../value-objects/VideoOutputFormat";

export class VideoCompressionResult {
  readonly filePath: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly outputFormat: VideoOutputFormat;
  readonly originalSize: number;
  readonly compressedSize: number;
  readonly compressionRatio: number;

  constructor(params: {
    filePath: string;
    filename: string;
    outputFormat: VideoOutputFormat;
    originalSize: number;
    compressedSize: number;
  }) {
    this.filePath = params.filePath;
    this.filename = params.filename;
    this.outputFormat = params.outputFormat;
    this.mimeType = mimeTypeFromVideoOutputFormat(params.outputFormat);
    this.originalSize = params.originalSize;
    this.compressedSize = params.compressedSize;
    this.compressionRatio = VideoCompressionResult.calculateRatio(
      params.originalSize,
      params.compressedSize,
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
