import { z } from "zod";
import { FUEL_GRADES } from "./fuel-grades";

// Preserve decimal strings from forms. SQL remains the authoritative parser and
// validates direct RPC callers; this contract provides precise HTTP feedback.
const numeric = z.union([
  z.number().finite(),
  z
    .string()
    .trim()
    .max(100)
    .regex(/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/)
    .refine((value) => Number.isFinite(Number(value)), "Enter a finite number"),
]);
const numberBetween = (min: number, max = Number.MAX_VALUE) =>
  numeric.refine(
    (value) => Number(value) >= min && Number(value) <= max,
    `Enter a number between ${min} and ${max}`,
  );
const positive = numeric.refine(
  (value) => Number(value) > 0,
  "Enter a number above zero",
);
const nonnegative = numberBetween(0);
const uuid = z.uuid();
const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
const grade = z.enum(FUEL_GRADES);
const dateTime = z
  .string()
  .max(80)
  .refine(
    (value) => Number.isFinite(Date.parse(value)),
    "Enter a valid date and time",
  );
const station = { station_id: uuid };
const record = { ...station, id: uuid };
const chart = z
  .array(z.object({ mm: nonnegative, liters: nonnegative }))
  .min(2)
  .max(10000);
// FormData callers include harmless chart_N helper fields. Known operation
// fields are validated; additional fields never acquire mutation authority.
const payload = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).passthrough();
const operation = <T extends string, S extends z.ZodRawShape>(
  op: T,
  shape: S,
) => z.object({ op: z.literal(op), p: payload(shape) });

export const commandInput = z.discriminatedUnion("op", [
  operation("join", {
    name: text(100, 2),
    person: text(100, 2),
    intent: z.literal("create_workspace"),
  }),
  operation("accept_invite", { invitation_id: uuid }),
  operation("decline_invite", { invitation_id: uuid }),
  operation("station", { name: text(100, 2), omc: text(80), city: text(80) }),
  operation("tank", {
    ...station,
    name: text(100),
    grade,
    capacity: positive,
    dip: nonnegative,
    chart,
  }),
  operation("nozzle", {
    ...station,
    tank_id: uuid,
    name: text(100),
    totalizer: nonnegative,
  }),
  operation("price", {
    ...station,
    grade,
    price: positive,
    beta: numberBetween(0, 0.01),
    margin: positive,
    effective_at: dateTime,
    source: text(1000),
  }),
  operation("invite", {
    ...station,
    name: text(100, 2),
    email: z.email().max(254),
  }),
  operation("revoke", { id: uuid }),
  operation("cancel_invite", { id: uuid }),
  operation("evidence", {
    ...station,
    path: text(2000),
    captured_at: dateTime,
    latitude: numberBetween(-90, 90),
    longitude: numberBetween(-180, 180),
    accuracy: nonnegative,
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
  }),
  operation("delivery", {
    ...station,
    tank_id: uuid,
    reference: text(250),
    vehicle: text(250),
    depot: text(250),
    invoice: positive,
    loading_temp: numberBetween(-20, 80),
    chambers: z.array(chart).min(1).max(8),
  }),
  operation("submit_delivery", {
    ...record,
    arrival_temp: numberBetween(-20, 80),
    dips: z.array(nonnegative).min(1).max(8),
    evidence_id: uuid,
  }),
  operation("approve_delivery", record),
  operation("decant", record),
  operation("open_shift", { ...station, name: text(100) }),
  operation("close_shift", {
    ...record,
    nozzles: z
      .array(
        z.object({
          id: uuid,
          closing: nonnegative,
          testing: nonnegative,
          evidence_id: uuid,
        }),
      )
      .min(1)
      .max(100),
    tanks: z
      .array(z.object({ id: uuid, dip: nonnegative, evidence_id: uuid }))
      .min(1)
      .max(100),
    cash: nonnegative,
    pos: nonnegative,
    pos_evidence_id: uuid.nullish(),
  }),
  operation("review_shift", { ...record, note: text(4000, 3) }),
  operation("account", {
    ...station,
    name: text(250, 2),
    credit_limit: positive,
  }),
  operation("vehicle", {
    ...station,
    account_id: uuid,
    registration: text(250),
    grade,
    max_liters: positive,
  }),
  operation("disable_vehicle", { ...station, id: uuid }),
  operation("payment", {
    ...station,
    account_id: uuid,
    amount: positive,
    reference: text(250),
  }),
  operation("parchi", {
    ...station,
    nozzle_id: uuid,
    liters: positive,
    token: uuid,
    evidence_id: uuid,
    request_id: uuid,
  }),
]);

export type CommandInput = z.infer<typeof commandInput>;
