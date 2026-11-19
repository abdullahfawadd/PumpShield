"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FieldError, field } from "@/lib/field-api";
import type { DraftKind, FieldContext } from "@/lib/offline-types";
import {
  resetWorkspaceLease,
  resumeWorkspaceDevice,
  vaultMeta,
} from "@/lib/offline-vault";
import { Brand } from "./brand";
import { OfflineDraftForm } from "./offline-draft-form";
import {
  useWorkspaceOffline,
  WorkspaceOfflineProvider,
  WorkspaceSyncStatus,
} from "./workspace-offline";

const views = [
  { value: "credit", task: "parchi", label: "Fuel parchi" },
  { value: "deliveries", task: "submit_delivery", label: "Arrival audit" },
  { value: "shifts", task: "close_shift", label: "Close shift" },
] as const;
type Boot = {
  session: Awaited<ReturnType<typeof resumeWorkspaceDevice>>;
  task: DraftKind;
  delivery?: string;
  recovery: boolean;
};

export function OfflineWorkspace() {
  const [boot, setBoot] = useState<Boot | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const location = new URL(window.location.href);
    const station = location.searchParams.get("station") || undefined;
    const task =
      views.find(({ value }) => value === location.searchParams.get("view"))
        ?.task || "parchi";
    const delivery =
      location.searchParams.get("record") === "delivery"
        ? location.searchParams.get("id") || undefined
        : undefined;
    async function open() {
      let session = await resumeWorkspaceDevice(station, signal).catch(
        () => null,
      );
      const recovery = !!(await vaultMeta(signal).catch(() => null));
      if (session && navigator.onLine) {
        try {
          const context = await field<FieldContext>(
            "context",
            {
              station_id: session.context.station.id,
            },
            AbortSignal.any([signal, AbortSignal.timeout(6_000)]),
          );
          if (
            context.user_id !== session.context.user_id ||
            context.workspace_id !== session.context.workspace_id
          ) {
            session = null;
            await resetWorkspaceLease().catch(() => {});
          }
        } catch (error) {
          if (error instanceof FieldError && error.status < 500) {
            if (error.status === 401)
              await resetWorkspaceLease().catch(() => {});
            session = null;
          }
        }
      }
      if (!signal.aborted) setBoot({ session, task, delivery, recovery });
    }
    void open();
    return () => controller.abort();
  }, []);
  const session = boot?.session;
  return (
    <main id="main" className="offline-station-view">
      <header className="offline-station-topbar">
        <Brand />
        <a href="/app">Open workspace</a>
      </header>
      {session ? (
        <WorkspaceOfflineProvider
          initial={session}
          userId={session.device.user_id}
          workspaceId={session.device.workspace_id}
        >
          <SavedStation task={boot.task} delivery={boot.delivery} />
        </WorkspaceOfflineProvider>
      ) : (
        <div className="offline-station-message" role="status">
          <h1>{boot ? "Connect to open your station" : "Opening station…"}</h1>
          {boot && (
            <p>Open PumpShield online before using it without a connection.</p>
          )}
          {boot?.recovery && (
            <a href="/offline/recovery">Recover previous device drafts</a>
          )}
        </div>
      )}
    </main>
  );
}

function SavedStation({
  task,
  delivery,
}: {
  task: DraftKind;
  delivery?: string;
}) {
  const queue = useWorkspaceOffline();
  const [selected, setSelected] = useState(task);
  const [dirty, setDirty] = useState(false);
  if (!queue?.context)
    return (
      <div className="offline-station-message" role="status">
        <h1>Sign in to open your station</h1>
        <a href="/login">Sign in</a>
      </div>
    );
  return (
    <section className="offline-station-content">
      <div className="offline-station-heading">
        <div>
          <h1>{queue.context.station.name}</h1>
          <p role="status">
            {queue.online
              ? "Connection available"
              : "Working without a connection"}
          </p>
        </div>
        <WorkspaceSyncStatus />
      </div>
      <nav aria-label="Station tasks" className="offline-station-nav">
        {views.map((view) => (
          <button
            key={view.value}
            type="button"
            aria-pressed={selected === view.task}
            onClick={() => {
              if (
                selected !== view.task &&
                dirty &&
                !window.confirm(
                  "Switch tasks? Unsaved readings on this form will be cleared.",
                )
              )
                return;
              if (selected !== view.task) setDirty(false);
              setSelected(view.task);
            }}
          >
            {view.label}
          </button>
        ))}
      </nav>
      <OfflineDraftForm
        key={selected}
        task={selected}
        delivery={selected === task ? delivery : undefined}
        context={queue.context}
        onDirty={setDirty}
        onSave={async (draft) => {
          const result = await queue.save(draft);
          toast.success(
            result === "queued" ? "Saved on this device" : "Record posted",
          );
        }}
      />
    </section>
  );
}
