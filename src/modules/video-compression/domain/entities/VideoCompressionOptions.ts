import type { VideoCrf } from "../value-objects/VideoCrf";
import type { VideoOutputFormat } from "../value-objects/VideoOutputFormat";

export class VideoCompressionOptions {
  readonly crf: VideoCrf;
  readonly outputFormat: VideoOutputFormat;
  readonly maxWidth?: number;
  readonly maxHeight?: number;

  constructor(
    crf: VideoCrf,
    outputFormat: VideoOutputFormat,
    maxWidth?: number,
    maxHeight?: number,
  ) {
    if (maxWidth !== undefined && (!Number.isInteger(maxWidth) || maxWidth <= 0)) {
      throw new RangeError("maxWidth must be a positive integer");
    }
    if (maxHeight !== undefined && (!Number.isInteger(maxHeight) || maxHeight <= 0)) {
      throw new RangeError("maxHeight must be a positive integer");
    }

    this.crf = crf;
    this.outputFormat = outputFormat;
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
  }
}
