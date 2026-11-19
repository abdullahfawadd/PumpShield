"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { ChevronDown, RefreshCw } from "./icons";
import { FieldError, field } from "@/lib/field-api";
import {
  storeCapture,
  type CapturedEvidence,
  type StoredEvidence,
} from "@/lib/evidence-capture";
import { postOfflineDraft } from "@/lib/offline-sync";
import type { DraftKind, FieldContext, FieldDraft } from "@/lib/offline-types";
import {
  deleteWorkspaceDraft,
  prepareWorkspaceDevice,
  readWorkspaceDrafts,
  resetWorkspaceLease,
  resumeWorkspaceDevice,
  vaultMeta,
  writeWorkspaceDraft,
  type WorkspaceDevice,
} from "@/lib/offline-vault";
import { browserDb } from "@/lib/supabase/client";

type Session = { device: WorkspaceDevice; context: FieldContext };
type DeviceIdentity = Pick<FieldContext, "user_id" | "workspace_id">;
type QueueResult = "posted" | "queued";
type QueueItem = Pick<
  FieldDraft,
  "id" | "title" | "state" | "error" | "station_id"
>;
const labels: Record<DraftKind, string> = {
  parchi: "Fuel parchi",
  submit_delivery: "Arrival audit",
  close_shift: "Shift close",
};

export function isFieldDraftKind(op: string): op is DraftKind {
  return Object.hasOwn(labels, op);
}

export async function lockWorkspaceDevice() {
  window.dispatchEvent(new Event("pumpshield-device-lock"));
  // Signing out must still proceed on a browser without device storage.
  await resetWorkspaceLease().catch(() => {});
}

export function isNetworkFailure(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof FieldError && error.status >= 500)
  );
}

function isRejected(error: unknown): error is FieldError {
  return error instanceof FieldError && [400, 403, 413].includes(error.status);
}

function isSameIdentity(left: DeviceIdentity, right: DeviceIdentity) {
  return (
    left.user_id === right.user_id && left.workspace_id === right.workspace_id
  );
}

function references(value: unknown): string[] {
  if (typeof value === "string")
    return value.startsWith("local:") ? [value] : [];
  if (value && typeof value === "object")
    return Object.values(value).flatMap(references);
  return [];
}

const DeviceContext = createContext<ReturnType<typeof useFieldQueue> | null>(
  null,
);

export function useWorkspaceOffline() {
  return useContext(DeviceContext);
}

function useFieldQueue(identity: DeviceIdentity, initial?: Session) {
  const [stationId, setStationId] = useState(initial?.context.station.id || "");
  const [context, setContext] = useState(initial?.context || null);
  const [online, setOnline] = useState(true);
  const [prepared, setPrepared] = useState(!!initial);
  const [legacy, setLegacy] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);
  const [problem, setProblem] = useState("");
  const session = useRef<Session | null>(initial || null);
  const controller = useRef<AbortController | null>(null);
  const posting = useRef<Promise<void> | null>(null);
  const preparation = useRef<AbortController | null>(null);
  const photos = useRef(new Map<string, StoredEvidence>());

  const updateItems = useCallback(
    async (device: WorkspaceDevice, signal: AbortSignal) => {
      const drafts = await readWorkspaceDrafts(device, signal);
      signal.throwIfAborted();
      setItems(
        drafts.map(({ id, title, state, error, station_id }) => ({
          id,
          title,
          state,
          error,
          station_id,
        })),
      );
      return drafts;
    },
    [],
  );

  const refreshContext = useCallback(async () => {
    const signal = controller.current?.signal;
    if (!signal || signal.aborted || !stationId || !navigator.onLine) return;
    preparation.current?.abort();
    const run = new AbortController();
    preparation.current = run;
    const requestSignal = AbortSignal.any([
      run.signal,
      signal,
      AbortSignal.timeout(15_000),
    ]);
    try {
      const next = await field<FieldContext>(
        "context",
        { station_id: stationId },
        requestSignal,
      );
      if (!isSameIdentity(next, identity))
        throw new FieldError("Sign in again to sync your records.", 401);
      setOnline(true);
      const device = await prepareWorkspaceDevice(next, requestSignal);
      requestSignal.throwIfAborted();
      session.current = { device, context: device.context };
      setPrepared(true);
      setContext(device.context);
      setProblem((value) =>
        value.startsWith("Device storage") || value.startsWith("Sign in")
          ? ""
          : value,
      );
      await updateItems(device, requestSignal);
    } catch (error) {
      if (signal.aborted || run.signal.aborted) return;
      if (requestSignal.aborted) {
        setOnline(false);
        return;
      }
      if (isNetworkFailure(error)) {
        setOnline(false);
        return;
      }
      if (error instanceof FieldError) {
        session.current = null;
        setPrepared(false);
        setContext(null);
        setItems([]);
        setProblem(
          "Sign in with the account that saved these records to continue.",
        );
        if (error.status === 401) await resetWorkspaceLease().catch(() => {});
        return;
      }
      setProblem(
        "Device storage is unavailable. Connect to submit these records.",
      );
    }
  }, [identity, stationId, updateItems]);

  const drain = useCallback(
    async (foregroundId?: string) => {
      while (posting.current) {
        const running = posting.current;
        await running.catch(() => {});
        if (!foregroundId) return;
        if (posting.current === running) posting.current = null;
      }
      const current = session.current;
      const signal = controller.current?.signal;
      if (!current || !signal || signal.aborted || !navigator.onLine) return;
      const { device } = current;
      const promise = (async () => {
        setSyncing(true);
        try {
          const drafts = await readWorkspaceDrafts(device, signal);
          const blocked = new Set<string>();
          let updated = false;
          for (const draft of drafts) {
            if (draft.state === "review") blocked.add(draft.station_id);
            if (draft.state !== "pending" || blocked.has(draft.station_id))
              continue;
            try {
              const requestSignal = AbortSignal.any([
                signal,
                AbortSignal.timeout(45_000),
              ]);
              await postOfflineDraft(draft, requestSignal);
              await deleteWorkspaceDraft(device, draft.id, signal);
              updated = true;
              setOnline(true);
              setProblem("");
            } catch (error) {
              signal.throwIfAborted();
              if (isRejected(error)) {
                if (draft.id === foregroundId) {
                  await deleteWorkspaceDraft(device, draft.id, signal);
                  throw error;
                }
                await writeWorkspaceDraft(
                  device,
                  {
                    ...draft,
                    state: "review",
                    error: error.message,
                  },
                  signal,
                );
                blocked.add(draft.station_id);
                continue;
              }
              if (error instanceof FieldError && error.status === 401) {
                setProblem("Sign in again to upload saved records.");
              } else if (isNetworkFailure(error) || !navigator.onLine) {
                setOnline(false);
              } else {
                setProblem(
                  "A saved record is waiting to upload. PumpShield will retry.",
                );
              }
              break;
            }
          }
          if (updated) setSyncVersion((previous) => previous + 1);
        } finally {
          if (!signal.aborted) {
            setSyncing(false);
            await updateItems(device, signal);
          }
        }
      })();
      posting.current = promise;
      try {
        await promise;
      } finally {
        if (posting.current === promise) posting.current = null;
      }
    },
    [updateItems],
  );

  useEffect(() => {
    const lifetime = new AbortController();
    controller.current = lifetime;
    const lock = () => {
      lifetime.abort();
      session.current = null;
      photos.current.clear();
      setPrepared(false);
      setContext(null);
      setItems([]);
      void resetWorkspaceLease().catch(() => {});
    };
    const network = () => setOnline(navigator.onLine);
    network();
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("pumpshield-device-lock", lock);
    const channel =
      "BroadcastChannel" in window
        ? new BroadcastChannel("pumpshield-session")
        : null;
    if (channel) channel.onmessage = lock;
    const {
      data: { subscription },
    } = browserDb().auth.onAuthStateChange((event, auth) => {
      if (
        event === "SIGNED_OUT" ||
        (auth?.user.id && auth.user.id !== identity.user_id)
      )
        lock();
    });
    void vaultMeta(lifetime.signal)
      .then((meta) => setLegacy(!!meta && isSameIdentity(meta, identity)))
      .catch(() => {});
    return () => {
      lifetime.abort();
      channel?.close();
      subscription.unsubscribe();
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("pumpshield-device-lock", lock);
    };
  }, [identity]);

  useEffect(() => {
    if (!stationId) return;
    const signal = controller.current?.signal;
    async function ready() {
      const saved = await resumeWorkspaceDevice(stationId, signal).catch(
        () => null,
      );
      if (!signal || signal.aborted) return;
      if (saved && isSameIdentity(saved.device, identity)) {
        session.current = saved;
        setContext(saved.context);
        setPrepared(true);
        await updateItems(saved.device, signal);
      }
      await refreshContext();
    }
    void ready()
      .then(() => drain())
      .catch(() => {});
    return () => preparation.current?.abort();
  }, [stationId, identity, refreshContext, drain, updateItems]);

  useEffect(() => {
    function sync() {
      if (navigator.onLine && document.visibilityState === "visible") {
        void refreshContext()
          .then(() => drain())
          .catch(() => {});
      }
    }
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    const interval = setInterval(sync, 45_000);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      clearInterval(interval);
    };
  }, [drain, refreshContext]);

  async function stashCapture(capture: CapturedEvidence, replaced?: string) {
    const signal = controller.current?.signal;
    signal?.throwIfAborted();
    const evidence = await storeCapture(capture);
    signal?.throwIfAborted();
    const reference = `local:${evidence.captureId}`;
    if (replaced) photos.current.delete(replaced);
    photos.current.set(reference, evidence);
    return reference;
  }

  async function save(draft: FieldDraft): Promise<QueueResult> {
    const signal = controller.current?.signal;
    if (!signal) throw new Error("Open the station before saving.");
    signal.throwIfAborted();
    if (!isSameIdentity(draft, identity))
      throw new Error("Sign back in to save this record.");
    const preparedSession = session.current;
    if (!preparedSession) {
      if (!online || !navigator.onLine)
        throw new Error(
          "Open this station online before saving without a connection.",
        );
      await postOfflineDraft(
        draft,
        AbortSignal.any([signal, AbortSignal.timeout(45_000)]),
      );
      return "posted";
    }
    if (!online || !navigator.onLine) {
      if (
        preparedSession.context.station.id !== draft.station_id ||
        Date.parse(preparedSession.context.expires_at) <= Date.now()
      ) {
        throw new Error(
          "Open this station online before saving without a connection.",
        );
      }
    }
    const { device } = preparedSession;
    const existing = await readWorkspaceDrafts(device, signal);
    const duplicate = existing.find(
      (previous) =>
        previous.id !== draft.id &&
        previous.station_id === draft.station_id &&
        previous.kind === draft.kind &&
        draft.kind !== "parchi" &&
        previous.payload.id === draft.payload.id,
    );
    if (duplicate)
      throw new Error(
        "A record for this item is already saved on this device. Check sync status.",
      );
    await writeWorkspaceDraft(device, draft, signal);
    await updateItems(device, signal);
    if (!navigator.onLine || !online) return "queued";
    await drain(draft.id);
    return (await readWorkspaceDrafts(device, signal)).some(
      (saved) => saved.id === draft.id,
    )
      ? "queued"
      : "posted";
  }

  async function submit(
    kind: DraftKind,
    payload: Record<string, unknown>,
    request: { id: string; capturedAt: string },
  ) {
    const station = String(payload.station_id || "");
    const evidence: Record<string, StoredEvidence> = {};
    for (const id of new Set(references(payload))) {
      const photo = photos.current.get(id);
      if (!photo)
        throw new Error(
          "Capture this record’s photos again before submitting.",
        );
      evidence[id] = photo;
    }
    const result = await save({
      id: request.id,
      ...identity,
      station_id: station,
      shift_id:
        kind === "close_shift"
          ? String(payload.id)
          : String(payload.shift_id || "") || null,
      captured_at: request.capturedAt,
      kind,
      title: labels[kind],
      payload,
      evidence,
      state: "pending",
    });
    for (const id of Object.keys(evidence)) photos.current.delete(id);
    return result;
  }

  async function retry(item: QueueItem) {
    const current = session.current;
    const signal = controller.current?.signal;
    if (!current || !signal || signal.aborted) return;
    const drafts = await readWorkspaceDrafts(current.device, signal);
    const draft = drafts.find(({ id }) => id === item.id);
    if (!draft) return;
    await writeWorkspaceDraft(
      current.device,
      { ...draft, state: "pending", error: undefined },
      signal,
    );
    await refreshContext();
    await drain();
  }

  async function discard(item: QueueItem) {
    const current = session.current;
    const signal = controller.current?.signal;
    if (!current || !signal || signal.aborted) return;
    await deleteWorkspaceDraft(current.device, item.id, signal);
    await updateItems(current.device, signal);
    await drain();
  }

  return {
    online,
    prepared: prepared && context?.station.id === stationId,
    stationId,
    setStationId,
    context,
    items,
    syncing,
    syncVersion,
    legacy,
    problem,
    refreshContext,
    save,
    submit,
    stashCapture,
    retry,
    discard,
    noteNetworkFailure: () => setOnline(false),
    captureTimestamp: () =>
      new Date(
        Date.now() + (session.current?.context.device_clock_offset_ms || 0),
      ).toISOString(),
  };
}

export function WorkspaceOfflineProvider({
  userId,
  workspaceId,
  initial,
  children,
}: {
  userId: string;
  workspaceId: string;
  initial?: Session;
  children: ReactNode;
}) {
  const [identity] = useState<DeviceIdentity>(() => ({
    user_id: userId,
    workspace_id: workspaceId,
  }));
  const queue = useFieldQueue(identity, initial);
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      initial ||
      !("serviceWorker" in navigator)
    )
      return;
    let cancelled = false;
    async function prepareShell() {
      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      await navigator.serviceWorker.ready;
      if (cancelled) return;
      if (!navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          warmScanner,
          { once: true },
        );
      } else warmScanner();
    }
    function warmScanner() {
      if (!cancelled) void import("@zxing/browser").catch(() => {});
    }
    void prepareShell().catch(() => {});
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        warmScanner,
      );
    };
  }, [initial]);
  return (
    <DeviceContext.Provider value={queue}>{children}</DeviceContext.Provider>
  );
}

export function WorkspaceOfflineStation({
  stationId,
  revision,
  onSynced,
}: {
  stationId: string;
  revision?: string;
  onSynced?: () => void;
}) {
  const queue = useWorkspaceOffline();
  const setStation = queue?.setStationId;
  const refresh = queue?.refreshContext;
  const syncVersion = queue?.syncVersion || 0;
  const previousVersion = useRef(syncVersion);
  const previousRevision = useRef(revision);
  useEffect(() => {
    setStation?.(stationId);
  }, [stationId, setStation]);
  useEffect(() => {
    if (previousRevision.current !== revision) void refresh?.();
    previousRevision.current = revision;
  }, [revision, refresh]);
  useEffect(() => {
    if (previousVersion.current !== syncVersion) onSynced?.();
    previousVersion.current = syncVersion;
  }, [syncVersion, onSynced]);
  return null;
}

export function WorkspaceSyncStatus({
  onRefresh,
  refreshing,
  refreshFailed,
}: {
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshFailed?: boolean;
} = {}) {
  const queue = useWorkspaceOffline();
  if (!queue?.stationId) return null;
  const reviewing = queue.items.filter((item) => item.state === "review");
  const waiting = queue.items.length - reviewing.length;
  const label = reviewing.length
    ? `${reviewing.length} need review`
    : queue.syncing || refreshing
      ? "Syncing"
      : waiting
        ? `${waiting} saved on device`
        : !queue.online
          ? "Offline"
          : queue.problem || refreshFailed
            ? "Check sync"
            : queue.prepared
              ? "Ready offline"
              : "Preparing device";
  const tone =
    reviewing.length || queue.problem || refreshFailed
      ? "review"
      : waiting ||
          !queue.online ||
          !queue.prepared ||
          queue.syncing ||
          refreshing
        ? "waiting"
        : "ready";
  return (
    <details
      className="workspace-sync"
      data-tone={tone}
      onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        title="Device and record sync"
        aria-label={`${label}. Device and record sync`}
      >
        <span className={`sync-indicator ${tone}`} />
        <span className="workspace-sync-label">{label}</span>
        <span className="workspace-sync-short" aria-hidden="true">
          Sync
        </span>
        <ChevronDown
          className="workspace-sync-chevron"
          size={12}
          aria-hidden="true"
        />
      </summary>
      <div className="workspace-sync-details">
        {refreshFailed && (
          <p role="status">
            Couldn’t refresh checked-in records. Showing the last loaded data.
          </p>
        )}
        {queue.problem && <p role="status">{queue.problem}</p>}
        {waiting > 0 && (
          <p role="status">
            Saved records upload while PumpShield is open and connected.
          </p>
        )}
        {!queue.online && waiting === 0 && (
          <p role="status">
            {queue.prepared
              ? "Save fuel parchis, arrival audits and shift readings here."
              : "Open the station online to prepare this device."}
          </p>
        )}
        {queue.online &&
          !queue.problem &&
          waiting === 0 &&
          reviewing.length === 0 && (
            <p role="status">
              {queue.prepared
                ? "This device can save fuel parchis, arrival audits and shift readings."
                : "Keep the station open while PumpShield prepares this device."}
            </p>
          )}
        {reviewing.map((item) => (
          <article key={item.id}>
            <strong>{item.title}</strong>
            <p>{item.error}</p>
            <div className="workspace-sync-actions">
              <button
                type="button"
                disabled={!queue.online || queue.syncing}
                onClick={() => {
                  void queue
                    .retry(item)
                    .catch(() => toast.error("Unable to retry yet."));
                }}
              >
                Retry
              </button>
              <button
                type="button"
                disabled={queue.syncing}
                onClick={() => {
                  if (
                    window.confirm("Discard the saved copy from this device?")
                  )
                    void queue
                      .discard(item)
                      .catch(() => toast.error("Unable to discard the copy."));
                }}
              >
                Discard copy
              </button>
            </div>
          </article>
        ))}
        {queue.legacy && (
          <a href="/offline/recovery">Recover previous device drafts</a>
        )}
        {onRefresh && (
          <button
            className="workspace-sync-refresh"
            type="button"
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshCw size={15} />{" "}
            {refreshing ? "Refreshing…" : "Refresh records"}
          </button>
        )}
      </div>
    </details>
  );
}
