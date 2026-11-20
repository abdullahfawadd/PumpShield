import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const number = (value: number, digits = 0) =>
  new Intl.NumberFormat("en-PK", { maximumFractionDigits: digits }).format(
    value,
  );
export const money = (value: number) => `Rs ${number(value, 2)}`;
const pakistanOffsetMs = 5 * 60 * 60 * 1000;

export function stationTimeInput(snapshot?: string) {
  const recorded = Date.parse(snapshot ?? "");
  const timestamp = Number.isFinite(recorded) ? recorded : Date.now();
  return new Date(timestamp + pakistanOffsetMs).toISOString().slice(0, 16);
}

export function stationTimeInstant(value: string) {
  const timestamp = Date.parse(`${value}+05:00`);
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value) ||
    !Number.isFinite(timestamp)
  ) {
    throw new Error("Enter a valid date and time in PKT.");
  }
  const normalized = new Date(timestamp + pakistanOffsetMs)
    .toISOString()
    .slice(0, 16);
  if (normalized !== value)
    throw new Error("Enter a valid date and time in PKT.");
  return new Date(timestamp).toISOString();
}

export const date = (value: string) =>
  new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
