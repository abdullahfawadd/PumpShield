import { expect, it } from "vitest";
import {
  FUEL_GRADES,
  fuelGradeLabel,
  nozzlesForFuelGrade,
} from "../src/lib/fuel-grades";
it("keeps three distinct grades and never calls an unknown grade Diesel", () => {
  expect(FUEL_GRADES).toEqual(["MS", "HSD", "HOBC"]);
  expect(fuelGradeLabel("HOBC")).toContain("High Octane");
  expect(fuelGradeLabel("unknown")).toBe("Unknown fuel grade");
  const nozzles = [{ tank_id: "p" }, { tank_id: "d" }, { tank_id: "h" }];
  expect(
    nozzlesForFuelGrade(
      nozzles,
      [
        { id: "p", grade: "MS" },
        { id: "d", grade: "HSD" },
        { id: "h", grade: "HOBC" },
      ],
      "HOBC",
    ),
  ).toEqual([{ tank_id: "h" }]);
  expect(nozzlesForFuelGrade(nozzles, [], "HOBC")).toEqual([]);
});
