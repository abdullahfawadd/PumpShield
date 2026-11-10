"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { field, FieldError } from "@/lib/field-api";
import { browserDb } from "@/lib/supabase/client";
import {
  createVault,
  rememberVaultSession,
  resumeVaultSession,
  forgetRememberedSession,
  unlockVault,
  vaultMeta,
  readVault,
  writeVault,
  vaultDrafts,
  deleteVaultRecord,
  forgetVault,
  type VaultMeta,
  type VaultSession,
} from "@/lib/offline-vault";
import { postOfflineDraft } from "@/lib/offline-sync";
import type { FieldContext, FieldDraft } from "@/lib/offline-types";
import {
  OfflineLifetime,
  isOfflineCancellation,
  type OfflineLease,
} from "@/lib/offline-lifetime";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function useOfflineTerminal() {
  const [meta, setMeta] = useState<VaultMeta | null>(null);
  const [session, setSession] = useState<VaultSession | null>(null);
  const [context, setContext] = useState<FieldContext | null>(null);
  const [drafts, setDrafts] = useState<FieldDraft[]>([]);
  const [stations, setStations] = useState<{ id: string; name: string }[]>([]);
  const [stationId, setStationId] = useState("");
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [swReady, setSwReady] = useState(false);
  const trustedUntil = useRef(0);
  const sessionRef = useRef<VaultSession | null>(null);
  const contextRef = useRef<FieldContext | null>(null);
  const syncingRef = useRef(false);
  const [lifetime] = useState(() => new OfflineLifetime<VaultSession>());
  const syncLease = useRef<OfflineLease<VaultSession> | null>(null);
  const attempt = useRef(0);
  const autoSync = useRef<() => void>(() => {});
  const lock = useCallback(
    (refreshMetadata = true) => {
      lifetime.invalidate();
      trustedUntil.current = 0;
      void forgetRememberedSession().catch(() => {});
      syncLease.current = null;
      syncingRef.current = false;
      attempt.current = 0;
      sessionRef.current = null;
      contextRef.current = null;
      setSession(null);
      setContext(null);
      setDrafts([]);
      setStations([]);
      setStationId("");
      setBusy(false);
      setSyncing(false);
      setError("");
      setNote("Workspace locked. Enter the offline passphrase to continue.");
      if (!refreshMetadata) return;
      // A prepare transaction may have committed just before cancellation.
      // Refresh only non-secret metadata under a new locked generation; never
      // reuse the old key or decrypt context from the cancelled operation.
      const lease = lifetime.begin();
      void vaultMeta(lease.controller.signal)
        .then((saved) => {
          if (lifetime.current(lease)) {
            setMeta(saved || null);
            setReady(true);
          }
        })
        .catch((error) => {
          if (lifetime.current(lease) && !isOfflineCancellation(error)) {
            setError(
              "Device storage could not be checked. Reload before unlocking.",
            );
            setReady(true);
          }
        })
        .finally(() => lifetime.finish(lease));
    },
    [lifetime],
  );
  const load = useCallback(
    async (s: VaultSession, lease: OfflineLease<VaultSession>) => {
      lifetime.check(lease);
      const saved = await readVault<FieldContext>(
        s,
        "context",
        lease.controller.signal,
      );
      lifetime.check(lease);
      if (
        !saved ||
        saved.user_id !== s.meta.user_id ||
        saved.workspace_id !== s.meta.workspace_id
      )
        throw new Error("The saved workspace did not match this device vault.");
      const records = await vaultDrafts<FieldDraft>(s, lease.controller.signal);
      lifetime.check(lease);
      lifetime.adopt(lease, s);
      setContext(saved);
      contextRef.current = saved;
      setDrafts(
        records.sort((a, b) => a.captured_at.localeCompare(b.captured_at)),
      );
      setSession(s);
      sessionRef.current = s;
    },
    [lifetime],
  );
  useEffect(() => {
    let cancelled = false;
    const metadataLease = lifetime.begin();
    void vaultMeta(metadataLease.controller.signal)
      .then(async (m) => {
        if (!cancelled && lifetime.current(metadataLease)) {
          setMeta(m || null);
          const remembered = await resumeVaultSession(
            metadataLease.controller.signal,
          );
          lifetime.check(metadataLease);
          if (remembered) {
            if (navigator.onLine) {
              const auth = await browserDb().auth.getUser();
              lifetime.check(metadataLease);
              if (auth.data.user?.id !== remembered.meta.user_id) {
                await forgetRememberedSession();
                setReady(true);
                return;
              }
            }
            await load(remembered, metadataLease);
            lifetime.check(metadataLease);
            trustedUntil.current = remembered.expires;
          }
          setReady(true);
        }
      })
      .catch((e) => {
        if (
          !cancelled &&
          lifetime.current(metadataLease) &&
          !isOfflineCancellation(e)
        ) {
          setError(e.message);
          setReady(true);
        }
      })
      .finally(() => lifetime.finish(metadataLease));
    const network = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) setTimeout(() => autoSync.current(), 500);
    };
    network();
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    const installListener = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", installListener);
    let registered: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator)
      void (async () => {
        registered = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller)
          await new Promise<void>((resolve) =>
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => resolve(),
              { once: true },
            ),
          );
        await import("@zxing/browser");
        const urls = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((value) => {
            const url = new URL(value);
            return (
              url.origin === location.origin &&
              url.pathname.startsWith("/_next/static/")
            );
          });
        const result = await new Promise<{ ready: boolean }>((resolve) => {
          const channel = new MessageChannel();
          const timer = setTimeout(() => resolve({ ready: false }), 30000);
          channel.port1.onmessage = (event) => {
            clearTimeout(timer);
            resolve(event.data);
            channel.port1.close();
          };
          navigator.serviceWorker.controller?.postMessage(
            { type: "CACHE_PUBLIC_ASSETS", urls },
            [channel.port2],
          );
        });
        if (!result.ready)
          throw new Error("Offline assets were not fully prepared");
        if (!cancelled) setSwReady(true);
      })().catch(() => {
        if (!cancelled)
          setNote(
            "Offline installation was unavailable. Keep this page open and try again online.",
          );
      });
    const channel =
      "BroadcastChannel" in window
        ? new BroadcastChannel("pumpshield-session")
        : null;
    const onSession = () => lock();
    if (channel) channel.onmessage = onSession;
    let observedUser: string | null | undefined;
    const {
      data: { subscription },
    } = browserDb().auth.onAuthStateChange((event, auth) => {
      const nextUser = auth?.user.id || null;
      if (
        event === "SIGNED_OUT" ||
        (observedUser !== undefined && nextUser !== observedUser) ||
        (sessionRef.current &&
          nextUser &&
          nextUser !== sessionRef.current.meta.user_id)
      )
        lock();
      observedUser = nextUser;
    });
    let hiddenAt = 0;
    let lastActivity = Date.now();
    const activity = () => {
      lastActivity = Date.now();
    };
    const visibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (
        !trustedUntil.current &&
        hiddenAt &&
        Date.now() - hiddenAt > 120000
      )
        lock();
    };
    const idle = setInterval(() => {
      if (
        sessionRef.current &&
        ((trustedUntil.current > 0 && Date.now() >= trustedUntil.current) ||
          (!trustedUntil.current && Date.now() - lastActivity > 10 * 60 * 1000))
      )
        lock();
    }, 15000);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerdown", activity, { passive: true });
    document.addEventListener("keydown", activity);
    return () => {
      cancelled = true;
      lifetime.invalidate();
      sessionRef.current = null;
      contextRef.current = null;
      syncLease.current = null;
      syncingRef.current = false;
      clearInterval(idle);
      channel?.close();
      subscription.unsubscribe();
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("beforeinstallprompt", installListener);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerdown", activity);
      document.removeEventListener("keydown", activity);
      void registered;
    };
  }, [lock, lifetime, load]);
  useEffect(() => {
    if (!online || meta) return;
    const lease = lifetime.begin();
    void fetch("/api/field", {
      signal: lease.controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        lifetime.check(lease);
        const result = await r.json();
        lifetime.check(lease);
        if (!r.ok) throw new Error(result.error);
        setStations(result.stations);
        setStationId(result.stations[0]?.id || "");
      })
      .catch((e) => {
        if (lifetime.current(lease) && !isOfflineCancellation(e))
          setNote(
            "Sign in online, then return here to prepare a station on this device.",
          );
      })
      .finally(() => lifetime.finish(lease));
    return () => lifetime.finish(lease);
  }, [online, meta, lifetime]);
  async function save(draft: FieldDraft) {
    const s = sessionRef.current;
    if (!s) throw new Error("Unlock the device first.");
    if (
      draft.user_id !== s.meta.user_id ||
      draft.workspace_id !== s.meta.workspace_id ||
      draft.station_id !== contextRef.current?.station.id
    )
      throw new Error(
        "This form belongs to a different offline workspace. Refresh and try again.",
      );
    const lease = lifetime.begin(s);
    try {
      const existing = await vaultDrafts<FieldDraft>(
        s,
        lease.controller.signal,
      );
      lifetime.check(lease);
      if (existing.filter((d) => d.state !== "posted").length >= 20)
        throw new Error(
          "This device has 20 pending records. Sync or review them before adding more.",
        );
      await writeVault(s, `draft:${draft.id}`, draft, lease.controller.signal);
      lifetime.check(lease);
      await load(s, lease);
      lifetime.check(lease);
      setNote(
        "Encrypted draft saved on this device. It has not been posted online.",
      );
      if (navigator.onLine) {
        // The callback must not sync a different session after a lock/unlock.
        const generation = lease.generation;
        setTimeout(() => {
          if (sessionRef.current === s && lifetime.isGeneration(generation))
            autoSync.current();
        }, 700);
      }
    } finally {
      lifetime.finish(lease);
    }
  }
  const sync = useCallback(async () => {
    const s = sessionRef.current;
    const saved = contextRef.current;
    if (!s || !saved || syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    setError("");
    setNote("");
    const lease = lifetime.begin(s);
    syncLease.current = lease;
    const signal = lease.controller.signal;
    try {
      const fresh = await field<FieldContext>(
        "context",
        { station_id: saved.station.id },
        signal,
      );
      lifetime.check(lease);
      if (
        fresh.user_id !== s.meta.user_id ||
        fresh.workspace_id !== s.meta.workspace_id
      ) {
        lock();
        return;
      }
      const records = (await vaultDrafts<FieldDraft>(s, signal))
        .filter((d) => d.state !== "posted")
        .sort((a, b) => a.captured_at.localeCompare(b.captured_at));
      lifetime.check(lease);
      let count = 0;
      for (const draft of records) {
        lifetime.check(lease);
        if (draft.state === "review") {
          setNote(
            "A saved record needs review. Later records are waiting so the shift cannot close ahead of a pending fill.",
          );
          break;
        }
        try {
          const result = await postOfflineDraft(draft, signal);
          lifetime.check(lease);
          await writeVault(
            s,
            `draft:${draft.id}`,
            {
              ...draft,
              state: "posted",
              result: { id: result.id },
              error: undefined,
              payload: {},
              evidence: {},
            },
            signal,
          );
          lifetime.check(lease);
          count++;
          attempt.current = 0;
        } catch (e) {
          if (!lifetime.current(lease) || isOfflineCancellation(e)) throw e;
          const message =
            e instanceof Error ? e.message : "Could not submit this draft";
          if (e instanceof FieldError && e.status === 400) {
            await writeVault(
              s,
              `draft:${draft.id}`,
              {
                ...draft,
                state: "review",
                error: message,
              },
              signal,
            );
            lifetime.check(lease);
            setNote("A record needs review. Later records remain queued.");
          } else {
            setError(message);
            attempt.current++;
          }
          break;
        }
      }
      lifetime.check(lease);
      if (count)
        setNote(
          `${count} ${count === 1 ? "record" : "records"} posted. The server retained the authoritative records.`,
        );
      await load(s, lease);
      lifetime.check(lease);
    } catch (e) {
      if (lifetime.current(lease) && !isOfflineCancellation(e)) {
        if (e instanceof FieldError && [400, 401, 403].includes(e.status))
          lock();
        else
          setError(e instanceof Error ? e.message : "Could not sync records.");
      }
    } finally {
      if (syncLease.current === lease) {
        syncingRef.current = false;
        syncLease.current = null;
        if (lifetime.current(lease)) setSyncing(false);
      }
      lifetime.finish(lease);
    }
  }, [lifetime, load, lock]);
  useEffect(() => {
    autoSync.current = () => void sync();
    const first = setTimeout(() => {
      if (session && online) void sync();
    }, 800);
    const timer = setInterval(() => {
      if (
        sessionRef.current &&
        navigator.onLine &&
        !document.hidden &&
        attempt.current < 5
      )
        void sync();
    }, 45000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [session, online, sync]);
  async function remove(draft: FieldDraft) {
    const s = sessionRef.current;
    if (!s) return;
    if (
      !confirm(
        draft.state === "posted"
          ? "Remove this local receipt? The server record will remain."
          : "Delete this unposted draft and its photos from this device? No online record will be created.",
      )
    )
      return;
    const lease = lifetime.begin(s);
    try {
      await deleteVaultRecord(`draft:${draft.id}`, lease.controller.signal);
      lifetime.check(lease);
      await load(s, lease);
    } catch (error) {
      if (lifetime.current(lease) && !isOfflineCancellation(error))
        setError(
          error instanceof Error
            ? error.message
            : "Could not remove the local record.",
        );
    } finally {
      lifetime.finish(lease);
    }
  }
  async function unlockDevice(form: HTMLFormElement) {
    const lease = lifetime.begin();
    const signal = lease.controller.signal;
    setBusy(true);
    setError("");
    try {
      const f = new FormData(form);
      const pass = String(f.get("passphrase"));
      if (meta) {
        const s = await unlockVault(pass, signal);
        lifetime.check(lease);
        await load(s, lease);
        lifetime.check(lease);
        setNote("Offline workspace unlocked.");
      } else {
        if (!navigator.onLine)
          throw new Error("Connect and sign in to prepare this device first.");
        if (pass !== String(f.get("confirm")))
          throw new Error("The offline passphrases do not match.");
        const saved = await field<FieldContext>(
          "context",
          { station_id: stationId },
          signal,
        );
        lifetime.check(lease);
        const s = await createVault(
          pass,
          saved.user_id,
          saved.workspace_id,
          saved,
          signal,
        );
        lifetime.check(lease);
        // Metadata is non-secret; publishing it does not publish the key.
        setMeta(s.meta);
        await load(s, lease);
        lifetime.check(lease);
        await navigator.storage?.persist?.();
        lifetime.check(lease);
        setNote(
          "Device prepared. Keep the separate offline passphrase safe; it cannot be recovered.",
        );
      }
      if (f.get("remember") === "on" && sessionRef.current) {
        trustedUntil.current = await rememberVaultSession(
          sessionRef.current,
          signal,
        );
        lifetime.check(lease);
      }
      form.reset();
    } catch (error) {
      if (lifetime.current(lease) && !isOfflineCancellation(error))
        setError(
          error instanceof Error
            ? error.message
            : "Unable to unlock this device.",
        );
    } finally {
      if (lifetime.current(lease)) setBusy(false);
      lifetime.finish(lease);
    }
  }
  async function refreshData() {
    const s = sessionRef.current;
    const saved = contextRef.current;
    if (
      !s ||
      !saved ||
      !confirm(
        "Refresh station data? Unsaved inputs and photos will be cleared. Saved drafts keep their original shift references.",
      )
    )
      return;
    const lease = lifetime.begin(s);
    setBusy(true);
    setError("");
    try {
      const fresh = await field<FieldContext>(
        "context",
        { station_id: saved.station.id },
        lease.controller.signal,
      );
      lifetime.check(lease);
      if (
        fresh.user_id !== s.meta.user_id ||
        fresh.workspace_id !== s.meta.workspace_id
      ) {
        lock();
        return;
      }
      await writeVault(s, "context", fresh, lease.controller.signal);
      lifetime.check(lease);
      await load(s, lease);
      lifetime.check(lease);
      setNote(
        "Station data refreshed. Existing drafts kept their original shift references.",
      );
    } catch (error) {
      if (lifetime.current(lease) && !isOfflineCancellation(error)) {
        if (
          error instanceof FieldError &&
          [400, 401, 403].includes(error.status)
        )
          lock();
        else
          setError(
            error instanceof Error ? error.message : "Unable to refresh.",
          );
      }
    } finally {
      if (lifetime.current(lease)) setBusy(false);
      lifetime.finish(lease);
    }
  }
  async function retryDraft(draft: FieldDraft) {
    const s = sessionRef.current;
    if (!s) return;
    const lease = lifetime.begin(s);
    try {
      await writeVault(
        s,
        `draft:${draft.id}`,
        { ...draft, state: "pending", error: undefined },
        lease.controller.signal,
      );
      lifetime.check(lease);
      await load(s, lease);
      lifetime.check(lease);
      attempt.current = 0;
      void sync();
    } catch (error) {
      if (lifetime.current(lease) && !isOfflineCancellation(error))
        setError(
          error instanceof Error
            ? error.message
            : "Unable to recheck the draft.",
        );
    } finally {
      lifetime.finish(lease);
    }
  }
  async function removeWorkspace() {
    if (
      !confirm(
        "Remove the encrypted offline workspace and all unposted drafts from this device? This cannot be undone.",
      )
    )
      return;
    lock(false);
    const lease = lifetime.begin();
    setBusy(true);
    try {
      await forgetVault(lease.controller.signal);
      lifetime.check(lease);
      setMeta(null);
      setNote(
        "Local offline workspace removed. Online records were not changed.",
      );
    } catch (error) {
      if (lifetime.current(lease) && !isOfflineCancellation(error))
        setError(
          error instanceof Error
            ? error.message
            : "Could not remove this device's workspace.",
        );
    } finally {
      if (lifetime.current(lease)) setBusy(false);
      lifetime.finish(lease);
    }
  }
  async function installApp() {
    if (!install) return;
    const lease = lifetime.begin();
    try {
      await install.prompt();
      lifetime.check(lease);
      await install.userChoice;
      lifetime.check(lease);
      setInstall(null);
    } catch (error) {
      if (lifetime.current(lease) && !isOfflineCancellation(error))
        setError(
          "The install prompt was unavailable. Use your browser's Add to Home Screen command.",
        );
    } finally {
      lifetime.finish(lease);
    }
  }
  function syncNow() {
    attempt.current = 0;
    void sync();
  }
  return {
    meta,
    unlocked: !!session,
    context,
    drafts,
    stations,
    stationId,
    setStationId,
    online,
    ready,
    busy,
    syncing,
    error,
    note,
    canInstall: !!install,
    swReady,
    installApp,
    unlockDevice,
    save,
    refreshData,
    retryDraft,
    removeWorkspace,
    remove,
    syncNow,
    lock: () => {
      try {
        if ("BroadcastChannel" in window) {
          const channel = new BroadcastChannel("pumpshield-session");
          channel.postMessage({ type: "lock" });
          channel.close();
        }
      } finally {
        lock();
      }
    },
  };
}
