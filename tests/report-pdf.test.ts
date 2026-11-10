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
  generatedAt: "2026-11-09T08:00:00.000Z",
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
  it("preserves supported accented names and discloses unsupported scripts", async () => {
    const supported = await PDFDocument.load(
      await createReport({
        ...base,
        station: "Café Petroleum",
        rows: [{ label: "Temperature", value: "32°C" }],
      }),
    );
    expect(supported.getSubject()).toBe("Saved station operations record");
    const unsupported = await PDFDocument.load(
      await createReport({ ...base, station: "پٹرول" }),
    );
    expect(unsupported.getSubject()).toContain("Unicode code points");
    expect(unsupported.getKeywords()).toContain("Unicode fallback");
  });
  it("paginates a single long note without overflowing a page", async () => {
    const pdf = await PDFDocument.load(
      await createReport({
        ...base,
        notes: ["Recorded provenance and operational limitation. ".repeat(500)],
      }),
    );
    expect(pdf.getPageCount()).toBeGreaterThan(2);
  });
});
