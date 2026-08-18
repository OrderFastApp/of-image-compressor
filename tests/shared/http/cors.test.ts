import { parseCorsOrigins } from "@/shared/http/cors";
import { describe, expect, it } from "vitest";

describe("parseCorsOrigins", () => {
  it("accepts wildcard", () => {
    expect(parseCorsOrigins("*")).toBe("*");
    expect(parseCorsOrigins(" * ")).toBe("*");
  });

  it("parses a comma-separated origin list", () => {
    expect(parseCorsOrigins("http://localhost:5173, https://app.orderfast.com")).toEqual([
      "http://localhost:5173",
      "https://app.orderfast.com",
    ]);
  });
});
