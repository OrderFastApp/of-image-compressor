export class Duration {
  readonly seconds: number;

  constructor(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new RangeError("Duration must be a non-negative number");
    }
    this.seconds = seconds;
  }

  exceeds(maxSeconds: number): boolean {
    return this.seconds > maxSeconds;
  }
}
