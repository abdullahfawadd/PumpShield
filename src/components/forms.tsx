"use client";
import { useRef, useState } from "react";
import { Loader2 } from "@/components/icons";
import { toast } from "sonner";
import { command } from "@/lib/api";
import { Button } from "./ui/button";
import { isFieldDraftKind, useWorkspaceOffline } from "./workspace-offline";
export function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required = true,
  min,
  max,
  step,
  minLength,
  maxLength,
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string | number;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        min={min}
        max={max}
        step={step || (type === "number" ? "any" : undefined)}
        minLength={minLength}
        maxLength={maxLength ?? (type === "text" ? 250 : undefined)}
        {...props}
      />
    </label>
  );
}
export function Select({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <label>
      {label}
      <select name={name} required defaultValue={defaultValue || ""}>
        <option value="" disabled>
          Select {label.toLowerCase()}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function ActionForm({
  op,
  base = {},
  transform,
  submitOnline,
  disabled = false,
  children,
  onDone,
  submit = "Save changes",
}: {
  op: string;
  base?: Record<string, unknown>;
  transform?: (form: FormData) => Record<string, unknown>;
  submitOnline?: (payload: Record<string, unknown>) => Promise<unknown>;
  disabled?: boolean;
  children: React.ReactNode;
  onDone: () => void;
  submit?: string;
}) {
  const offline = useWorkspaceOffline();
  const request = useRef<{
    fingerprint: string;
    id: string;
    capturedAt: string;
  }>(null);
  const handling = useRef(false);
  const canQueue = !!offline && isFieldDraftKind(op);
  const disconnected = canQueue && !offline.online;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (handling.current || disabled) return;
    handling.current = true;
    setBusy(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const values = transform
        ? transform(form)
        : Object.fromEntries(form.entries());
      const payload = { ...base, ...values };
      if (offline && isFieldDraftKind(op)) {
        const fingerprint = JSON.stringify(payload);
        if (request.current?.fingerprint !== fingerprint) {
          request.current = {
            fingerprint,
            id: crypto.randomUUID(),
            capturedAt: offline.captureTimestamp(),
          };
        }
        const result = await offline.submit(op, payload, request.current);
        toast.success(
          result === "queued"
            ? "Saved on this device. It will upload when connected."
            : "Saved successfully",
        );
        if (result === "posted") void offline.refreshContext();
      } else {
        if (submitOnline) await submitOnline(payload);
        else await command(op, payload);
        toast.success("Saved successfully");
        void offline?.refreshContext();
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      handling.current = false;
      setBusy(false);
    }
  }
  return (
    <form method="post" className="form-stack" onSubmit={handle}>
      {children}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Button disabled={busy || disabled} type="submit" className="full-width">
        {busy && <Loader2 size={16} className="spin" />}
        {busy ? "Saving…" : disconnected ? "Save on this device" : submit}
      </Button>
    </form>
  );
}
