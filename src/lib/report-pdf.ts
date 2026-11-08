import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
export type ReportData = {
  title: string;
  subtitle: string;
  reference: string;
  recordId: string;
  station: string;
  location: string;
  issued: string;
  sample: boolean;
  rows: { label: string; value: string }[];
  total: { label: string; value: string };
  notes: string[];
};
export async function createReport(data: ReportData) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${data.title} - ${data.reference}`);
  doc.setAuthor("PumpShield PK");
  doc.setSubject("Saved station operations record");
  const regular = await doc.embedFont(StandardFonts.Helvetica),
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.16, 0.13, 0.2),
    muted = rgb(0.47, 0.43, 0.52),
    accent = rgb(0.43, 0.31, 0.58),
    line = rgb(0.89, 0.86, 0.92);
  let page!: PDFPage;
  let y = 0;
  const safe = (s: string) => s.normalize("NFKD").replace(/[^\x20-\x7e]/g, "-");
  function text(
    s: string,
    x: number,
    top: number,
    size = 10,
    strong = false,
    color = ink,
  ) {
    page.drawText(safe(s), {
      x,
      y: top,
      size,
      font: strong ? bold : regular,
      color,
    });
  }
  function wrap(s: string, width: number, size = 10) {
    const words = safe(s).split(/\s+/),
      lines: string[] = [];
    let current = "";
    for (const word of words) {
      for (let offset = 0; offset < word.length; ) {
        let chunk = "";
        while (
          offset < word.length &&
          regular.widthOfTextAtSize(chunk + word[offset], size) <= width
        ) {
          chunk += word[offset++];
        }
        const next = current ? current + " " + chunk : chunk;
        if (regular.widthOfTextAtSize(next, size) > width) {
          if (current) lines.push(current);
          current = chunk;
        } else current = next;
        if (offset < word.length) {
          lines.push(current);
          current = "";
        }
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : ["-"];
  }
  function newPage() {
    page = doc.addPage([595.28, 841.89]);
    page.drawRectangle({
      x: 0,
      y: 736,
      width: 595.28,
      height: 106,
      color: ink,
    });
    text("PUMPSHIELD", 42, 795, 18, true, rgb(1, 1, 1));
    text(
      "STATION OPERATIONS / DOCUMENT REGISTER",
      42,
      775,
      7,
      false,
      rgb(0.74, 0.69, 0.8),
    );
    text(data.title, 42, 698, 24, true);
    text(data.subtitle, 42, 675, 9, false, muted);
    y = 640;
    if (data.sample) {
      page.drawRectangle({
        x: 42,
        y: y - 6,
        width: 511,
        height: 24,
        color: rgb(0.95, 0.9, 0.96),
      });
      text(
        "DESIGN LAB / SYNTHETIC DATA - NOT FOR SETTLEMENT",
        54,
        y + 2,
        8,
        true,
        accent,
      );
      y -= 42;
    }
  }
  function ensure(height: number) {
    if (y - height < 95) newPage();
  }
  function row(label: string, value: string) {
    const left = wrap(label, 205, 9),
      right = wrap(value, 265, 10),
      height = Math.max(left.length * 14, right.length * 14) + 10;
    ensure(height);
    left.forEach((s, i) => text(s, 42, y - i * 14, 9, false, muted));
    right.forEach((s, i) => text(s, 277, y - i * 14, 10));
    y -= height;
    page.drawLine({
      start: { x: 42, y: y + 10 },
      end: { x: 553, y: y + 10 },
      thickness: 0.5,
      color: line,
    });
  }
  newPage();
  row("Station", data.station);
  row("Location / OMC", data.location);
  row("Document reference", data.reference);
  row("Recorded time (PKT)", data.issued);
  y -= 8;
  for (const r of data.rows) row(r.label, r.value);
  ensure(130);
  y -= 8;
  page.drawRectangle({
    x: 42,
    y: y - 54,
    width: 511,
    height: 74,
    color: rgb(0.94, 0.91, 0.97),
  });
  text(data.total.label.toUpperCase(), 58, y - 3, 8, true, accent);
  text(data.total.value, 58, y - 39, 25, true, ink);
  y -= 82;
  for (const note of data.notes) {
    const lines = wrap(note, 492, 9);
    ensure(lines.length * 13 + 17);
    lines.forEach((s, i) => text(s, 42, y - i * 13, 9, false, muted));
    y -= lines.length * 13 + 14;
  }
  const qr = await QRCode.toDataURL(
    `PumpShield record | ${data.title} | ${data.recordId}`,
    { width: 100, margin: 1 },
  );
  const image = await doc.embedPng(qr);
  const pages = doc.getPages();
  pages.forEach((p, index) => {
    page = p;
    page.drawLine({
      start: { x: 42, y: 91 },
      end: { x: 553, y: 91 },
      thickness: 0.5,
      color: line,
    });
    text("RECORD ID", 42, 73, 6, true, muted);
    text(data.recordId, 42, 60, 7);
    text(`Page ${index + 1} / ${pages.length}`, 42, 43, 7, false, muted);
    text(
      "Generated from saved records. Not a tax invoice.",
      230,
      43,
      7,
      false,
      muted,
    );
    p.drawImage(image, { x: 503, y: 30, width: 49, height: 49 });
  });
  return doc.save();
}
