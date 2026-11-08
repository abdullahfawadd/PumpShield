export type FieldContext = {
  user_id: string;
  workspace_id: string;
  person: string;
  prepared_at: string;
  expires_at: string;
  station: { id: string; name: string };
  shift: { id: string; name: string; opened_at: string; due_at: string } | null;
  nozzles: {
    id: string;
    name: string;
    tank_id: string;
    totalizer: number;
    grade: string;
  }[];
  tanks: { id: string; name: string; grade: string }[];
  deliveries: {
    id: string;
    reference: string;
    vehicle: string;
    chamber_count: number;
  }[];
};
export type DraftKind = "parchi" | "submit_delivery" | "close_shift";
import type { StoredEvidence } from "./evidence-capture";
export type FieldDraft = {
  id: string;
  user_id: string;
  workspace_id: string;
  station_id: string;
  shift_id: string | null;
  kind: DraftKind;
  captured_at: string;
  title: string;
  payload: Record<string, unknown>;
  evidence: Record<string, StoredEvidence>;
  state: "pending" | "review" | "posted";
  error?: string;
  result?: { id: string };
};
