"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { OfflineDraftForm } from "./offline-draft-form";
import {
  LockKeyhole,
  ArrowUpRight,
  RefreshCw,
  Check,
  Download,
  Clock3,
  AlertCircle,
} from "./icons";
import { field, FieldError } from "@/lib/field-api";
import {
  createVault,
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
import { date } from "@/lib/utils";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function OfflineTerminal() {
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
  const sessionRef = useRef<VaultSession | null>(null);
  const contextRef = useRef<FieldContext | null>(null);
  const syncingRef = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const attempt = useRef(0);
  const autoSync = useRef<() => void>(() => {});
  const lock = useCallback(() => {
    controller.current?.abort();
    sessionRef.current = null;
    contextRef.current = null;
    setSession(null);
    setContext(null);
    setDrafts([]);
    setSyncing(false);
    setNote("Workspace locked. Enter the offline passphrase to continue.");
  }, []);
  useEffect(() => {
    let cancelled = false;
    void vaultMeta()
      .then((m) => {
        if (!cancelled) {
          setMeta(m || null);
          setReady(true);
        }
      })
      .catch((e) => {
        setError(e.message);
        setReady(true);
      });
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
    let hiddenAt = 0;
    let lastActivity = Date.now();
    const activity = () => {
      lastActivity = Date.now();
    };
    const visibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 120000) lock();
    };
    const idle = setInterval(() => {
      if (sessionRef.current && Date.now() - lastActivity > 10 * 60 * 1000)
        lock();
    }, 15000);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerdown", activity, { passive: true });
    document.addEventListener("keydown", activity);
    return () => {
      cancelled = true;
      controller.current?.abort();
      clearInterval(idle);
      channel?.close();
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("beforeinstallprompt", installListener);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerdown", activity);
      document.removeEventListener("keydown", activity);
      void registered;
    };
  }, [lock]);
  useEffect(() => {
    if (!online || meta) return;
    const c = new AbortController();
    void fetch("/api/field", { signal: c.signal, cache: "no-store" })
      .then(async (r) => {
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        setStations(result.stations);
        setStationId(result.stations[0]?.id || "");
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setNote(
            "Sign in online, then return here to prepare a station on this device.",
          );
      });
    return () => c.abort();
  }, [online, meta]);
  async function load(s: VaultSession) {
    const saved = await readVault<FieldContext>(s, "context");
    if (
      !saved ||
      saved.user_id !== s.meta.user_id ||
      saved.workspace_id !== s.meta.workspace_id
    )
      throw new Error("The saved workspace did not match this device vault.");
    const records = await vaultDrafts<FieldDraft>(s);
    setContext(saved);
    contextRef.current = saved;
    setDrafts(
      records.sort((a, b) => a.captured_at.localeCompare(b.captured_at)),
    );
    setSession(s);
    sessionRef.current = s;
  }
  async function save(draft: FieldDraft) {
    const s = sessionRef.current;
    if (!s) throw new Error("Unlock the device first.");
    const existing = await vaultDrafts<FieldDraft>(s);
    if (existing.filter((d) => d.state !== "posted").length >= 20)
      throw new Error(
        "This device has 20 pending records. Sync or review them before adding more.",
      );
    await writeVault(s, `draft:${draft.id}`, draft);
    await load(s);
    setNote(
      "Encrypted draft saved on this device. It has not been posted online.",
    );
    if (navigator.onLine) setTimeout(() => autoSync.current(), 700);
  }
  const sync = useCallback(async () => {
    const s = sessionRef.current;
    const saved = contextRef.current;
    if (!s || !saved || syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    setError("");
    setNote("");
    const c = new AbortController();
    controller.current = c;
    try {
      const fresh = await field<FieldContext>(
        "context",
        { station_id: saved.station.id },
        c.signal,
      );
      if (
        fresh.user_id !== s.meta.user_id ||
        fresh.workspace_id !== s.meta.workspace_id
      )
        throw new Error(
          "Sign in with the account that prepared this device. No drafts were submitted.",
        );
      const records = (await vaultDrafts<FieldDraft>(s))
        .filter((d) => d.state !== "posted")
        .sort((a, b) => a.captured_at.localeCompare(b.captured_at));
      let count = 0;
      for (const draft of records) {
        if (c.signal.aborted) break;
        if (draft.state === "review") {
          setNote(
            "A saved record needs review. Later records are waiting so the shift cannot close ahead of a pending fill.",
          );
          break;
        }
        try {
          const result = await postOfflineDraft(draft, c.signal);
          await writeVault(s, `draft:${draft.id}`, {
            ...draft,
            state: "posted",
            result: { id: result.id },
            error: undefined,
            payload: {},
            evidence: {},
          });
          count++;
          attempt.current = 0;
        } catch (e) {
          if (c.signal.aborted) throw e;
          const message =
            e instanceof Error ? e.message : "Could not submit this draft";
          if (e instanceof FieldError && e.status === 400) {
            await writeVault(s, `draft:${draft.id}`, {
              ...draft,
              state: "review",
              error: message,
            });
            setNote("A record needs review. Later records remain queued.");
          } else {
            setError(message);
            attempt.current++;
          }
          break;
        }
      }
      if (count)
        setNote(
          `${count} ${count === 1 ? "record" : "records"} posted. The server retained the authoritative records.`,
        );
      if (sessionRef.current === s) await load(s);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      if (controller.current === c) controller.current = null;
    }
  }, []);
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
    if (
      !confirm(
        draft.state === "posted"
          ? "Remove this local receipt? The server record will remain."
          : "Delete this unposted draft and its photos from this device? No online record will be created.",
      )
    )
      return;
    await deleteVaultRecord(`draft:${draft.id}`);
    if (sessionRef.current) await load(sessionRef.current);
  }
  return (
    <main id="main" className="offline-page">
      <header className="offline-topbar">
        <Brand />
        <a href="/app">
          Online workspace <ArrowUpRight size={15} />
        </a>
      </header>
      <div className="offline-content">
        <div className="offline-page-heading">
          <div>
            <span className="eyebrow">PUMPSHIELD FIELD TERMINAL</span>
            <h1>
              Your station.
              <br />
              Even between signals.
            </h1>
            <p>
              Capture readings and camera evidence. Keep them encrypted until
              the server can verify them.
            </p>
          </div>
          <span
            className={`connectivity-pill ${online ? "online" : "offline"}`}
          >
            <i />
            {online ? "Connection available" : "Offline · drafts only"}
          </span>
        </div>
        <div className="offline-install">
          <div>
            <Download size={22} />
            <span>
              <strong>Add PumpShield to your home screen</strong>
              <small>
                {swReady
                  ? "The offline terminal is prepared on this browser."
                  : "Open this page online once to prepare the offline terminal."}
              </small>
            </span>
          </div>
          {install ? (
            <Button
              variant="secondary"
              onClick={async () => {
                await install.prompt();
                await install.userChoice;
                setInstall(null);
              }}
            >
              Install app
            </Button>
          ) : (
            <p>
              iPhone: Share → Add to Home Screen.
              <br />
              Android: browser menu → Install app.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {note && (
          <p role="status" className="offline-status">
            {note}
          </p>
        )}
        {!ready ? (
          <p role="status">Checking this device…</p>
        ) : !session ? (
          <section className="vault-card">
            <span className="vault-symbol">
              <LockKeyhole size={28} />
            </span>
            <h2>
              {meta
                ? "Unlock your offline workspace."
                : "Prepare a trusted device."}
            </h2>
            <p>
              {meta
                ? "Use the offline passphrase you chose on this device. Your account password is separate."
                : "Sign in online and choose a station, then create an offline passphrase. Saved station data and photos will be encrypted on this device."}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const f = new FormData(e.currentTarget);
                  const pass = String(f.get("passphrase"));
                  if (meta) {
                    await load(await unlockVault(pass));
                    setNote("Offline workspace unlocked.");
                  } else {
                    if (!navigator.onLine)
                      throw new Error(
                        "Connect and sign in to prepare this device first.",
                      );
                    const saved = await field<FieldContext>("context", {
                      station_id: stationId,
                    });
                    if (pass !== String(f.get("confirm")))
                      throw new Error("The offline passphrases do not match.");
                    const s = await createVault(
                      pass,
                      saved.user_id,
                      saved.workspace_id,
                      saved,
                    );
                    setMeta(s.meta);
                    await load(s);
                    await navigator.storage?.persist?.();
                    setNote(
                      "Device prepared. Save the offline passphrase somewhere safe; it cannot be recovered.",
                    );
                  }
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Unable to unlock this device",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {!meta && (
                <label>
                  Station
                  <select
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    required
                  >
                    <option value="">Choose a station</option>
                    {stations.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Offline passphrase
                <input
                  name="passphrase"
                  type="password"
                  autoComplete={meta ? "current-password" : "new-password"}
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              {!meta && (
                <label>
                  Confirm offline passphrase
                  <input
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </label>
              )}
              <Button
                disabled={
                  busy || (!meta && (!online || !stationId || !swReady))
                }
              >
                {busy
                  ? "Securing device…"
                  : meta
                    ? "Unlock workspace"
                    : "Prepare offline workspace"}
              </Button>
            </form>
            <p className="fine-print">
              Use a personal or station-controlled device. Without the offline
              passphrase, unsynced drafts cannot be recovered.
            </p>
            {meta && (
              <button
                className="text-link text-danger"
                onClick={async () => {
                  if (
                    !confirm(
                      "Remove the encrypted offline workspace and all unposted drafts from this device? This cannot be undone.",
                    )
                  )
                    return;
                  await forgetVault();
                  setMeta(null);
                  setNote(
                    "Local offline workspace removed. Online records were not changed.",
                  );
                }}
              >
                Remove this device’s offline workspace
              </button>
            )}
            <a className="text-link" href="/login">
              Sign in online
            </a>
          </section>
        ) : (
          context && (
            <>
              <section className="offline-workspace-strip">
                <div>
                  <strong>{context.station.name}</strong>
                  <span>
                    {context.person} · Prepared {date(context.prepared_at)} PKT
                  </span>
                </div>
                <div>
                  <Button
                    variant="secondary"
                    disabled={busy || syncing || !online}
                    onClick={async () => {
                      if (
                        !confirm(
                          "Refresh station data? Unsaved inputs and photos in the open form will be cleared. Saved drafts are kept.",
                        )
                      )
                        return;
                      setBusy(true);
                      try {
                        const fresh = await field<FieldContext>("context", {
                          station_id: context.station.id,
                        });
                        if (
                          fresh.user_id !== session.meta.user_id ||
                          fresh.workspace_id !== session.meta.workspace_id
                        )
                          throw new Error(
                            "Sign in with the account that prepared this workspace.",
                          );
                        await writeVault(session, "context", fresh);
                        await load(session);
                        setNote(
                          "Station data refreshed. Existing drafts kept their original shift references.",
                        );
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Unable to refresh",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <RefreshCw size={15} />
                    Refresh data
                  </Button>
                  <Button variant="ghost" onClick={lock}>
                    <LockKeyhole size={15} />
                    Lock
                  </Button>
                </div>
              </section>
              <div className="offline-work-grid">
                <OfflineDraftForm
                  key={context.prepared_at}
                  context={context}
                  onSave={save}
                />
                <section className="offline-queue">
                  <div className="offline-card-heading">
                    <div>
                      <span className="eyebrow">THIS DEVICE</span>
                      <h2>Submission queue</h2>
                    </div>
                    <span>
                      {drafts.filter((d) => d.state !== "posted").length}{" "}
                      pending
                    </span>
                  </div>
                  <Button
                    className="full-width"
                    disabled={
                      !online ||
                      syncing ||
                      !drafts.some((d) => d.state === "pending")
                    }
                    onClick={() => {
                      attempt.current = 0;
                      void sync();
                    }}
                  >
                    <RefreshCw size={16} className={syncing ? "spin" : ""} />
                    {syncing ? "Verifying & posting…" : "Sync pending records"}
                  </Button>
                  {!drafts.length ? (
                    <div className="offline-queue-empty">
                      <Check size={27} />
                      <h3>Nothing waiting.</h3>
                      <p>
                        Saved field drafts appear here. No private server pages
                        are cached.
                      </p>
                    </div>
                  ) : (
                    <ol>
                      {drafts.map((d) => (
                        <li key={d.id} className={`queue-${d.state}`}>
                          <div className="queue-record-top">
                            <span>
                              {d.state === "posted" ? (
                                <Check size={17} />
                              ) : d.state === "review" ? (
                                <AlertCircle size={17} />
                              ) : (
                                <Clock3 size={17} />
                              )}
                            </span>
                            <span>
                              {d.state === "posted"
                                ? "Posted"
                                : d.state === "review"
                                  ? "Needs review"
                                  : "Pending verification"}
                            </span>
                          </div>
                          <h3>{d.title}</h3>
                          <p>{date(d.captured_at)} PKT</p>
                          {d.error && <p className="queue-error">{d.error}</p>}
                          {d.result && (
                            <code>Record {d.result.id.slice(0, 8)}</code>
                          )}
                          <div className="queue-record-actions">
                            {d.state === "review" && (
                              <button
                                type="button"
                                disabled={!online || syncing}
                                onClick={async () => {
                                  await writeVault(session, `draft:${d.id}`, {
                                    ...d,
                                    state: "pending",
                                    error: undefined,
                                  });
                                  await load(session);
                                  attempt.current = 0;
                                  void sync();
                                }}
                              >
                                Recheck online
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={syncing}
                              onClick={() => void remove(d)}
                            >
                              {d.state === "posted"
                                ? "Remove local receipt"
                                : "Delete unposted draft"}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                  <p className="fine-print">
                    Sync runs while this terminal is open and unlocked. A
                    changed shift, revoked pass, insufficient credit or old
                    evidence can require owner review. Closed-browser background
                    sync is not promised.
                  </p>
                </section>
              </div>
            </>
          )
        )}
        <footer className="offline-footer">
          <LockKeyhole size={15} />
          <span>
            Encrypted local drafts · current authorisation checked on every
            submission · locks after inactivity
          </span>
        </footer>
      </div>
    </main>
  );
}
