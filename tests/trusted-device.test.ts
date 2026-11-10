import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  createVault,
  rememberVaultSession,
  resumeVaultSession,
  forgetRememberedSession,
} from "../src/lib/offline-vault";
describe("explicit trusted-device credential", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });
  afterEach(() => vi.restoreAllMocks());
  it("resumes a nonextractable credential and revokes it on Lock", async () => {
    const s = await createVault(
      "synthetic device recovery phrase",
      "actor",
      "workspace",
      {},
    );
    const expires = await rememberVaultSession(s);
    const resumed = await resumeVaultSession();
    expect(resumed?.key.extractable).toBe(false);
    expect(resumed?.meta.user_id).toBe("actor");
    expect(expires - Date.now()).toBeLessThanOrEqual(86400000);
    await forgetRememberedSession();
    expect(await resumeVaultSession()).toBeNull();
  });
  it("expires after24 hours without discarding encrypted drafts", async () => {
    const s = await createVault(
      "synthetic device recovery phrase",
      "actor",
      "workspace",
      {},
    );
    const expires = await rememberVaultSession(s);
    vi.spyOn(Date, "now").mockReturnValue(expires + 1);
    expect(await resumeVaultSession()).toBeNull();
  });
});
