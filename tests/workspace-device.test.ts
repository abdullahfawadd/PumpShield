import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FieldContext, FieldDraft } from "../src/lib/offline-types";
import {
  createVault,
  forgetVault,
  prepareWorkspaceDevice,
  readWorkspaceDrafts,
  resetWorkspaceLease,
  resumeWorkspaceDevice,
  vaultMeta,
  writeWorkspaceDraft,
} from "../src/lib/offline-vault";

function context(user_id = "owner", station = "station-a"): FieldContext {
  const now = Date.now();
  return {
    user_id,
    workspace_id: "workspace",
    person: user_id,
    station: { id: station, name: station },
    prepared_at: new Date(now).toISOString(),
    expires_at: new Date(now + 86_400_000).toISOString(),
    shift: null,
    nozzles: [],
    tanks: [],
    deliveries: [],
  };
}

function draft(saved: FieldContext, time = 0): FieldDraft {
  return {
    id: `draft-${time}`,
    user_id: saved.user_id,
    workspace_id: saved.workspace_id,
    station_id: saved.station.id,
    shift_id: null,
    kind: "submit_delivery",
    captured_at: new Date(time).toISOString(),
    title: "Arrival audit",
    payload: { arrival_temp: 23.6 },
    evidence: {},
    state: "pending",
  };
}

describe("automatic workspace device storage", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    vi.stubGlobal("IDBKeyRange", IDBKeyRange);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("restores only the authorised actor and never rebinds drafts to a new actor", async () => {
    const owner = context();
    const saved = draft(owner);
    const ownerDevice = await prepareWorkspaceDevice(owner);
    await writeWorkspaceDraft(ownerDevice, saved);
    await resetWorkspaceLease();
    expect(await resumeWorkspaceDevice()).toBeNull();

    const munshi = await prepareWorkspaceDevice(context("munshi"));
    expect((await resumeWorkspaceDevice())?.device.user_id).toBe("munshi");
    expect(await readWorkspaceDrafts(munshi)).toEqual([]);

    const ownerAgain = await prepareWorkspaceDevice(owner);
    expect(await readWorkspaceDrafts(ownerAgain)).toEqual([saved]);
  });

  it("keeps the encryption key stable when two tabs prepare concurrently", async () => {
    const first = context();
    const second = context("owner", "station-b");
    const [a, b] = await Promise.all([
      prepareWorkspaceDevice(first),
      prepareWorkspaceDevice(second),
    ]);
    const early = draft(first, 12);
    const late = draft(second, 42);
    await writeWorkspaceDraft(b, late);
    await writeWorkspaceDraft(a, early);
    expect(await readWorkspaceDrafts(a)).toEqual([early, late]);
    expect((await resumeWorkspaceDevice("station-a"))?.context.station.id).toBe(
      "station-a",
    );
  });

  it("expires offline restoration and retains unposted records for the next verified session", async () => {
    const savedContext = context();
    const saved = draft(savedContext);
    await writeWorkspaceDraft(
      await prepareWorkspaceDevice(savedContext),
      saved,
    );
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse(savedContext.expires_at) + 1,
    );
    expect(await resumeWorkspaceDevice()).toBeNull();
    await expect(prepareWorkspaceDevice(savedContext)).rejects.toThrow(
      "expired",
    );
    expect(
      await readWorkspaceDrafts(await prepareWorkspaceDevice(context())),
    ).toEqual([saved]);
  });

  it("keeps old encrypted workspace data independent from automatic drafts", async () => {
    const saved = context();
    await createVault(
      "example trusted device password",
      saved.user_id,
      saved.workspace_id,
      saved,
    );
    const automatic = await prepareWorkspaceDevice(saved);
    const queued = draft(saved);
    await writeWorkspaceDraft(automatic, queued);
    expect(await vaultMeta()).toMatchObject({ user_id: saved.user_id });
    await forgetVault();
    expect(await vaultMeta()).toBeUndefined();
    expect(await readWorkspaceDrafts(automatic)).toEqual([queued]);
    expect((await resumeWorkspaceDevice())?.context).toMatchObject(saved);
  });

  it("restores a context issued by a server clock three minutes ahead", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const remote = context();
    remote.prepared_at = new Date(now + 180_000).toISOString();
    remote.expires_at = new Date(now + 180_000 + 86_400_000).toISOString();
    await prepareWorkspaceDevice(remote);
    const restored = await resumeWorkspaceDevice();
    expect(restored?.context.device_clock_offset_ms).toBe(180_000);
    expect(Date.parse(restored?.context.expires_at || "") - now).toBe(86_400_000);
  });
});
