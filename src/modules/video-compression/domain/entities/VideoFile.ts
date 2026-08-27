import { FileSize } from "../value-objects/FileSize";
import type { VideoMimeType } from "../value-objects/VideoMimeType";

export class VideoFile {
  readonly buffer: Uint8Array;
  readonly filename: string;
  readonly mimeType: VideoMimeType;
  readonly size: FileSize;

  constructor(buffer: Uint8Array, filename: string, mimeType: VideoMimeType) {
    if (buffer.length === 0) {
      throw new Error("Video buffer cannot be empty");
    }
    this.buffer = buffer;
    this.filename = filename;
    this.mimeType = mimeType;
    this.size = new FileSize(buffer.length);
  }
}
