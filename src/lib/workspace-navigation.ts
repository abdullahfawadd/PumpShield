import type { Dashboard } from "./types";

export const workspaceViews = [
  "overview",
  "deliveries",
  "shifts",
  "credit",
  "stock",
  "settings",
  "operations",
  "documents",
] as const;
export type WorkspaceView = (typeof workspaceViews)[number];
const staffViews: readonly WorkspaceView[] = [
  "overview",
  "deliveries",
  "shifts",
  "credit",
  "operations",
];
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readWorkspaceLocation(search: string, data: Dashboard) {
  const p = new URLSearchParams(search);
  const requested = p.get("view") as WorkspaceView;
  const allowed = data.member?.role === "owner" ? workspaceViews : staffViews;
  const view = allowed.includes(requested) ? requested : "overview";
  const station =
    data.stations.find((s) => s.id === p.get("station"))?.id ||
    data.stations[0]?.id ||
    "";
  const record = p.get("record"),
    id = p.get("id");
  let modal: { type: string; id: string } | null = null;
  if (id && uuid.test(id)) {
    if (
      record === "delivery" &&
      data.deliveries.some((r) => r.id === id && r.station_id === station)
    )
      modal = { type: "delivery_detail", id };
    if (
      record === "shift" &&
      data.shifts.some((r) => r.id === id && r.station_id === station)
    )
      modal = { type: "shift_detail", id };
    if (
      record === "account" &&
      data.member?.role === "owner" &&
      data.accounts.some((r) => r.id === id && r.station_id === station)
    )
      modal = { type: "account_detail", id };
  }
  return { view, station, modal, query: (p.get("q") || "").slice(0, 250) };
}

/** Only presentation state belongs here: never credentials, signed URLs or posting payloads. */
export function updateWorkspaceLocation(
  values: Record<string, string | null>,
  replace = false,
) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (url.href === window.location.href) return;
  window.history[replace ? "replaceState" : "pushState"]({}, "", url);
  window.dispatchEvent(new Event("pumpshield:navigate"));
}
export function subscribeWorkspaceLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("pumpshield:navigate", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("pumpshield:navigate", callback);
  };
}
export const workspaceLocationSnapshot = () => window.location.search;
export const workspaceServerSnapshot = () => "";
