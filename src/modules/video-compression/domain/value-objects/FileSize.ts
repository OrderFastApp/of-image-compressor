export class FileSize {
  readonly bytes: number;

  constructor(bytes: number) {
    if (!Number.isFinite(bytes) || bytes < 0) {
      throw new RangeError("File size must be a non-negative number");
    }
    this.bytes = bytes;
  }

  exceeds(maxBytes: number): boolean {
    return this.bytes > maxBytes;
  }
}
