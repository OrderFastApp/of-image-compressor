const MIN_CRF = 0;
const MAX_CRF = 51;
const MIN_QUALITY = 1;
const MAX_QUALITY = 100;
const HIGH_QUALITY_CRF = 18;

/**
 * Constant Rate Factor for ffmpeg (lower = higher quality).
 */
export class VideoCrf {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): VideoCrf {
    if (!Number.isInteger(value) || value < MIN_CRF || value > MAX_CRF) {
      throw new RangeError(`CRF must be an integer between ${MIN_CRF} and ${MAX_CRF}`);
    }
    return new VideoCrf(value);
  }

  static tryCreate(value: number): VideoCrf | null {
    try {
      return VideoCrf.create(value);
    } catch {
      return null;
    }
  }

  /**
   * Maps UX quality 1–100 to CRF (100 → ~18, 1 → 51).
   */
  static fromQuality(quality: number): VideoCrf {
    if (!Number.isInteger(quality) || quality < MIN_QUALITY || quality > MAX_QUALITY) {
      throw new RangeError(`Quality must be an integer between ${MIN_QUALITY} and ${MAX_QUALITY}`);
    }
    const crf = Math.round(
      HIGH_QUALITY_CRF +
        ((MAX_QUALITY - quality) / (MAX_QUALITY - MIN_QUALITY)) * (MAX_CRF - HIGH_QUALITY_CRF),
    );
    return VideoCrf.create(crf);
  }

  static tryFromQuality(quality: number): VideoCrf | null {
    try {
      return VideoCrf.fromQuality(quality);
    } catch {
      return null;
    }
  }
}
