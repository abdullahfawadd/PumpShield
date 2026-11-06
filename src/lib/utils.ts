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
export const date = (value: string) =>
  new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
