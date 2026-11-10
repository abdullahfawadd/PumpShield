"use client";
import { useState } from "react";
import { Loader2 } from "@/components/icons";
import { toast } from "sonner";
import { command } from "@/lib/api";
import { Button } from "./ui/button";
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
  children,
  onDone,
  submit = "Save changes",
}: {
  op: string;
  base?: Record<string, unknown>;
  transform?: (form: FormData) => Record<string, unknown>;
  children: React.ReactNode;
  onDone: () => void;
  submit?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const values = transform
        ? transform(form)
        : Object.fromEntries(form.entries());
      await command(op, { ...base, ...values });
      toast.success("Saved successfully");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-stack" onSubmit={handle}>
      {children}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Button disabled={busy} type="submit" className="full-width">
        {busy && <Loader2 size={16} className="spin" />}
        {busy ? "Saving…" : submit}
      </Button>
    </form>
  );
}
export function parseChart(value: string) {
  const rows = value
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((r, i) => !(i === 0 && /mm/i.test(r)));
  const points = rows
    .map((row) => {
      const [mm, liters] = row.split(/[,;\t]/).map(Number);
      if (!Number.isFinite(mm) || !Number.isFinite(liters))
        throw new Error("Use two columns: millimeters,liters.");
      return { mm, liters };
    })
    .sort((a, b) => a.mm - b.mm);
  if (points.length < 2)
    throw new Error(
      "Add at least two calibration points from the certified chart.",
    );
  return points;
}
