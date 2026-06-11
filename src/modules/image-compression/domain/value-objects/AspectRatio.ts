export type TargetDimensionsInput = {
  sourceWidth: number;
  sourceHeight: number;
  maxWidth?: number;
  maxHeight?: number;
};

export type TargetDimensions = {
  width: number;
  height: number;
};

export class AspectRatio {
  readonly width: number;
  readonly height: number;

  private constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  static parse(value: string): AspectRatio {
    const match = /^(\d+):(\d+)$/.exec(value.trim());
    if (!match) {
      throw new RangeError('Aspect ratio must be in "W:H" format with positive integers');
    }

    const width = Number.parseInt(match[1], 10);
    const height = Number.parseInt(match[2], 10);

    if (width <= 0 || height <= 0) {
      throw new RangeError("Aspect ratio components must be positive integers");
    }

    return new AspectRatio(width, height);
  }

  static tryParse(value: string): AspectRatio | null {
    try {
      return AspectRatio.parse(value);
    } catch {
      return null;
    }
  }

  calculateTargetDimensions(input: TargetDimensionsInput): TargetDimensions {
    const { sourceWidth, sourceHeight, maxWidth, maxHeight } = input;

    if (maxWidth !== undefined && maxHeight !== undefined) {
      return this.fitWithinBoundingBox(maxWidth, maxHeight);
    }

    if (maxWidth !== undefined) {
      return {
        width: maxWidth,
        height: Math.round((maxWidth * this.height) / this.width),
      };
    }

    if (maxHeight !== undefined) {
      return {
        width: Math.round((maxHeight * this.width) / this.height),
        height: maxHeight,
      };
    }

    return this.largestCropFromSource(sourceWidth, sourceHeight);
  }

  private fitWithinBoundingBox(maxWidth: number, maxHeight: number): TargetDimensions {
    const heightFromMaxWidth = Math.round((maxWidth * this.height) / this.width);

    if (heightFromMaxWidth <= maxHeight) {
      return { width: maxWidth, height: heightFromMaxWidth };
    }

    return {
      width: Math.round((maxHeight * this.width) / this.height),
      height: maxHeight,
    };
  }

  private largestCropFromSource(sourceWidth: number, sourceHeight: number): TargetDimensions {
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = this.width / this.height;

    if (sourceRatio > targetRatio) {
      return {
        width: Math.round((sourceHeight * this.width) / this.height),
        height: sourceHeight,
      };
    }

    return {
      width: sourceWidth,
      height: Math.round((sourceWidth * this.height) / this.width),
    };
  }
}
