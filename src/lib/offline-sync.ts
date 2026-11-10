import { browserDb } from "./supabase/client";
import { field } from "./field-api";
import { evidenceBlob } from "./evidence-capture";
import type { StoredEvidence } from "./evidence-capture";
import type { FieldDraft } from "./offline-types";
export async function uploadOfflineEvidence(
  draft: FieldDraft,
  evidence: StoredEvidence,
  signal?: AbortSignal,
) {
  const db = browserDb();
  const path = `${draft.workspace_id}/${draft.user_id}/${evidence.captureId}.jpg`;
  if (signal?.aborted) throw new DOMException("Sync stopped", "AbortError");
  const blob = evidenceBlob(evidence);
  if (blob.size > 5 * 1024 * 1024)
    throw new Error(
      "A saved photo exceeds the upload limit. Keep this draft for owner review.",
    );
  const { error } = await db.storage
    .from("evidence")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (
    error &&
    error.message !== "The resource already exists" &&
    String(error.statusCode) !== "409"
  )
    throw error;
  if (signal?.aborted) throw new DOMException("Sync stopped", "AbortError");
  const result = await field<{ id: string }>(
    "offline_evidence",
    {
      station_id: draft.station_id,
      path,
      capture_id: evidence.captureId,
      captured_at: evidence.capturedAt,
      latitude: evidence.latitude,
      longitude: evidence.longitude,
      accuracy: evidence.accuracy,
      sha256: evidence.sha256,
    },
    signal,
  );
  signal?.throwIfAborted();
  return result.id;
}
function replaceReferences(value: unknown, ids: Map<string, string>): unknown {
  if (typeof value === "string") return ids.get(value) || value;
  if (Array.isArray(value)) return value.map((v) => replaceReferences(v, ids));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, replaceReferences(v, ids)]),
    );
  return value;
}
export async function postOfflineDraft(
  draft: FieldDraft,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const ids = new Map<string, string>();
  for (const evidence of Object.values(draft.evidence))
    ids.set(
      `local:${evidence.captureId}`,
      await uploadOfflineEvidence(draft, evidence, signal),
    );
  signal?.throwIfAborted();
  const result = await field<{ id: string; replayed?: boolean }>(
    "sync",
    {
      station_id: draft.station_id,
      user_id: draft.user_id,
      workspace_id: draft.workspace_id,
      request_id: draft.id,
      kind: draft.kind,
      shift_id: draft.shift_id,
      captured_at: draft.captured_at,
      payload: replaceReferences(draft.payload, ids),
    },
    signal,
  );
  signal?.throwIfAborted();
  return result;
}
