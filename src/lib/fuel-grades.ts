/** Canonical stored product codes. Prices and coefficients are station-entered. */
export const FUEL_GRADES = ["MS", "HSD", "HOBC"] as const;
export type FuelGrade = (typeof FUEL_GRADES)[number];

const names: Record<FuelGrade, string> = {
  MS: "Petrol",
  HSD: "Diesel",
  HOBC: "High Octane",
};

export function isFuelGrade(value: unknown): value is FuelGrade {
  return (
    typeof value === "string" &&
    (FUEL_GRADES as readonly string[]).includes(value)
  );
}

export function fuelGradeName(value: unknown): string {
  return isFuelGrade(value) ? names[value] : "Unknown fuel grade";
}

export function fuelGradeLabel(value: unknown): string {
  return isFuelGrade(value)
    ? `${names[value]} · ${value}`
    : "Unknown fuel grade";
}

export const FUEL_GRADE_OPTIONS = Object.freeze(
  FUEL_GRADES.map((value) =>
    Object.freeze({ value, label: fuelGradeLabel(value) }),
  ),
);

/** Presentation filtering only. Current authorization/grade checks remain SQL-owned. */
export function nozzlesForFuelGrade<Nozzle extends { tank_id: string }>(
  nozzles: readonly Nozzle[],
  tanks: readonly { id: string; grade: unknown }[],
  grade: unknown,
): Nozzle[] {
  if (!isFuelGrade(grade)) return [];
  const tankIds = new Set(
    tanks.filter((tank) => tank.grade === grade).map((tank) => tank.id),
  );
  return nozzles.filter((nozzle) => tankIds.has(nozzle.tank_id));
}
