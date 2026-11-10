import { afterEach, describe, expect, it, vi } from "vitest";
import type { FieldDraft } from "../src/lib/offline-types";
const mocks = vi.hoisted(() => ({ field: vi.fn(), upload: vi.fn() }));
vi.mock("../src/lib/field-api", () => ({ field: mocks.field }));
vi.mock("../src/lib/supabase/client", () => ({
  browserDb: () => ({ storage: { from: () => ({ upload: mocks.upload }) } }),
}));
import { postOfflineDraft } from "../src/lib/offline-sync";

const draft: FieldDraft = {
  id: "request-one",
  user_id: "actor",
  workspace_id: "workspace",
  station_id: "station",
  shift_id: "original-shift",
  kind: "parchi",
  captured_at: "2026-11-09T06:00:00Z",
  title: "Synthetic draft",
  payload: { liters: 1 },
  evidence: {},
  state: "pending",
};
afterEach(() => vi.resetAllMocks());

describe("offline replay cancellation", () => {
  it("does not begin a post after the terminal is locked", async () => {
    const c = new AbortController();
    c.abort();
    await expect(postOfflineDraft(draft, c.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(mocks.field).not.toHaveBeenCalled();
  });

  it("discards a late transport success after lock and keeps replay identity stable", async () => {
    const c = new AbortController();
    let complete!: (value: unknown) => void;
    mocks.field.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const pending = postOfflineDraft(draft, c.signal);
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    c.abort();
    complete({ id: "saved-on-server" }); // server may already have committed an in-flight request
    await rejected;
    expect(mocks.field.mock.calls[0][1]).toMatchObject({
      request_id: draft.id,
      shift_id: draft.shift_id,
    });
    mocks.field.mockResolvedValueOnce({
      id: "saved-on-server",
      replayed: true,
    });
    await expect(
      postOfflineDraft(draft, new AbortController().signal),
    ).resolves.toEqual({ id: "saved-on-server", replayed: true });
    expect(mocks.field.mock.calls[1][1]).toMatchObject({
      request_id: draft.id,
      shift_id: draft.shift_id,
    });
    expect(draft.state).toBe("pending");
  });
});
