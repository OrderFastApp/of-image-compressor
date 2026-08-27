import { VideoCrf } from "@/modules/video-compression/domain/value-objects/VideoCrf";
import { describe, expect, it } from "vitest";

describe("VideoCrf", () => {
  it("crea un CRF válido", () => {
    expect(VideoCrf.create(28).value).toBe(28);
  });

  it("rechaza CRF fuera de rango", () => {
    expect(VideoCrf.tryCreate(-1)).toBeNull();
    expect(VideoCrf.tryCreate(52)).toBeNull();
  });

  it("mapea quality 100 a CRF alto (bajo número) y quality 1 a CRF 51", () => {
    expect(VideoCrf.fromQuality(100).value).toBe(18);
    expect(VideoCrf.fromQuality(1).value).toBe(51);
  });
});
