import { describe, expect, it } from "vitest";
import type { Delivery, Shift } from "../src/lib/types";
import {
  buildOverviewModel,
  defaultOverviewLayout,
  moveOverviewWidget,
  parseOverviewLayout,
  setOverviewWidgetVisible,
} from "../src/lib/overview-model";

const now = Date.parse("2026-11-09T12:00:00Z");
const shift = (
  id: string,
  closed_at: string,
  overrides: Partial<Shift["result"]> = {},
): Shift => ({
  id,
  station_id: "station",
  name: id,
  status: "verified",
  opened_at: "2026-11-01T00:00:00Z",
  due_at: closed_at,
  closed_at,
  opening: { nozzles: [] },
  result: {
    liters: 100,
    revenue: 25000,
    cash: 18000,
    pos: 5000,
    credit: 2000,
    expected_cash: 18000,
    cash_variance: 0,
    late: false,
    tanks: [],
    ...overrides,
  },
  submission: null,
  review_note: null,
});
const delivery = (status: Delivery["status"]): Delivery =>
  ({ id: status, status }) as Delivery;

describe("station overview observations", () => {
  it("uses Karachi calendar boundaries, includes today, and excludes future observations", () => {
    const model = buildOverviewModel({
      now,
      days: 7,
      deliveries: [],
      shifts: [
        shift("before", "2026-11-02T18:59:59Z"),
        shift("first", "2026-11-02T19:00:00Z"),
        shift("today", "2026-11-09T11:59:59Z"),
        shift("future", "2026-11-09T12:00:01Z"),
      ],
    });
    expect(model.startDate).toBe("2026-11-03");
    expect(model.endDate).toBe("2026-11-09");
    expect(model.periodShifts.map((item) => item.id)).toEqual([
      "first",
      "today",
    ]);
    expect(model.days.map((item) => item.date)).toEqual([
      "2026-11-03",
      "2026-11-09",
    ]);
  });

  it("merges observed shifts without filling absent days, retaining actual zero observations and drilldown IDs", () => {
    const model = buildOverviewModel({
      now,
      days: 7,
      deliveries: [],
      shifts: [
        shift("b", "2026-11-08T08:00:00Z"),
        shift("a", "2026-11-08T07:00:00Z"),
        shift("zero", "2026-11-05T10:00:00Z", {
          liters: 0,
          revenue: 0,
          cash: 0,
          pos: 0,
          credit: 0,
        }),
      ],
    });
    expect(model.days).toEqual([
      { date: "2026-11-05", liters: 0, revenue: 0, shiftIds: ["zero"] },
      { date: "2026-11-08", liters: 200, revenue: 50000, shiftIds: ["b", "a"] },
    ]);
    expect(model.totals).toEqual({
      liters: 200,
      revenue: 50000,
      cash: 36000,
      pos: 10000,
      credit: 4000,
    });
  });

  it("keeps pending reviews independent of the chart period and reports loaded delivery stages", () => {
    const oldReview = {
      ...shift("review", "2026-10-01T08:00:00Z"),
      status: "review" as const,
    };
    const model = buildOverviewModel({
      now,
      days: 7,
      deliveries: [
        delivery("submitted"),
        delivery("approved"),
        delivery("decanted"),
      ],
      shifts: [oldReview],
    });
    expect(model.periodShifts).toEqual([]);
    expect(model.review.count).toBe(2);
    expect(model.review.shifts[0].id).toBe("review");
    expect(model.stages.map((item) => item.count)).toEqual([0, 1, 1, 1]);
  });

  it("does not let malformed legacy observations poison chart sums", () => {
    const model = buildOverviewModel({
      now,
      days: 30,
      deliveries: [],
      shifts: [
        shift("bad-time", "not-a-date"),
        shift("bad-number", "2026-11-08T08:00:00Z", { revenue: NaN }),
        { ...shift("open", "2026-11-08T08:00:00Z"), status: "open" },
        shift("valid", "2026-11-08T08:00:00Z"),
      ],
    });
    expect(model.excludedInvalidRecords).toBe(2);
    expect(model.totals.revenue).toBe(25000);
    expect(model.periodShifts.map((item) => item.id)).toEqual(["valid"]);
  });
});

describe("overview presentation preferences", () => {
  it("retains only unique allowed identifiers and appends missing widgets", () => {
    const input = {
      version: 1,
      order: ["activity", "review", "activity", "stock"],
      hidden: ["review", "stock", "stock", "customer-account"],
      privateBalance: 999999,
    };
    expect(parseOverviewLayout(JSON.stringify(input))).toEqual({
      version: 1,
      order: ["activity", "stock", "deliveries", "performance"],
      hidden: ["stock"],
    });
  });

  it("fails safely for malformed, oversized, and incompatible preferences", () => {
    for (const value of [
      null,
      "{",
      "x".repeat(4097),
      { version: 2, hidden: ["stock"] },
      [],
    ]) {
      expect(parseOverviewLayout(value)).toEqual(defaultOverviewLayout());
    }
  });

  it("moves and hides widgets immutably with boundary protection", () => {
    const initial = defaultOverviewLayout();
    const moved = moveOverviewWidget(initial, "performance", -1);
    expect(moved.order).toEqual([
      "performance",
      "deliveries",
      "stock",
      "activity",
    ]);
    expect(initial).toEqual(defaultOverviewLayout());
    expect(moveOverviewWidget(moved, "performance", -1)).toEqual(moved);
    const hidden = setOverviewWidgetVisible(moved, "stock", false);
    expect(hidden.hidden).toEqual(["stock"]);
    expect(setOverviewWidgetVisible(hidden, "stock", true).hidden).toEqual([]);
    expect(setOverviewWidgetVisible(initial, "review" as never, false)).toEqual(
      initial,
    );
  });
});
