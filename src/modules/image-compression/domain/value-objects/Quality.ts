const MIN_QUALITY = 1;
const MAX_QUALITY = 100;

export class Quality {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): Quality {
    if (!Number.isInteger(value) || value < MIN_QUALITY || value > MAX_QUALITY) {
      throw new RangeError(`Quality must be an integer between ${MIN_QUALITY} and ${MAX_QUALITY}`);
    }
    return new Quality(value);
  }

  static tryCreate(value: number): Quality | null {
    try {
      return Quality.create(value);
    } catch {
      return null;
    }
  }
}
