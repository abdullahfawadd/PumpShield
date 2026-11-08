import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createReport, type ReportData } from "../src/lib/report-pdf";
const base: ReportData = {
  title: "Account statement",
  subtitle: "Station record",
  reference: "SAMPLE-100",
  recordId: "00000000-0000-4000-8000-000000000001",
  station: "Design Lab station",
  location: "Karachi / Sample OMC",
  issued: "8 Nov 2026",
  sample: true,
  rows: [],
  total: { label: "Current outstanding balance", value: "PKR 480,000" },
  notes: ["Synthetic account data. Not for settlement."],
};
describe("operational PDF layout", () => {
  it("generates a single-page receipt", async () => {
    const pdf = await PDFDocument.load(
      await createReport({
        ...base,
        rows: [{ label: "Vehicle", value: "SAMPLE-KHI-9921" }],
      }),
    );
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toContain("SAMPLE-100");
  });
  it("paginates long ledgers and handles long identifiers without throwing", async () => {
    const pdf = await PDFDocument.load(
      await createReport({
        ...base,
        rows: Array.from({ length: 80 }, (_, i) => ({
          label: `Transaction ${i}`,
          value: "SAMPLE-" + "0123456789".repeat(15),
        })),
      }),
    );
    expect(pdf.getPageCount()).toBeGreaterThan(3);
    for (const page of pdf.getPages())
      expect(page.getHeight()).toBeCloseTo(841.89);
  });
});
