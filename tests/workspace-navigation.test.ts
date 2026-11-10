import { describe, expect, it } from "vitest";
import type { Dashboard } from "../src/lib/types";
import { readWorkspaceLocation } from "../src/lib/workspace-navigation";
const station = "11111111-1111-4111-8111-111111111111";
const otherStation = "22222222-2222-4222-8222-222222222222";
const delivery = "33333333-3333-4333-8333-333333333333";
const account = "44444444-4444-4444-8444-444444444444";
const fixture = (role: "owner" | "munshi") =>
  ({
    member: { role },
    stations: [{ id: station }, { id: otherStation }],
    deliveries: [{ id: delivery, station_id: station }],
    shifts: [],
    accounts: [{ id: account, station_id: station }],
  }) as unknown as Dashboard;
describe("workspace deep links", () => {
  it("preserves an authorized delivery and station across a reload", () => {
    expect(
      readWorkspaceLocation(
        `?view=deliveries&station=${station}&record=delivery&id=${delivery}&q=TKA`,
        fixture("owner"),
      ),
    ).toMatchObject({
      view: "deliveries",
      station,
      modal: { type: "delivery_detail", id: delivery },
      query: "TKA",
    });
  });
  it("does not resolve a record through a different station", () => {
    expect(
      readWorkspaceLocation(
        `?view=deliveries&station=${otherStation}&record=delivery&id=${delivery}`,
        fixture("owner"),
      ).modal,
    ).toBeNull();
  });
  it("rejects owner views and account details for staff", () => {
    expect(
      readWorkspaceLocation(
        `?view=settings&record=account&id=${account}`,
        fixture("munshi"),
      ),
    ).toMatchObject({ view: "overview", modal: null });
  });
  it("falls back safely for unknown views/stations and malformed record IDs", () => {
    expect(
      readWorkspaceLocation(
        "?view=bogus&station=bogus&record=delivery&id=bogus",
        fixture("owner"),
      ),
    ).toMatchObject({ view: "overview", station, modal: null });
  });
});
