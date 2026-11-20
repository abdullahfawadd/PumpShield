import { describe, expect, it } from "vitest";
import { stationTimeInput, stationTimeInstant } from "../src/lib/utils";

describe("station wall time", () => {
  it("uses PKT and preserves the instant across a date boundary", () => {
    const value = stationTimeInput("2026-11-20T21:40:00.000Z");
    expect(value).toBe("2026-11-21T02:40");
    expect(stationTimeInstant(value)).toBe("2026-11-20T21:40:00.000Z");
  });

  it("rejects an invalid date and an empty input", () => {
    expect(() => stationTimeInstant("2026-02-30T12:15")).toThrow("PKT");
    expect(() => stationTimeInstant("")).toThrow("PKT");
  });
});
