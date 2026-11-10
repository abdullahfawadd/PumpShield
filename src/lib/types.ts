import type { FuelGrade } from "./fuel-grades";

export type Member = {
  user_id: string;
  workspace_id: string;
  name: string;
  role: "owner" | "munshi";
  station_id: string | null;
  active: boolean;
};
export type Station = {
  id: string;
  name: string;
  omc: string;
  city: string;
  tolerance: number;
  latitude?: number | null;
  longitude?: number | null;
  geofence_m?: number;
};
export type Tank = {
  id: string;
  station_id: string;
  name: string;
  grade: FuelGrade;
  capacity: number;
  stock: number;
  chart: { mm: number; liters: number }[];
  updated_at: string;
};
export type Nozzle = {
  id: string;
  station_id: string;
  tank_id: string;
  name: string;
  totalizer: number;
};
export type Price = {
  id: string;
  station_id: string;
  grade: FuelGrade;
  price: number;
  beta: number;
  margin: number;
  effective_at: string;
  source: string;
};
export type Delivery = {
  id: string;
  station_id: string;
  tank_id: string;
  reference: string;
  vehicle: string;
  depot: string;
  invoice: number;
  loading_temp: number;
  price: number;
  beta: number;
  chambers: { mm: number; liters: number }[][];
  chamber_count?: number;
  status: "dispatched" | "submitted" | "approved" | "decanted";
  measured: number | null;
  allowance: number | null;
  shortage: number | null;
  claim: number | null;
  measurement: {
    arrival_temp: number;
    dips: number[];
    evidence_id: string;
    offline_request_id?: string;
    offline_captured_at?: string;
  } | null;
  created_at: string;
  submitted_at: string;
  approved_at: string;
  decanted_at: string;
};
export type Shift = {
  id: string;
  station_id: string;
  name: string;
  status: "open" | "review" | "verified";
  opened_at: string;
  due_at: string;
  closed_at: string;
  opening: { nozzles: Nozzle[] };
  result: {
    liters: number;
    revenue: number;
    cash: number;
    pos: number;
    credit: number;
    expected_cash: number;
    cash_variance: number;
    late: boolean;
    tanks: {
      tank_id: string;
      name: string;
      grade: FuelGrade;
      sold: number;
      delivered: number;
      expected: number;
      actual: number;
      variance: number;
      price: number;
    }[];
  } | null;
  submission: {
    nozzles: {
      id: string;
      closing: number;
      testing: number;
      evidence_id: string;
    }[];
    tanks: { id: string; dip: number; evidence_id: string }[];
    pos_evidence_id?: string;
    offline_request_id?: string;
    offline_captured_at?: string;
  } | null;
  review_note: string | null;
};
export type Account = {
  id: string;
  station_id: string;
  name: string;
  credit_limit: number;
  balance: number;
};
export type Vehicle = {
  id: string;
  account_id: string;
  registration: string;
  grade: FuelGrade;
  max_liters: number;
  token: string;
  active: boolean;
};
export type Parchi = {
  id: string;
  station_id: string;
  account_id: string;
  vehicle_id: string;
  shift_id: string;
  liters: number;
  price: number;
  amount: number;
  offline_captured_at?: string;
  offline_request_id?: string;
  created_at: string;
};
export type Dashboard = {
  member: Member | null;
  workspace: string;
  stations: Station[];
  tanks: Tank[];
  nozzles: Nozzle[];
  prices: Price[];
  deliveries: Delivery[];
  shifts: Shift[];
  accounts: Account[];
  vehicles: Vehicle[];
  parchis: Parchi[];
  members: Member[];
  invitations: {
    id: string;
    name: string;
    email: string;
    station_id: string;
  }[];
  events: {
    id: number;
    action: string;
    subject_id: string;
    created_at: string;
  }[];
};
