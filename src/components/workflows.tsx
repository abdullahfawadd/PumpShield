"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  ClipboardCheck,
  Download,
  ExternalLink,
  Fuel,
  LockKeyhole,
  Plus,
  QrCode,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { command } from "@/lib/api";
import { date, money, number } from "@/lib/utils";
import type { Dashboard, Delivery, Shift, Vehicle } from "@/lib/types";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { ActionForm, Field, Select, parseChart } from "./forms";
import { CameraCapture } from "./camera";
import { ContractorTracking } from "./tracking";
export type Modal = { type: string; id?: string };
const names: Record<string, string> = {
  station: "A new station. A clearer picture.",
  tank: "Configure an underground tank",
  nozzle: "Connect a nozzle",
  price: "Record a verified fuel price",
  invite: "Give your Munshi the right access",
  revoke: "Revoke Munshi access",
  delivery: "Register an incoming delivery",
  delivery_detail: "Delivery verification",
  open_shift: "Start with a locked baseline",
  close_shift: "Close your shift with confidence",
  shift_detail: "Shift reconciliation",
  account: "A new corporate relationship",
  account_detail: "Vehicles & QR credentials",
  vehicle: "Authorize a vehicle",
  payment: "Record a credit payment",
  parchi: "A paperless, accountable fill",
};
const grades = [
  { value: "MS", label: "MS · Petrol" },
  { value: "HSD", label: "HSD · Diesel" },
];
export function WorkflowDialog({
  modal,
  data,
  stationId,
  privateMode,
  onClose,
  onDone,
  onNavigate,
}: {
  modal: Modal;
  data: Dashboard;
  stationId: string;
  privateMode: boolean;
  onClose: () => void;
  onDone: () => void;
  onNavigate: (m: Modal) => void;
}) {
  const tanks = data.tanks.filter((t) => t.station_id === stationId);
  const nozzles = data.nozzles.filter((n) => n.station_id === stationId);
  const d = data.deliveries.find((d) => d.id === modal.id);
  const shift = data.shifts.find((s) => s.id === modal.id);
  const account = data.accounts.find((a) => a.id === modal.id);
  const [csv, setCsv] = useState("");
  const [count, setCount] = useState(1);
  const base = { station_id: stationId };
  const owner = data.member!.role === "owner";
  const priceTime = () => {
    const dt = new Date();
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 16);
  };
  const price = (v: number) => (privateMode ? "Rs ••••••" : money(v));
  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={names[modal.type] || "Station operation"}
      description={
        modal.type === "close_shift"
          ? "Submitted readings are permanent. Check the numbers and capture fresh evidence before submitting."
          : modal.type === "invite"
            ? "Authorize an email address. Your Munshi signs up with that exact email and confirms it to receive access."
            : "Real records. Clear accountability."
      }
    >
      {modal.type === "station" && (
        <ActionForm op="station" onDone={onDone} submit="Add station">
          <Field
            label="Station name"
            name="name"
            placeholder="e.g. Your station name"
          />
          <div className="form-grid">
            <Select
              label="Oil marketing company"
              name="omc"
              options={[
                "PSO",
                "PARCO Gunvor",
                "Wafi / Shell",
                "APL",
                "GO",
                "Other",
              ].map((s) => ({ value: s, label: s }))}
            />
            <Field label="City" name="city" placeholder="e.g. Karachi" />
          </div>
        </ActionForm>
      )}
      {modal.type === "tank" && (
        <ActionForm
          op="tank"
          base={base}
          onDone={onDone}
          submit="Save calibrated tank"
          transform={(f) => ({
            ...Object.fromEntries(f),
            chart: parseChart(csv),
          })}
        >
          <div className="form-grid">
            <Field
              label="Tank name"
              name="name"
              placeholder="e.g. Petrol tank 01"
            />
            <Select label="Fuel grade" name="grade" options={grades} />
            <Field
              label="Capacity (litres)"
              name="capacity"
              type="number"
              min={1}
            />
            <Field label="Current dip (mm)" name="dip" type="number" min={0} />
          </div>
          <label>
            Certified calibration chart (CSV)
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 100000) {
                    toast.error("Chart must be under 100 KB");
                    return;
                  }
                  setCsv(await file.text());
                }
              }}
            />
          </label>
          <label>
            Millimetres, litres
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={7}
              placeholder={
                "mm,liters\nPaste values from your certified tank chart"
              }
              required
            />
          </label>
          <div className="notice">
            Use the tank’s certified chart. Values between chart points use
            linear interpolation. Out-of-range dips are rejected; no generic
            cylinder estimate is substituted.
          </div>
        </ActionForm>
      )}
      {modal.type === "nozzle" && (
        <ActionForm op="nozzle" base={base} onDone={onDone} submit="Add nozzle">
          <Field label="Nozzle name" name="name" placeholder="e.g. Nozzle 01" />
          <Select
            label="Source tank"
            name="tank_id"
            options={tanks.map((t) => ({
              value: t.id,
              label: `${t.name} · ${t.grade}`,
            }))}
          />
          <Field
            label="Current totalizer (litres)"
            name="totalizer"
            type="number"
            min={0}
          />
          <p className="fine-print">
            Equipment changes are blocked while a shift is open.
          </p>
        </ActionForm>
      )}
      {modal.type === "price" && (
        <ActionForm
          op="price"
          base={base}
          onDone={onDone}
          submit="Record fuel price"
          transform={(f) => ({
            ...Object.fromEntries(f),
            effective_at: new Date(String(f.get("effective_at"))).toISOString(),
          })}
        >
          <div className="form-grid">
            <Select label="Fuel grade" name="grade" options={grades} />
            <Field
              label="Retail price (PKR / L)"
              name="price"
              type="number"
              min={0.01}
            />
            <Field
              label="Dealer margin (PKR / L)"
              name="margin"
              type="number"
              min={0.01}
            />
            <Field
              label="Thermal coefficient (per °C)"
              name="beta"
              type="number"
              min={0}
              max={0.01}
              step={0.000001}
            />
          </div>
          <Field
            label="Effective time (your device’s local time)"
            name="effective_at"
            type="datetime-local"
            defaultValue={priceTime()}
          />
          <Field
            label="Source / notification reference"
            name="source"
            placeholder="Verified notification reference"
          />
          <div className="notice">
            Enter a coefficient approved for the fuel and measurement standard
            in use. The app calculates a thermal allowance; it does not certify
            legal entitlement to a deduction. Close any affected shift before
            changing its price.
          </div>
        </ActionForm>
      )}
      {modal.type === "invite" && (
        <ActionForm
          op="invite"
          base={base}
          onDone={onDone}
          submit="Authorize this email"
        >
          <Field label="Munshi’s full name" name="name" />
          <Field label="Munshi’s email address" name="email" type="email" />
          <div className="notice">
            <LockKeyhole size={18} />
            <span>
              Access is restricted to{" "}
              {data.stations.find((s) => s.id === stationId)?.name}. No revenue
              ledger, calibration charts, or variance formulas are exposed. No
              invitation email is sent by this action; share the sign-in address
              with your team.
            </span>
          </div>
        </ActionForm>
      )}
      {modal.type === "revoke" && (
        <ActionForm
          op="revoke"
          base={{ id: modal.id }}
          onDone={onDone}
          submit="Revoke access"
        >
          <p>
            {data.members.find((m) => m.user_id === modal.id)?.name} will lose
            workspace access immediately. Their submitted records remain in the
            audit trail.
          </p>
        </ActionForm>
      )}
      {modal.type === "delivery" && (
        <ActionForm
          op="delivery"
          base={base}
          onDone={onDone}
          submit="Create dispatch"
          transform={(f) => ({
            ...Object.fromEntries(f),
            chambers: Array.from({ length: count }, (_, i) =>
              parseChart(String(f.get(`chart_${i}`))),
            ),
          })}
        >
          <div className="form-grid">
            <Field label="Invoice / dispatch reference" name="reference" />
            <Field label="Vehicle registration" name="vehicle" />
            <Field label="Loading depot" name="depot" />
            <Select
              label="Receiving tank"
              name="tank_id"
              options={tanks.map((t) => ({
                value: t.id,
                label: `${t.name} · ${t.grade}`,
              }))}
            />
            <Field
              label="Invoice volume (L)"
              name="invoice"
              type="number"
              min={1}
            />
            <Field
              label="Gantry loading temperature (°C)"
              name="loading_temp"
              type="number"
              min={-20}
              max={80}
            />
          </div>
          <label>
            Number of chambers
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          {Array.from({ length: count }, (_, i) => (
            <label key={i}>
              Chamber {i + 1} certified chart (mm, litres)
              <textarea
                required
                name={`chart_${i}`}
                rows={4}
                placeholder={
                  "mm,liters\nPaste the certified chart for this chamber"
                }
              />
            </label>
          ))}
          <p className="fine-print">
            Each chamber uses its own certified chart. The current fuel price
            and coefficient are locked to this delivery.
          </p>
        </ActionForm>
      )}
      {modal.type === "delivery_detail" && d && (
        <DeliveryDetail
          delivery={d}
          data={data}
          stationId={stationId}
          owner={owner}
          price={price}
          onDone={onDone}
        />
      )}
      {modal.type === "open_shift" && (
        <ActionForm
          op="open_shift"
          base={base}
          onDone={onDone}
          submit="Open & lock baseline"
        >
          <Field
            label="Shift name"
            name="name"
            placeholder="e.g. Morning shift"
          />
          <div className="notice">
            <ShieldCheck size={20} />
            <span>
              Current nozzle readings, tank stock, and fuel prices are
              snapshotted together. Only one shift may be open at this station.
            </span>
          </div>
          <p className="fine-print">
            The cutoff is the earliest of 12 hours, midnight PKT, or the next
            scheduled price change.
          </p>
        </ActionForm>
      )}
      {modal.type === "close_shift" && shift && (
        <CloseShift
          shift={shift}
          data={data}
          stationId={stationId}
          onDone={onDone}
        />
      )}
      {modal.type === "shift_detail" && shift && owner && (
        <ShiftDetail shift={shift} data={data} price={price} onDone={onDone} />
      )}
      {modal.type === "account" && (
        <ActionForm
          op="account"
          base={base}
          onDone={onDone}
          submit="Create corporate account"
        >
          <Field label="Business / fleet name" name="name" />
          <Field
            label="Approved credit limit (PKR)"
            name="credit_limit"
            type="number"
            min={1}
          />
          <div className="notice">
            Every credit fill checks the remaining limit inside a database
            transaction. Simultaneous fills cannot exceed the account limit.
          </div>
        </ActionForm>
      )}
      {modal.type === "account_detail" && account && (
        <>
          <div className="account-detail-heading">
            <div>
              <span className="muted">{account.name}</span>
              <h2>{price(account.balance)}</h2>
              <span className="muted">
                of {price(account.credit_limit)} credit limit
              </span>
            </div>
            <Button
              variant="secondary"
              onClick={() => onNavigate({ type: "vehicle", id: account.id })}
            >
              <Plus size={16} />
              Add vehicle
            </Button>
          </div>
          <a
            className="button button-secondary full-width"
            href={`/api/documents/statement/${account.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={16} />
            Download account statement PDF
          </a>
          <div className="vehicle-list">
            {data.vehicles
              .filter((v) => v.account_id === account.id)
              .map((v) => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  stationId={stationId}
                  onDone={onDone}
                />
              ))}
            {!data.vehicles.some((v) => v.account_id === account.id) && (
              <p className="muted">
                Authorize your first vehicle to generate its unique QR
                credential.
              </p>
            )}
          </div>
        </>
      )}
      {modal.type === "vehicle" && (
        <ActionForm
          op="vehicle"
          base={{ ...base, account_id: modal.id }}
          onDone={onDone}
          submit="Authorize & generate QR"
        >
          <Field label="Vehicle registration" name="registration" />
          <div className="form-grid">
            <Select
              label="Permitted fuel grade"
              name="grade"
              options={grades}
            />
            <Field
              label="Maximum litres per fill"
              name="max_liters"
              type="number"
              min={1}
            />
          </div>
          <p className="fine-print">
            Treat the QR credential as a controlled fueling authorization. An
            authenticated station operator must still capture evidence and
            submit the fill.
          </p>
        </ActionForm>
      )}
      {modal.type === "payment" && account && (
        <ActionForm
          op="payment"
          base={{ ...base, account_id: account.id }}
          onDone={onDone}
          submit="Record received payment"
        >
          <p>
            Outstanding: <strong>{price(account.balance)}</strong>
          </p>
          <Field
            label="Amount received (PKR)"
            name="amount"
            type="number"
            min={0.01}
            max={account.balance}
          />
          <Field label="Bank / receipt reference" name="reference" />
          <p className="fine-print">
            Record only received and independently verified funds.
          </p>
        </ActionForm>
      )}
      {modal.type === "parchi" && (
        <ParchiForm
          data={data}
          stationId={stationId}
          nozzles={nozzles}
          onDone={onDone}
        />
      )}
    </Dialog>
  );
}
function EvidenceLink({
  id,
  label = "View evidence",
}: {
  id: string;
  label?: string;
}) {
  return (
    <a
      href={`/api/evidence/${id}`}
      target="_blank"
      rel="noreferrer"
      className="evidence-link"
    >
      <ExternalLink size={13} />
      {label}
    </a>
  );
}
function DeliveryDetail({
  delivery: d,
  data,
  stationId,
  owner,
  price,
  onDone,
}: {
  delivery: Delivery;
  data: Dashboard;
  stationId: string;
  owner: boolean;
  price: (n: number) => string;
  onDone: () => void;
}) {
  const [evidence, setEvidence] = useState("");
  const chamberCount = d.chamber_count || d.chambers?.length || 1;
  return (
    <div className="detail-stack">
      <div className="detail-summary">
        <span className="detail-symbol">
          <Truck size={28} />
        </span>
        <div>
          <h2>{d.vehicle}</h2>
          <p>
            {d.reference} · {d.depot}
          </p>
        </div>
        <span className="subtle-pill capitalize">{d.status}</span>
      </div>
      {owner && (
        <ContractorTracking
          deliveryId={d.id}
          dispatched={d.status === "dispatched"}
        />
      )}{" "}
      {d.status === "dispatched" && (
        <ActionForm
          op="submit_delivery"
          base={{ station_id: stationId, id: d.id }}
          onDone={onDone}
          submit="Submit & lock pre-decant audit"
          transform={(f) => {
            if (!evidence)
              throw new Error(
                "Capture the thermometer and dip evidence first.",
              );
            return {
              arrival_temp: Number(f.get("arrival_temp")),
              dips: Array.from({ length: chamberCount }, (_, i) =>
                Number(f.get(`dip_${i}`)),
              ),
              evidence_id: evidence,
            };
          }}
        >
          <Field
            label="Pump arrival temperature (°C)"
            name="arrival_temp"
            type="number"
            min={-20}
            max={80}
          />
          <div className="form-grid">
            {Array.from({ length: chamberCount }, (_, i) => (
              <Field
                key={i}
                label={`Chamber ${i + 1} dip (mm)`}
                name={`dip_${i}`}
                type="number"
                min={0}
              />
            ))}
          </div>
          <CameraCapture
            stationId={stationId}
            workspaceId={data.member!.workspace_id}
            value={evidence}
            onCapture={setEvidence}
            label="Capture thermometer & dip evidence"
          />
          <div className="notice">
            Do not unload until the owner reviews and approves this audit.
            Submitted measurements cannot be edited.
          </div>
        </ActionForm>
      )}
      {owner && d.measured !== null && d.measured !== undefined && (
        <>
          <div className="receipt-grid">
            <div>
              <span>Invoice volume</span>
              <strong>{number(d.invoice, 2)} L</strong>
            </div>
            <div>
              <span>Measured volume</span>
              <strong>{number(d.measured, 2)} L</strong>
            </div>
            <div>
              <span>Thermal allowance</span>
              <strong>{number(d.allowance || 0, 2)} L</strong>
            </div>
            <div className="receipt-highlight">
              <span>Unexplained shortage</span>
              <strong>{number(d.shortage || 0, 2)} L</strong>
            </div>
          </div>
          <div className="receipt-math">
            <span>
              {d.loading_temp}°C loading → {d.measurement?.arrival_temp}°C
              arrival
            </span>
            <span>
              Coefficient {d.beta} / °C · {price(d.price)} / L
            </span>
          </div>
          <div className="claim-total">
            <span>Calculated claim for review</span>
            <strong>{price(d.claim || 0)}</strong>
          </div>
          {d.measurement?.evidence_id && (
            <EvidenceLink id={d.measurement.evidence_id} />
          )}
          <p className="fine-print">
            A calculated discrepancy is not proof of theft. Confirm charts,
            measurement quality, agreed temperature standard, and commercial
            terms before approval.
          </p>
        </>
      )}
      {d.status === "submitted" &&
        (owner ? (
          <ActionForm
            op="approve_delivery"
            base={{ station_id: stationId, id: d.id }}
            onDone={onDone}
            submit="Approve audit & release decant"
          >
            <label className="checkbox-label">
              <input type="checkbox" required /> I have reviewed the readings
              and supporting evidence.
            </label>
          </ActionForm>
        ) : (
          <div className="notice">
            <LockKeyhole size={18} /> Audit submitted. Waiting for owner
            approval before decant.
          </div>
        ))}
      {["approved", "decanted"].includes(d.status) && owner && (
        <a
          className="button button-secondary full-width"
          href={`/api/documents/claim/${d.id}`}
          target="_blank"
          rel="noreferrer"
        >
          <Download size={16} />
          Download shortage claim PDF
        </a>
      )}
      {d.status === "approved" && (
        <ActionForm
          op="decant"
          base={{ station_id: stationId, id: d.id }}
          onDone={onDone}
          submit="Confirm completed decant"
        >
          <label className="checkbox-label">
            <input type="checkbox" required /> The approved delivery has been
            fully unloaded into the assigned tank.
          </label>
          <p className="fine-print">
            This updates the tank’s recorded stock once. The tank must have
            enough recorded capacity.
          </p>
        </ActionForm>
      )}
      {d.status === "decanted" && (
        <div className="notice">
          <Check size={18} /> Decant recorded {date(d.decanted_at)}.
        </div>
      )}
    </div>
  );
}
function CloseShift({
  shift,
  data,
  stationId,
  onDone,
}: {
  shift: Shift;
  data: Dashboard;
  stationId: string;
  onDone: () => void;
}) {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [posPhoto, setPosPhoto] = useState("");
  const tanks = data.tanks.filter((t) => t.station_id === stationId);
  const nozzles = shift.opening.nozzles;
  return (
    <ActionForm
      op="close_shift"
      base={{ station_id: stationId, id: shift.id }}
      onDone={onDone}
      submit="Submit & permanently lock shift"
      transform={(f) => {
        for (const item of [...tanks, ...nozzles])
          if (!photos[item.id])
            throw new Error(`Capture evidence for ${item.name}.`);
        const pos = Number(f.get("pos"));
        if (pos > 0 && !posPhoto)
          throw new Error("Capture the bank POS settlement report.");
        return {
          nozzles: nozzles.map((n) => ({
            id: n.id,
            closing: Number(f.get(`closing_${n.id}`)),
            testing: Number(f.get(`testing_${n.id}`)),
            evidence_id: photos[n.id],
          })),
          tanks: tanks.map((t) => ({
            id: t.id,
            dip: Number(f.get(`dip_${t.id}`)),
            evidence_id: photos[t.id],
          })),
          cash: Number(f.get("cash")),
          pos,
          pos_evidence_id: posPhoto || null,
        };
      }}
    >
      <div className="notice">
        <ClockLabel due={shift.due_at} />
      </div>
      <h3 className="form-section-title">
        <Fuel size={17} />
        01 / Nozzle readings
      </h3>
      {nozzles.map((n) => (
        <div key={n.id} className="reading-card">
          <div className="reading-heading">
            <strong>{n.name}</strong>
            <span>Opening {number(n.totalizer, 1)} L</span>
          </div>
          <div className="form-grid">
            <Field
              label="Closing totalizer (L)"
              name={`closing_${n.id}`}
              type="number"
              min={n.totalizer}
            />
            <Field
              label="Testing returned to tank (L)"
              name={`testing_${n.id}`}
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
          <CameraCapture
            stationId={stationId}
            workspaceId={data.member!.workspace_id}
            value={photos[n.id]}
            onCapture={(id) => setPhotos((prev) => ({ ...prev, [n.id]: id }))}
            label="Capture nozzle totalizer"
          />
        </div>
      ))}
      <h3 className="form-section-title">
        <ClipboardCheck size={17} />
        02 / Physical tank dips
      </h3>
      {tanks.map((t) => (
        <div key={t.id} className="reading-card">
          <Field
            label={`${t.name} · Closing dip (mm)`}
            name={`dip_${t.id}`}
            type="number"
            min={0}
          />
          <CameraCapture
            stationId={stationId}
            workspaceId={data.member!.workspace_id}
            value={photos[t.id]}
            onCapture={(id) => setPhotos((prev) => ({ ...prev, [t.id]: id }))}
            label="Capture wet dipstick mark"
          />
        </div>
      ))}
      <h3 className="form-section-title">03 / Cash & settlement</h3>
      <div className="form-grid">
        <Field
          label="Physical cash handed over (PKR)"
          name="cash"
          type="number"
          min={0}
        />
        <Field
          label="Bank POS settlement (PKR)"
          name="pos"
          type="number"
          min={0}
        />
      </div>
      <CameraCapture
        stationId={stationId}
        workspaceId={data.member!.workspace_id}
        value={posPhoto}
        onCapture={setPosPhoto}
        label="Capture POS settlement report"
      />
      <label className="checkbox-label">
        <input type="checkbox" required /> I confirm these are the actual
        closing readings and funds handed over.
      </label>
    </ActionForm>
  );
}
function ClockLabel({ due }: { due: string }) {
  return (
    <span>
      Cutoff: {date(due)} PKT. A submission after this time is flagged for owner
      review. Record readings at the cutoff.
    </span>
  );
}
function ShiftDetail({
  shift: s,
  data,
  price,
  onDone,
}: {
  shift: Shift;
  data: Dashboard;
  price: (n: number) => string;
  onDone: () => void;
}) {
  const r = s.result;
  return (
    <div className="detail-stack">
      <div className="detail-summary">
        <span className="detail-symbol">
          <ClipboardCheck size={27} />
        </span>
        <div>
          <h2>{s.name}</h2>
          <p>
            {date(s.opened_at)} → {s.closed_at ? date(s.closed_at) : "Open"}
          </p>
        </div>
      </div>
      {r && (
        <>
          {r.late && (
            <div className="notice warning">
              Submitted after cutoff. Review the timing before accepting this
              reconciliation.
            </div>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tank</th>
                  <th>Sold</th>
                  <th>Expected</th>
                  <th>Actual</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                {r.tanks.map((t) => (
                  <tr key={t.tank_id}>
                    <td>{t.name}</td>
                    <td>{number(t.sold, 1)} L</td>
                    <td>{number(t.expected, 1)} L</td>
                    <td>{number(t.actual, 1)} L</td>
                    <td
                      className={
                        Math.abs(t.variance) >
                        (data.stations.find((st) => st.id === s.station_id)
                          ?.tolerance || 15)
                          ? "text-danger"
                          : ""
                      }
                    >
                      {number(t.variance, 1)} L
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="receipt-lines">
            <p>
              <span>Nozzle revenue</span>
              <strong>{price(r.revenue)}</strong>
            </p>
            <p>
              <span>Verified digital credit</span>
              <strong>− {price(r.credit)}</strong>
            </p>
            <p>
              <span>Reported POS settlement</span>
              <strong>− {price(r.pos)}</strong>
            </p>
            <p>
              <span>Expected cash</span>
              <strong>{price(r.expected_cash)}</strong>
            </p>
            <p>
              <span>Cash handed over</span>
              <strong>{price(r.cash)}</strong>
            </p>
            <p className="receipt-line-total">
              <span>Cash variance</span>
              <strong
                className={
                  Math.abs(r.cash_variance) > 0.01 ? "text-danger" : ""
                }
              >
                {price(r.cash_variance)}
              </strong>
            </p>
          </div>
          <h3>Supporting evidence</h3>
          <div className="evidence-grid">
            {s.submission?.nozzles.map((n) => (
              <EvidenceLink
                key={n.id}
                id={n.evidence_id}
                label={`${data.nozzles.find((a) => a.id === n.id)?.name || "Nozzle"} · ${number(n.closing, 1)} L`}
              />
            ))}
            {s.submission?.tanks.map((t) => (
              <EvidenceLink
                key={t.id}
                id={t.evidence_id}
                label={`${data.tanks.find((a) => a.id === t.id)?.name || "Tank"} · ${t.dip} mm`}
              />
            ))}
            {s.submission?.pos_evidence_id && (
              <EvidenceLink
                id={s.submission.pos_evidence_id}
                label="POS settlement"
              />
            )}
          </div>
          {s.status === "review" ? (
            <ActionForm
              op="review_shift"
              base={{ station_id: s.station_id, id: s.id }}
              onDone={onDone}
              submit="Complete owner review"
            >
              <label>
                Review notes
                <textarea
                  name="note"
                  required
                  minLength={3}
                  rows={3}
                  placeholder="Document findings and follow-up for any variance."
                />
              </label>
              <label className="checkbox-label">
                <input type="checkbox" required /> I reviewed the evidence and
                recorded any unresolved discrepancies.
              </label>
            </ActionForm>
          ) : (
            <div className="notice">
              <ShieldCheck size={18} />
              <div>
                <strong>Reviewed by owner</strong>
                <p>{s.review_note}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
function VehicleCard({
  vehicle: v,
  stationId,
  onDone,
}: {
  vehicle: Vehicle;
  stationId: string;
  onDone: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (show && canvas.current)
      void QRCode.toCanvas(canvas.current, v.token, {
        width: 220,
        margin: 2,
        errorCorrectionLevel: "M",
      });
  }, [show, v.token]);
  async function revoke() {
    try {
      await command("disable_vehicle", { station_id: stationId, id: v.id });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to revoke");
    }
  }
  return (
    <div className="vehicle-card">
      <div>
        <Truck size={24} />
        <span>
          <strong>{v.registration}</strong>
          <small>
            {v.grade} · Max {v.max_liters} L / fill ·{" "}
            {v.active ? "Active" : "Disabled"}
          </small>
        </span>
        <Button variant="secondary" size="sm" onClick={() => setShow(!show)}>
          <QrCode size={15} />
          QR
        </Button>
      </div>
      {show && (
        <div className="qr-details">
          <canvas ref={canvas} />
          <code>{v.token}</code>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const a = document.createElement("a");
              a.download = `${v.registration}-fuel-credential.png`;
              a.href = canvas.current!.toDataURL();
              a.click();
            }}
          >
            <Download size={15} />
            Download QR
          </Button>
          <p className="fine-print">
            Share only with the authorized vehicle operator. Disable the vehicle
            to revoke this credential.
          </p>
        </div>
      )}
      {v.active && (
        <button className="text-link text-danger" onClick={revoke}>
          Disable vehicle authorization
        </button>
      )}
    </div>
  );
}
function ParchiForm({
  data,
  stationId,
  nozzles,
  onDone,
}: {
  data: Dashboard;
  stationId: string;
  nozzles: Dashboard["nozzles"];
  onDone: () => void;
}) {
  const [evidence, setEvidence] = useState("");
  const [token, setToken] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  return (
    <ActionForm
      op="parchi"
      base={{ station_id: stationId, request_id: requestId }}
      onDone={onDone}
      submit="Verify limit & record parchi"
      transform={(f) => {
        if (!evidence) throw new Error("Capture the nozzle evidence first.");
        return {
          ...Object.fromEntries(f),
          token: token.trim(),
          evidence_id: evidence,
        };
      }}
    >
      <QrScan onRead={setToken} />
      <label>
        Vehicle QR credential
        <input
          name="token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          placeholder="Scan or enter the vehicle’s UUID credential"
          pattern="[0-9a-fA-F-]{36}"
        />
      </label>
      <Select
        label="Dispensing nozzle"
        name="nozzle_id"
        options={nozzles.map((n) => ({ value: n.id, label: n.name }))}
      />
      <Field label="Litres dispensed" name="liters" type="number" min={0.01} />
      <CameraCapture
        stationId={stationId}
        workspaceId={data.member!.workspace_id}
        value={evidence}
        onCapture={setEvidence}
        label="Capture final nozzle reading"
      />
      <div className="notice">
        The server checks the vehicle’s fuel grade, per-fill allowance,
        available account credit, and the open shift. Prices and balances are
        never entered here.
      </div>
    </ActionForm>
  );
}
type Detector = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
function QrScan({ onRead }: { onRead: (value: string) => void }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let canceled = false;
    async function start() {
      try {
        const ctor = (
          window as unknown as {
            BarcodeDetector?: new (options: { formats: string[] }) => Detector;
          }
        ).BarcodeDetector;
        if (!ctor)
          throw new Error(
            "QR scanning is unavailable in this browser. Use your phone camera to read the QR and paste its credential below.",
          );
        const detector = new ctor({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (canceled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }
        timer = setInterval(async () => {
          if (video.current?.readyState === 4) {
            const codes = await detector.detect(video.current);
            if (codes[0]) {
              onRead(codes[0].rawValue);
              setActive(false);
            }
          }
        }, 500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Camera unavailable");
        setActive(false);
      }
    }
    void start();
    return () => {
      canceled = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (timer) clearInterval(timer);
    };
  }, [active, onRead]);
  return (
    <div>
      <Button
        variant="secondary"
        type="button"
        onClick={() => {
          setError("");
          setActive(!active);
        }}
      >
        <QrCode size={17} />
        {active ? "Stop scanning" : "Scan vehicle QR"}
      </Button>
      {active && (
        <video ref={video} autoPlay playsInline muted className="qr-video" />
      )}
      {error && <p className="fine-print">{error}</p>}
    </div>
  );
}
