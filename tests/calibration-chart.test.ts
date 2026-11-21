import { describe, expect, it } from "vitest";
import { parseChart } from "../src/lib/calibration-chart";
import {
  CALIBRATION_CHART_FILE_BYTES,
  CALIBRATION_CHART_TEXT_BYTES,
  readCalibrationChartFile,
} from "../src/lib/calibration-chart-file";

describe("calibration chart rows", () => {
  it("reads quoted headers and decimals, and preserves zero", () => {
    expect(
      parseChart(
        '\uFEFF"Depth (mm)","Volume (litres)"\r\n"0","0"\r\n50,950.25',
      ),
    ).toEqual([
      { mm: 0, liters: 0 },
      { mm: 50, liters: 950.25 },
    ]);
  });

  it("keeps the original sorting behavior and checks for repeated depth or volume", () => {
    expect(parseChart("50;950\n0;0")).toEqual([
      { mm: 0, liters: 0 },
      { mm: 50, liters: 950 },
    ]);
    expect(() => parseChart("10,0\n10,950")).toThrow(/each depth and volume/i);
    expect(() => parseChart("0,950\n50,950")).toThrow(/each depth and volume/i);
  });

  it.each([
    ",0\n50,950",
    "0\t\n50\t950",
    "0,0,5\n50,950",
    "0,0\n50,NaN",
    "0,0\n50,-950",
    "mm,gallons\n0,0\n50,950",
  ])("rejects invalid rows before calculating stock: %j", (rows) => {
    expect(() => parseChart(rows)).toThrow(/two non-negative numbers/i);
  });
});

describe("calibration file selection", () => {
  it("accepts a PDF or scan as an attachment without inferring numbers", async () => {
    await expect(
      readCalibrationChartFile(new File(["%PDF-1.7\n"], "Certified.PDF")),
    ).resolves.toEqual({ contentType: "application/pdf" });
    await expect(
      readCalibrationChartFile(
        new File([new Uint8Array([255, 216, 255])], "scan.jpg"),
      ),
    ).resolves.toEqual({ contentType: "image/jpeg" });
  });

  it("imports through extension and content when Files supplies a generic type", async () => {
    const csv = "mm,litres\n0,0\n50,950";
    await expect(
      readCalibrationChartFile(
        new File([csv], "Tank.csv", { type: "application/octet-stream" }),
      ),
    ).resolves.toEqual({ contentType: "text/csv", chartText: csv });
    const tsv = "mm\tlitres\n0\t0\n50\t950";
    const utf16le = Uint8Array.from([
      255,
      254,
      ...Array.from(tsv).flatMap((char) => [char.charCodeAt(0), 0]),
    ]);
    await expect(
      readCalibrationChartFile(new File([utf16le], "Tank.tsv")),
    ).resolves.toEqual({
      contentType: "text/tab-separated-values",
      chartText: tsv,
    });
  });

  it("rejects mislabeled or executable content and files larger than the selected format allows", async () => {
    await expect(
      readCalibrationChartFile(
        new File(["<html>"], "renamed.pdf", { type: "application/pdf" }),
      ),
    ).rejects.toThrow(/does not match/i);
    await expect(
      readCalibrationChartFile(new File(["%PDF-1.7\n"], "chart.pdf.exe")),
    ).rejects.toThrow(/choose a pdf/i);
    await expect(
      readCalibrationChartFile(
        new File(
          [new Uint8Array(CALIBRATION_CHART_FILE_BYTES + 1)],
          "large.pdf",
        ),
      ),
    ).rejects.toThrow(/4 MB/i);
    await expect(
      readCalibrationChartFile(
        new File(
          [new Uint8Array(CALIBRATION_CHART_TEXT_BYTES + 1)],
          "large.csv",
        ),
      ),
    ).rejects.toThrow(/100 KB/i);
  });
});
