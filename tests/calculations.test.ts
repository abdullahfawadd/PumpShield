import { describe, it, expect } from "vitest";
import { calibrate, thermal, reconcile } from "../src/lib/calculations";
describe("certified calibration", () => {
  const points = [
    { mm: 0, liters: 0 },
    { mm: 100, liters: 500 },
    { mm: 200, liters: 1400 },
  ];
  it("uses exact points and piecewise interpolation", () => {
    expect(calibrate(100, points)).toBe(500);
    expect(calibrate(150, points)).toBe(950);
    expect(calibrate(0, points)).toBe(0);
  });
  it("rejects extrapolation and non-monotonic charts", () => {
    expect(() => calibrate(201, points)).toThrow();
    expect(() => calibrate(-1, points)).toThrow();
    expect(() =>
      calibrate(2, [
        { mm: 0, liters: 20 },
        { mm: 3, liters: 10 },
      ]),
    ).toThrow();
    expect(() => calibrate(NaN, points)).toThrow();
  });
});
describe("thermal allowance", () => {
  it("separates measured shortage from contraction without premature rounding", () => {
    const r = thermal(40000, 39640, 38, 32, 0.00115, 379.25);
    expect(r.allowance).toBeCloseTo(276);
    expect(r.shortage).toBeCloseTo(84);
    expect(r.claim).toBe(31857);
  });
  it("never produces a negative claim or contraction from warming", () => {
    expect(thermal(40000, 40100, 32, 38, 0.00115, 379.25).claim).toBe(0);
    expect(thermal(40000, 39900, 32, 38, 0.00115, 379.25).allowance).toBe(0);
  });
  it("rejects invalid numerical inputs", () => {
    expect(() => thermal(0, 10, 30, 20, 0.001, 300)).toThrow();
    expect(() => thermal(40000, NaN, 30, 20, 0.001, 300)).toThrow();
  });
});
describe("shift reconciliation", () => {
  it("accounts for delivered stock and avoids counting credit as cash", () => {
    expect(
      reconcile(20000, 10000, 14500, 15435, 395.82, 1180000, 385000, 4174390),
    ).toEqual({ stockVariance: -65, expectedCash: 4174390, cashVariance: 0 });
  });
});
