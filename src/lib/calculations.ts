export type CalibrationPoint = { mm: number; liters: number };
export function calibrate(mm: number, points: CalibrationPoint[]) {
  if (!Number.isFinite(mm) || points.length < 2)
    throw new Error("A valid calibration chart is required.");
  const sorted = [...points].sort((a, b) => a.mm - b.mm);
  for (let i = 0; i < sorted.length; i++) {
    if (
      !Number.isFinite(sorted[i].mm) ||
      !Number.isFinite(sorted[i].liters) ||
      sorted[i].mm < 0 ||
      sorted[i].liters < 0 ||
      (i > 0 &&
        (sorted[i].mm <= sorted[i - 1].mm ||
          sorted[i].liters <= sorted[i - 1].liters))
    )
      throw new Error("Calibration points must increase.");
  }
  if (mm < sorted[0].mm || mm > sorted.at(-1)!.mm)
    throw new Error("Dip is outside the calibrated range.");
  const hi = sorted.findIndex((p) => p.mm >= mm);
  if (sorted[hi].mm === mm) return sorted[hi].liters;
  const a = sorted[hi - 1],
    b = sorted[hi];
  return a.liters + ((mm - a.mm) * (b.liters - a.liters)) / (b.mm - a.mm);
}
export function thermal(
  invoice: number,
  measured: number,
  loading: number,
  arrival: number,
  beta: number,
  price: number,
) {
  if (
    [invoice, measured, loading, arrival, beta, price].some(
      (v) => !Number.isFinite(v),
    ) ||
    invoice <= 0 ||
    measured < 0 ||
    beta < 0 ||
    price <= 0
  )
    throw new Error("Invalid measurement.");
  const allowance = invoice * beta * Math.max(0, loading - arrival);
  const shortage = Math.max(0, invoice - measured - allowance);
  return {
    allowance,
    shortage,
    claim: Math.round(shortage * price * 100) / 100,
  };
}
export function reconcile(
  opening: number,
  delivered: number,
  sold: number,
  closing: number,
  price: number,
  pos: number,
  credit: number,
  cash: number,
) {
  return {
    stockVariance: closing - (opening + delivered - sold),
    expectedCash: sold * price - pos - credit,
    cashVariance: cash - (sold * price - pos - credit),
  };
}
