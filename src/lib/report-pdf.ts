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
  generatedAt?: string;
  sample: boolean;
  rows: { label: string; value: string }[];
  total: { label: string; value: string };
  notes: string[];
};

export async function createReport(data: ReportData) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.125, 0.153, 0.141);
  const muted = rgb(0.345, 0.392, 0.373);
  const accent = rgb(0.09, 0.298, 0.271);
  const line = rgb(0.79, 0.82, 0.8);
  const surface = rgb(0.914, 0.929, 0.906);
  const warning = rgb(0.502, 0.325, 0.043);
  const characterCache = new Map<string, string>();
  const punctuation: Record<string, string> = {
    "→": " -> ",
    "←": " <- ",
    "↔": " <-> ",
    "−": "-",
    "‑": "-",
  };
  let unicodeFallback = false;

  // Standard PDF fonts cover WinAnsi, not shaped scripts. Never silently erase
  // names: preserve unsupported code points visibly and disclose the limitation.
  function printable(value: string) {
    return Array.from(value.normalize("NFC"), (character) => {
      if (/\s/u.test(character)) return " ";
      if (punctuation[character]) return punctuation[character];
      const cached = characterCache.get(character);
      if (cached !== undefined) return cached;
      let encoded = character;
      try {
        regular.encodeText(character);
      } catch {
        unicodeFallback = true;
        encoded = `[U+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}]`;
      }
      characterCache.set(character, encoded);
      return encoded;
    }).join("");
  }
  // Establish whether the disclosure is needed before creating any pages.
  [
    data.title,
    data.subtitle,
    data.reference,
    data.recordId,
    data.station,
    data.location,
    data.issued,
    data.total.label,
    data.total.value,
    ...data.rows.flatMap((row) => [row.label, row.value]),
    ...data.notes,
  ].forEach(printable);
  doc.setTitle(`${data.title} - ${data.reference}`);
  doc.setAuthor("PumpShield");
  doc.setSubject(
    unicodeFallback
      ? "Saved station record. Unsupported script characters are shown as Unicode code points."
      : "Saved station operations record",
  );
  doc.setKeywords([
    "PumpShield",
    "operational record",
    ...(unicodeFallback ? ["Unicode fallback"] : []),
  ]);

  const generated = new Date(data.generatedAt || Date.now());
  if (!Number.isFinite(generated.getTime()))
    throw new Error("Invalid report generation time");
  const generatedLabel = new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(generated);
  let page!: PDFPage;
  let y = 0;
  const bottom = 104;
  function text(
    value: string,
    x: number,
    top: number,
    size = 10,
    strong = false,
    color = ink,
  ) {
    page.drawText(printable(value), {
      x,
      y: top,
      size,
      font: strong ? bold : regular,
      color,
    });
  }
  function wrap(value: string, width: number, size = 10, strong = false) {
    const font = strong ? bold : regular;
    const words = printable(value).split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      for (let offset = 0; offset < word.length; ) {
        let chunk = "";
        while (
          offset < word.length &&
          font.widthOfTextAtSize(chunk + word[offset], size) <= width
        )
          chunk += word[offset++];
        const next = current ? `${current} ${chunk}` : chunk;
        if (font.widthOfTextAtSize(next, size) > width) {
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
    return lines.length ? lines : ["—"];
  }
  function newPage() {
    page = doc.addPage([595.28, 841.89]);
    text("PumpShield", 42, 796, 17, true, accent);
    text("STATION RECORD", 451, 799, 8, true, muted);
    page.drawLine({
      start: { x: 42, y: 780 },
      end: { x: 553, y: 780 },
      thickness: 1,
      color: accent,
    });
    const titleLines = wrap(data.title, 511, 23, true);
    titleLines.forEach((value, index) =>
      text(value, 42, 749 - index * 28, 23, true),
    );
    y = 719 - (titleLines.length - 1) * 28;
    if (data.sample) {
      page.drawRectangle({
        x: 42,
        y: y - 8,
        width: 511,
        height: 25,
        color: rgb(1, 0.953, 0.839),
      });
      text(
        "DESIGN LAB / SYNTHETIC DATA — NOT FOR SETTLEMENT",
        52,
        y + 1,
        8,
        true,
        warning,
      );
      y -= 40;
    }
    if (unicodeFallback) {
      const notice = wrap(
        "Script display limitation: unsupported characters are shown as [U+code] values. Refer to the source record for original text.",
        511,
        8,
      );
      notice.forEach((value, index) =>
        text(value, 42, y - index * 11, 8, false, warning),
      );
      y -= notice.length * 11 + 18;
    }
  }
  function ensure(height: number) {
    if (y - height < bottom) newPage();
  }
  function row(label: string, value: string) {
    const left = wrap(label, 170, 9);
    const right = wrap(value, 313, 10);
    const length = Math.max(left.length, right.length);
    let offset = 0;
    while (offset < length) {
      ensure(27);
      const available = Math.max(1, Math.floor((y - bottom - 8) / 14));
      const count = Math.min(length - offset, available);
      for (let i = 0; i < count; i++) {
        if (left[offset + i])
          text(left[offset + i], 42, y - i * 14, 9, false, muted);
        else if (offset > 0 && i === 0)
          text("Continued", 42, y, 8, false, muted);
        if (right[offset + i]) text(right[offset + i], 240, y - i * 14, 10);
      }
      y -= count * 14 + 8;
      page.drawLine({
        start: { x: 42, y: y + 6 },
        end: { x: 553, y: y + 6 },
        thickness: 0.4,
        color: line,
      });
      offset += count;
      if (offset < length) newPage();
    }
  }
  newPage();
  row("Station", data.station);
  row("Location / OMC", data.location);
  row("Document reference", data.reference);
  row("Source record time (PKT)", data.issued);
  y -= 8;
  for (const entry of data.rows) row(entry.label, entry.value);
  const totalLabel = wrap(data.total.label.toUpperCase(), 479, 8, true);
  const totalValue = wrap(data.total.value, 479, 25, true);
  const totalHeight = 34 + totalLabel.length * 12 + totalValue.length * 30;
  ensure(totalHeight + 18);
  page.drawRectangle({
    x: 42,
    y: y - totalHeight + 16,
    width: 511,
    height: totalHeight,
    color: surface,
  });
  totalLabel.forEach((value, index) =>
    text(value, 58, y - index * 12, 8, true, accent),
  );
  totalValue.forEach((value, index) =>
    text(value, 58, y - totalLabel.length * 12 - 23 - index * 30, 25, true),
  );
  y -= totalHeight + 16;
  for (const note of data.notes) {
    for (const value of wrap(note, 511, 9)) {
      ensure(15);
      text(value, 42, y, 9, false, muted);
      y -= 13;
    }
    y -= 12;
  }

  const qr = await QRCode.toDataURL(
    `PumpShield record | ${data.title} | ${data.recordId}`,
    { width: 100, margin: 2 },
  );
  const image = await doc.embedPng(qr);
  const pages = doc.getPages();
  pages.forEach((current, index) => {
    page = current;
    page.drawLine({
      start: { x: 42, y: 87 },
      end: { x: 553, y: 87 },
      thickness: 0.5,
      color: line,
    });
    text(`Record ${data.recordId}`, 42, 72, 7, false, muted);
    text(`Generated ${generatedLabel} PKT`, 42, 57, 7, false, muted);
    text(
      `Page ${index + 1} / ${pages.length} · Saved operational record. Not a tax invoice.`,
      42,
      42,
      7,
      false,
      muted,
    );
    current.drawImage(image, { x: 505, y: 31, width: 48, height: 48 });
  });
  return doc.save();
}
