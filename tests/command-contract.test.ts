import { describe, expect, it } from "vitest";
import { commandInput } from "../src/lib/command-contract";

const id = "68be9fea-1841-4dc9-9e85-1209dc2176cd";
const request = (closing: unknown, cash: unknown = "300.25") => ({
  op: "close_shift",
  p: {
    station_id: id,
    id,
    nozzles: [{ id, closing, testing: 0, evidence_id: id }],
    tanks: [{ id, dip: 1200.5, evidence_id: id }],
    cash,
    pos: 0,
    pos_evidence_id: null,
  },
});

describe("operation-specific command boundary", () => {
  it("preserves legitimate decimal form strings and accepts actual field payloads", () => {
    const result = commandInput.parse(request("152400.125"));
    expect(result.p).toMatchObject({
      cash: "300.25",
      nozzles: [{ closing: "152400.125" }],
    });
    expect(
      commandInput.safeParse({
        op: "delivery",
        p: {
          station_id: id,
          tank_id: id,
          reference: "QA-1",
          vehicle: "QA-2",
          depot: "Keamari",
          invoice: "40000",
          loading_temp: "38.0",
          chambers: [
            [
              { mm: 0, liters: 0 },
              { mm: 2000, liters: 40000 },
            ],
          ],
          chart_0: "legacy CSV input",
        },
      }).success,
    ).toBe(true);
  });
  it("rejects non-finite spellings, coercible empties, booleans and malformed numbers", () => {
    for (const value of [
      "nan",
      "nAn",
      " NaN ",
      "Infinity",
      "-Infinity",
      "1e9999",
      "",
      " ",
      null,
      true,
      [],
      {},
      NaN,
      Infinity,
    ]) {
      expect(
        commandInput.safeParse(request(value)).success,
        String(value),
      ).toBe(false);
      expect(
        commandInput.safeParse(request(100, value)).success,
        String(value),
      ).toBe(false);
    }
  });
  it("requires each operation's domain fields, identities and boundaries", () => {
    expect(
      commandInput.safeParse({
        op: "payment",
        p: { station_id: id, account_id: id, amount: -1, reference: "QA" },
      }).success,
    ).toBe(false);
    expect(
      commandInput.safeParse({
        op: "vehicle",
        p: {
          station_id: id,
          account_id: id,
          registration: "QA",
          grade: "OTHER",
          max_liters: 100,
        },
      }).success,
    ).toBe(false);
    expect(
      commandInput.safeParse({
        op: "submit_delivery",
        p: {
          station_id: id,
          id,
          arrival_temp: 100,
          dips: [1],
          evidence_id: id,
        },
      }).success,
    ).toBe(false);
    expect(commandInput.safeParse({ op: "join", p: {} }).success).toBe(false);
    expect(
      commandInput.safeParse({ op: "accept_invite", p: { invitation_id: id } })
        .success,
    ).toBe(true);
    expect(
      commandInput.safeParse({
        op: "accept_invite",
        p: { invitation_id: "other" },
      }).success,
    ).toBe(false);
  });
});
