import { parseChart } from "./calibration-chart";

export const CALIBRATION_CHART_FILE_BYTES = 4 * 1024 * 1024;
export const CALIBRATION_CHART_TEXT_BYTES = 100_000;
export const CALIBRATION_CHART_TEXT_ACCEPT =
  ".csv,text/csv,.tsv,text/tab-separated-values,.txt,text/plain";
export const CALIBRATION_CHART_ACCEPT = `.pdf,application/pdf,.jpg,.jpeg,image/jpeg,.png,image/png,${CALIBRATION_CHART_TEXT_ACCEPT}`;

const signatures: Record<string, { contentType: string; prefix: number[] }> = {
  pdf: { contentType: "application/pdf", prefix: [37, 80, 68, 70, 45] },
  jpg: { contentType: "image/jpeg", prefix: [255, 216, 255] },
  jpeg: { contentType: "image/jpeg", prefix: [255, 216, 255] },
  png: { contentType: "image/png", prefix: [137, 80, 78, 71, 13, 10, 26, 10] },
};

const textTypes = new Map([
  ["csv", "text/csv"],
  ["tsv", "text/tab-separated-values"],
  ["txt", "text/plain"],
]);

export async function readCalibrationChartFile(file: File): Promise<{
  contentType: string;
  chartText?: string;
}> {
  if (file.size === 0)
    throw new Error("Choose a chart file that contains data.");
  if (file.size > CALIBRATION_CHART_FILE_BYTES) {
    throw new Error("Choose a chart file that is 4 MB or smaller.");
  }

  const extension = /\.([a-z]+)$/i.exec(file.name)?.[1]?.toLowerCase() ?? "";
  const textType = textTypes.get(extension);
  if (textType) {
    if (file.size > CALIBRATION_CHART_TEXT_BYTES) {
      throw new Error("Use a CSV, TSV or TXT chart that is 100 KB or smaller.");
    }
    let text: string;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const encoding =
        bytes[0] === 255 && bytes[1] === 254
          ? "utf-16le"
          : bytes[0] === 254 && bytes[1] === 255
            ? "utf-16be"
            : "utf-8";
      text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    } catch {
      throw new Error("Save the chart as a UTF-8 CSV, TSV or TXT file.");
    }
    parseChart(text);
    return { contentType: textType, chartText: text };
  }

  const signature = Object.hasOwn(signatures, extension)
    ? signatures[extension]
    : undefined;
  if (!signature)
    throw new Error("Choose a PDF, CSV, TSV, TXT, JPG or PNG chart.");
  const header = new Uint8Array(
    await file.slice(0, signature.prefix.length).arrayBuffer(),
  );
  // Browsers can report an empty or generic MIME type. Check the file bytes.
  if (!signature.prefix.every((byte, index) => header[index] === byte)) {
    throw new Error(
      "The file does not match its extension. Choose the original chart.",
    );
  }
  return { contentType: signature.contentType };
}
