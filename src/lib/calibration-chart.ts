import type { CalibrationPoint } from "./calculations";

const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const heading = /^[a-z() .]+$/i;

function splitRow(row: string) {
  const separator = row.includes("\t")
    ? "\t"
    : row.includes(";")
      ? ";"
      : row.includes(",")
        ? ","
        : / +/;
  return row.split(separator).map((cell) =>
    cell
      .trim()
      .replace(/^"([^"]*)"$/, "$1")
      .trim(),
  );
}

export function parseChart(value: string): CalibrationPoint[] {
  const points: CalibrationPoint[] = [];
  let firstRow = true;
  for (const [index, line] of value.split(/\r\n|\n|\r/).entries()) {
    if (!line.trim()) continue;
    // Keep leading and trailing delimiters so a missing value cannot become zero.
    const row = line.replace(/^\uFEFF/, "").replace(/^ +| +$/g, "");
    const columns = splitRow(row);
    const [depth, volume] = columns;
    const header =
      firstRow &&
      columns.length === 2 &&
      heading.test(depth) &&
      heading.test(volume) &&
      /\b(?:mm|millimet(?:er|re)s?)\b/i.test(depth) &&
      /\b(?:l|lit(?:er|re)s?)\b/i.test(volume);
    firstRow = false;
    if (header) continue;

    const mm = Number(depth);
    const liters = Number(volume);
    if (
      columns.length !== 2 ||
      !decimal.test(depth) ||
      !decimal.test(volume) ||
      !Number.isFinite(mm) ||
      !Number.isFinite(liters) ||
      mm < 0 ||
      liters < 0
    ) {
      throw new Error(
        `Row ${index + 1}: enter two non-negative numbers, millimetres and litres.`,
      );
    }
    points.push({ mm, liters });
    if (points.length > 10_000)
      throw new Error("Use a chart with at most 10,000 points.");
  }

  if (points.length < 2) {
    throw new Error(
      "Add at least two calibration points from the certified chart.",
    );
  }

  points.sort((a, b) => a.mm - b.mm);
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const point = points[index];
    if (point.mm <= previous.mm || point.liters <= previous.liters) {
      throw new Error(
        "Each depth and volume must be greater than the previous point.",
      );
    }
  }
  return points;
}
