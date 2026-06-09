import { FileSize } from "../value-objects/FileSize";
import type { ImageMimeType } from "../value-objects/ImageMimeType";

export class ImageFile {
  readonly buffer: Uint8Array;
  readonly filename: string;
  readonly mimeType: ImageMimeType;
  readonly size: FileSize;

  constructor(buffer: Uint8Array, filename: string, mimeType: ImageMimeType) {
    if (buffer.length === 0) {
      throw new Error("Image buffer cannot be empty");
    }
    this.buffer = buffer;
    this.filename = filename;
    this.mimeType = mimeType;
    this.size = new FileSize(buffer.length);
  }
}
