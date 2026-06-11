import { describe, expect, test } from "bun:test";
import { AspectRatio } from "@/modules/image-compression/domain/value-objects/AspectRatio";

describe("AspectRatio", () => {
  describe("parse", () => {
    test("parses valid ratios", () => {
      const ratio169 = AspectRatio.parse("16:9");
      expect(ratio169.width).toBe(16);
      expect(ratio169.height).toBe(9);

      const ratio11 = AspectRatio.parse("1:1");
      expect(ratio11.width).toBe(1);
      expect(ratio11.height).toBe(1);
    });

    test("rejects invalid formats", () => {
      expect(() => AspectRatio.parse("16")).toThrow();
      expect(() => AspectRatio.parse("16:0")).toThrow();
      expect(() => AspectRatio.parse("0:9")).toThrow();
      expect(() => AspectRatio.parse("abc:9")).toThrow();
    });
  });

  describe("tryParse", () => {
    test("returns null for invalid input", () => {
      expect(AspectRatio.tryParse("invalid")).toBeNull();
      expect(AspectRatio.tryParse("16:9")).not.toBeNull();
    });
  });

  describe("calculateTargetDimensions", () => {
    test("crops widest source by height for 16:9", () => {
      const ratio = AspectRatio.parse("16:9");
      const result = ratio.calculateTargetDimensions({
        sourceWidth: 4000,
        sourceHeight: 2000,
      });

      expect(result.width).toBe(3556);
      expect(result.height).toBe(2000);
    });

    test("crops tallest source by width for 16:9", () => {
      const ratio = AspectRatio.parse("16:9");
      const result = ratio.calculateTargetDimensions({
        sourceWidth: 4000,
        sourceHeight: 3000,
      });

      expect(result.width).toBe(4000);
      expect(result.height).toBe(2250);
    });

    test("calculates dimensions from maxWidth only", () => {
      const ratio = AspectRatio.parse("16:9");
      const result = ratio.calculateTargetDimensions({
        sourceWidth: 4000,
        sourceHeight: 3000,
        maxWidth: 800,
      });

      expect(result.width).toBe(800);
      expect(result.height).toBe(450);
    });

    test("calculates dimensions from maxHeight only", () => {
      const ratio = AspectRatio.parse("16:9");
      const result = ratio.calculateTargetDimensions({
        sourceWidth: 4000,
        sourceHeight: 3000,
        maxHeight: 450,
      });

      expect(result.width).toBe(800);
      expect(result.height).toBe(450);
    });

    test("fits within bounding box when both max dimensions are provided", () => {
      const ratio = AspectRatio.parse("1:1");
      const result = ratio.calculateTargetDimensions({
        sourceWidth: 4000,
        sourceHeight: 3000,
        maxWidth: 400,
        maxHeight: 600,
      });

      expect(result.width).toBe(400);
      expect(result.height).toBe(400);
    });

    test("fits 16:9 within bounding box constrained by height", () => {
      const ratio = AspectRatio.parse("16:9");
      const result = ratio.calculateTargetDimensions({
        sourceWidth: 4000,
        sourceHeight: 3000,
        maxWidth: 800,
        maxHeight: 400,
      });

      expect(result.width).toBe(711);
      expect(result.height).toBe(400);
    });
  });
});
