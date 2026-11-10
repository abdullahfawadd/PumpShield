import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { OfflineLifetime } from "../src/lib/offline-lifetime";
import {
  createVault,
  readVault,
  unlockVault,
  vaultMeta,
  writeVault,
} from "../src/lib/offline-vault";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("offline session lifetime", () => {
  it("invalidates a non-cancellable continuation before it can restore a session", async () => {
    const lifetime = new OfflineLifetime<{ id: string }>();
    const lease = lifetime.begin();
    const waiting = deferred();
    let committed = false;
    const pending = (async () => {
      await waiting.promise; // crypto, IDB and transports may ignore cancellation
      lifetime.check(lease);
      lifetime.adopt(lease, { id: "old-session" });
      committed = true;
    })();
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    lifetime.invalidate();
    waiting.resolve();
    await rejected;
    expect(committed).toBe(false);
    expect(lease.controller.signal.aborted).toBe(true);
  });

  it("prevents old-session work from acting on a later unlock", () => {
    const lifetime = new OfflineLifetime<{ id: string }>();
    const unlock = lifetime.begin();
    const first = { id: "first" };
    lifetime.adopt(unlock, first);
    const refresh = lifetime.begin(first);
    lifetime.invalidate();
    const nextUnlock = lifetime.begin();
    lifetime.adopt(nextUnlock, { id: "second" });
    expect(() => lifetime.check(refresh)).toThrow();
    lifetime.finish(refresh); // an old finally block must not cancel the new session
    expect(lifetime.current(nextUnlock)).toBe(true);
    expect(nextUnlock.controller.signal.aborted).toBe(false);
  });

  it("aborts every operation on logout/unmount, not only sync", () => {
    const lifetime = new OfflineLifetime<object>();
    const unlock = lifetime.begin();
    const session = {};
    lifetime.adopt(unlock, session);
    const requests = [
      lifetime.begin(session),
      lifetime.begin(session),
      lifetime.begin(session),
    ];
    lifetime.invalidate();
    expect(requests.every((lease) => lease.controller.signal.aborted)).toBe(
      true,
    );
    expect(requests.every((lease) => !lifetime.current(lease))).toBe(true);
    expect(() => lifetime.begin(session)).toThrow();
  });
});

describe("vault cancellation across non-cancellable crypto", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not create a vault when lock interrupts key derivation", async () => {
    const c = new AbortController();
    const started = deferred();
    const waiting = deferred();
    const derive = crypto.subtle.deriveKey.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, "deriveKey").mockImplementation(async (...args) => {
      started.resolve();
      await waiting.promise;
      return derive(...args);
    });
    const pending = createVault(
      "a separate strong device phrase",
      "actor",
      "workspace",
      {},
      c.signal,
    );
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    await started.promise;
    c.abort();
    waiting.resolve();
    await rejected;
    expect(await vaultMeta()).toBeUndefined();
  });

  it("does not return a key when lock interrupts unlocking", async () => {
    await createVault("a separate strong device phrase", "actor", "workspace", {
      station: "sample",
    });
    const c = new AbortController();
    const started = deferred();
    const waiting = deferred();
    const derive = crypto.subtle.deriveKey.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, "deriveKey").mockImplementation(async (...args) => {
      started.resolve();
      await waiting.promise;
      return derive(...args);
    });
    const pending = unlockVault("a separate strong device phrase", c.signal);
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    await started.promise;
    c.abort();
    waiting.resolve();
    await rejected;
    expect((await vaultMeta())?.user_id).toBe("actor");
  });

  it("does not publish decrypted data after lock while decryption is pending", async () => {
    const session = await createVault(
      "a separate strong device phrase",
      "actor",
      "workspace",
      { private: "station context" },
    );
    const c = new AbortController();
    const started = deferred();
    const waiting = deferred();
    const decrypt = crypto.subtle.decrypt.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, "decrypt").mockImplementation(async (...args) => {
      started.resolve();
      await waiting.promise;
      return decrypt(...args);
    });
    const pending = readVault(session, "context", c.signal);
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    await started.promise;
    c.abort();
    waiting.resolve();
    await rejected;
  });

  it("keeps an existing draft when lock interrupts encryption of a save", async () => {
    const session = await createVault(
      "a separate strong device phrase",
      "actor",
      "workspace",
      {},
    );
    await writeVault(session, "draft:one", {
      state: "pending",
      original: true,
    });
    const c = new AbortController();
    const started = deferred();
    const waiting = deferred();
    const encrypt = crypto.subtle.encrypt.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, "encrypt").mockImplementation(async (...args) => {
      started.resolve();
      await waiting.promise;
      return encrypt(...args);
    });
    const pending = writeVault(
      session,
      "draft:one",
      { state: "posted", original: false },
      c.signal,
    );
    const rejected = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    await started.promise;
    c.abort();
    waiting.resolve();
    await rejected;
    expect(await readVault(session, "draft:one")).toEqual({
      state: "pending",
      original: true,
    });
  });
});
