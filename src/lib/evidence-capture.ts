export type CapturedEvidence = {
  captureId: string;
  blob: Blob;
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  sha256: string;
};
export type StoredEvidence = Omit<CapturedEvidence, "blob"> & { data: string };
export async function storeCapture(
  capture: CapturedEvidence,
): Promise<StoredEvidence> {
  const { blob, ...metadata } = capture;
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read the camera image"));
    reader.readAsDataURL(blob);
  });
  return { ...metadata, data };
}
export function evidenceBlob(evidence: StoredEvidence) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(
    evidence.data,
  );
  if (!match) throw new Error("The saved photo is invalid");
  const bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: "image/jpeg" });
}
