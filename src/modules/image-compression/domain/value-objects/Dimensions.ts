export class Dimensions {
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    if (!Number.isFinite(width) || width <= 0) {
      throw new RangeError("Width must be a positive number");
    }
    if (!Number.isFinite(height) || height <= 0) {
      throw new RangeError("Height must be a positive number");
    }
    this.width = width;
    this.height = height;
  }

  exceeds(maxWidth: number, maxHeight: number): boolean {
    return this.width > maxWidth || this.height > maxHeight;
  }
}
