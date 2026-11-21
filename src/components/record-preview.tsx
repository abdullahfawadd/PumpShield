"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ReportData } from "@/lib/report-pdf";
import { Download } from "./icons";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";

type PreviewState =
  | { kind: "loading" | "error" }
  | { kind: "photo"; src: string }
  | { kind: "report"; data: ReportData };

export function RecordPreviewLink({
  href,
  title,
  photo = false,
  className,
  label,
  children,
}: {
  href: string;
  title: string;
  photo?: boolean;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  const [entry, setEntry] = useState<string | null>(null);
  useEffect(() => {
    if (!entry) return;
    const returnToRecord = (event: PopStateEvent) => {
      if (event.state?.pumpShieldPreview !== entry) setEntry(null);
    };
    window.addEventListener("popstate", returnToRecord);
    return () => window.removeEventListener("popstate", returnToRecord);
  }, [entry]);

  return (
    <>
      <a
        href={href}
        className={className}
        aria-haspopup="dialog"
        aria-label={label}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          event.preventDefault();
          if (entry) return;
          const id = crypto.randomUUID();
          // A same-page entry gives browser/Android Back one step for the preview
          // while keeping the workspace URL and the underlying panel mounted.
          window.history.pushState({ pumpShieldPreview: id }, "");
          event.currentTarget.focus({ preventScroll: true });
          setEntry(id);
        }}
      >
        {children}
      </a>
      {entry && (
        <Dialog
          open
          title={title}
          variant="record-preview"
          onOpenChange={(open) => {
            if (open) return;
            if (window.history.state?.pumpShieldPreview === entry) {
              window.history.back();
            } else {
              setEntry(null);
            }
          }}
        >
          <RecordPreview href={href} title={title} photo={photo} />
        </Dialog>
      )}
    </>
  );
}

function RecordPreview({
  href,
  title,
  photo,
}: {
  href: string;
  title: string;
  photo: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PreviewState>({ kind: "loading" });

  useEffect(() => {
    const request = new AbortController();
    let objectUrl: string | undefined;
    async function load() {
      try {
        const response = await fetch(`${href}?format=preview`, {
          cache: "no-store",
          signal: request.signal,
        });
        if (!response.ok) throw new Error("Preview request failed");
        if (photo) {
          const image = await response.blob();
          if (!image.type.startsWith("image/"))
            throw new Error("Invalid photo");
          if (request.signal.aborted) return;
          objectUrl = URL.createObjectURL(image);
          setState({ kind: "photo", src: objectUrl });
        } else {
          const data: ReportData = await response.json();
          if (!request.signal.aborted) setState({ kind: "report", data });
        }
      } catch {
        if (!request.signal.aborted) setState({ kind: "error" });
      }
    }
    void load();
    return () => {
      request.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attempt, href, photo]);

  if (state.kind === "loading")
    return (
      <p className="record-preview-message" role="status">
        Loading preview…
      </p>
    );

  if (state.kind === "error")
    return (
      <div className="record-preview-message">
        <p role="status">
          Preview unavailable. Check your connection and try again.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setState({ kind: "loading" });
            setAttempt((count) => count + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );

  if (state.kind === "photo")
    return (
      <div className="record-preview-photo">
        {/* eslint-disable-next-line @next/next/no-img-element -- A private object URL is loaded only for the open preview. */}
        <img
          src={state.src}
          alt={title}
          onError={() => setState({ kind: "error" })}
        />
      </div>
    );

  if (state.kind !== "report") return null;
  const { data } = state;
  const traceLabel = (label: string) =>
    label === "Evidence record" || label === "Shift record";
  const traceRows = data.rows.filter((row) => traceLabel(row.label));
  const renderRow = (row: ReportData["rows"][number], index: number) => (
    <div key={index}>
      <dt>{row.label}</dt>
      <dd>{row.value}</dd>
    </div>
  );
  return (
    <>
      <div className="record-preview-actions">
        <span>{data.reference}</span>
        <a
          href={`${href}?format=download`}
          download
          className="button button-primary"
        >
          <Download size={16} aria-hidden="true" /> Download PDF
        </a>
      </div>
      <article className="record-preview-report" aria-label={data.title}>
        {data.sample && (
          <strong className="record-preview-sample">
            Design Lab · Synthetic data
          </strong>
        )}
        <header>
          <h3>{data.station}</h3>
          <p>
            {data.location} · {data.issued}
          </p>
        </header>
        <dl className="record-preview-rows">
          {data.rows.filter((row) => !traceLabel(row.label)).map(renderRow)}
          <div className="record-preview-total">
            <dt>{data.total.label}</dt>
            <dd>{data.total.value}</dd>
          </div>
        </dl>
        {traceRows.length > 0 && (
          <details className="record-preview-trace">
            <summary>Record references</summary>
            <dl className="record-preview-rows">{traceRows.map(renderRow)}</dl>
          </details>
        )}
        <ul className="record-preview-notes">
          {data.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </article>
    </>
  );
}
