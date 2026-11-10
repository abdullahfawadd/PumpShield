import type { Delivery, Shift } from "./types";

export type OverviewPeriod = 7 | 30;
export type OverviewDay = {
  /** Calendar date in the station's Pakistan time zone. */
  date: string;
  liters: number;
  revenue: number;
  shiftIds: string[];
};

const pakistanDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Karachi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function dateKey(timestamp: number): string {
  const parts = pakistanDate.formatToParts(timestamp);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Read-only analytics over the records already loaded for the selected station.
 * An absent bucket means no loaded observation, rather than zero fuel sold.
 */
export function buildOverviewModel({
  shifts,
  deliveries,
  days,
  now,
}: {
  shifts: Shift[];
  deliveries: Delivery[];
  days: OverviewPeriod;
  now: number;
}) {
  if (!Number.isFinite(now))
    throw new RangeError("Invalid reporting timestamp");
  if (days !== 7 && days !== 30)
    throw new RangeError("Invalid reporting period");
  const endDate = dateKey(now);
  const startDate = new Date(
    Date.parse(`${endDate}T00:00:00Z`) - (days - 1) * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const start = Date.parse(`${startDate}T00:00:00+05:00`);
  let excludedInvalidRecords = 0;
  const periodShifts = shifts.filter((shift) => {
    if (shift.status === "open" || !shift.result) return false;
    const timestamp = Date.parse(shift.closed_at);
    if (
      !Number.isFinite(timestamp) ||
      ![
        shift.result.liters,
        shift.result.revenue,
        shift.result.cash,
        shift.result.pos,
        shift.result.credit,
      ].every(Number.isFinite)
    ) {
      excludedInvalidRecords += 1;
      return false;
    }
    return timestamp >= start && timestamp <= now;
  });
  const buckets = new Map<string, OverviewDay>();
  const totals = { liters: 0, revenue: 0, cash: 0, pos: 0, credit: 0 };
  for (const shift of periodShifts) {
    const result = shift.result!;
    const key = dateKey(Date.parse(shift.closed_at));
    const bucket = buckets.get(key) || {
      date: key,
      liters: 0,
      revenue: 0,
      shiftIds: [],
    };
    bucket.liters += result.liters;
    bucket.revenue += result.revenue;
    bucket.shiftIds.push(shift.id);
    buckets.set(key, bucket);
    totals.liters += result.liters;
    totals.revenue += result.revenue;
    totals.cash += result.cash;
    totals.pos += result.pos;
    totals.credit += result.credit;
  }
  const reviewDeliveries = deliveries.filter(
    (item) => item.status === "submitted",
  );
  const reviewShifts = shifts.filter((item) => item.status === "review");
  const stages = (
    [
      ["dispatched", "In transit"],
      ["submitted", "Arrival review"],
      ["approved", "Ready to receive"],
      ["decanted", "Received"],
    ] as const
  ).map(([status, label]) => ({
    status,
    label,
    count: deliveries.filter((item) => item.status === status).length,
  }));
  return {
    days: [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)),
    totals,
    periodShifts,
    review: {
      deliveries: reviewDeliveries,
      shifts: reviewShifts,
      count: reviewDeliveries.length + reviewShifts.length,
    },
    stages,
    startDate,
    endDate,
    excludedInvalidRecords,
  };
}

export const OVERVIEW_WIDGETS = [
  "deliveries",
  "performance",
  "stock",
  "activity",
] as const;
export type OverviewWidget = (typeof OVERVIEW_WIDGETS)[number];
export type OverviewLayout = {
  version: 1;
  order: OverviewWidget[];
  hidden: OverviewWidget[];
};

export function defaultOverviewLayout(): OverviewLayout {
  return { version: 1, order: [...OVERVIEW_WIDGETS], hidden: [] };
}
const isWidget = (value: unknown): value is OverviewWidget =>
  typeof value === "string" &&
  (OVERVIEW_WIDGETS as readonly string[]).includes(value);
const widgetList = (value: unknown) =>
  Array.isArray(value) ? [...new Set(value.slice(0, 32).filter(isWidget))] : [];

/** Only presentation identifiers are retained; operational data is never stored. */
export function parseOverviewLayout(value: unknown): OverviewLayout {
  if (typeof value === "string") {
    if (value.length > 4096) return defaultOverviewLayout();
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return defaultOverviewLayout();
    }
  }
  if (!value || typeof value !== "object" || !("version" in value))
    return defaultOverviewLayout();
  if (value.version !== 1) return defaultOverviewLayout();
  const order = widgetList("order" in value ? value.order : undefined);
  const hidden = widgetList("hidden" in value ? value.hidden : undefined);
  return {
    version: 1,
    order: [
      ...order,
      ...OVERVIEW_WIDGETS.filter((item) => !order.includes(item)),
    ],
    hidden,
  };
}

export function setOverviewWidgetVisible(
  layout: OverviewLayout,
  id: OverviewWidget,
  visible: boolean,
): OverviewLayout {
  const safe = parseOverviewLayout(layout);
  if (!isWidget(id)) return safe;
  return {
    ...safe,
    hidden: visible
      ? safe.hidden.filter((item) => item !== id)
      : [...new Set([...safe.hidden, id])],
  };
}

export function moveOverviewWidget(
  layout: OverviewLayout,
  id: OverviewWidget,
  direction: -1 | 1,
): OverviewLayout {
  const safe = parseOverviewLayout(layout);
  if (!isWidget(id) || (direction !== -1 && direction !== 1)) return safe;
  const index = safe.order.indexOf(id);
  const next = index + direction;
  if (next < 0 || next >= safe.order.length) return safe;
  [safe.order[index], safe.order[next]] = [safe.order[next], safe.order[index]];
  return safe;
}
