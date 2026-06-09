import type { OutputFormat } from "../value-objects/OutputFormat";
import type { Quality } from "../value-objects/Quality";

export class CompressionOptions {
  readonly quality: Quality;
  readonly outputFormat: OutputFormat;
  readonly maxWidth?: number;
  readonly maxHeight?: number;

  constructor(quality: Quality, outputFormat: OutputFormat, maxWidth?: number, maxHeight?: number) {
    if (maxWidth !== undefined && (!Number.isInteger(maxWidth) || maxWidth <= 0)) {
      throw new RangeError("maxWidth must be a positive integer");
    }
    if (maxHeight !== undefined && (!Number.isInteger(maxHeight) || maxHeight <= 0)) {
      throw new RangeError("maxHeight must be a positive integer");
    }

    this.quality = quality;
    this.outputFormat = outputFormat;
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
  }
}
