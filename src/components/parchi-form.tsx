"use client";
import { useClock } from "@/lib/use-clock";
import { useState } from "react";
import type { Dashboard } from "@/lib/types";
import { field } from "@/lib/field-api";
import { parseVehicleCredential } from "@/lib/vehicle-credential";
import { fuelGradeLabel, nozzlesForFuelGrade } from "@/lib/fuel-grades";
import { number } from "@/lib/utils";
import { ActionForm, Field, Select } from "./forms";
import { QrScan } from "./qr-scan";
import { Button } from "./ui/button";
import { CameraCapture } from "./camera";
import { Check, Truck, QrCode, LockKeyhole } from "./icons";
type VehicleMatch = {
  registration: string;
  account: string;
  grade: string;
  max_liters: number;
};
export function ParchiForm({
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
  const now = useClock();
  const [evidence, setEvidence] = useState("");
  const [token, setToken] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  const [match, setMatch] = useState<VehicleMatch | null>(null);
  const [checkedToken, setCheckedToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function verify(value = token) {
    setError("");
    setMatch(null);
    setEvidence("");
    setBusy(true);
    try {
      const parsed = parseVehicleCredential(value);
      setToken(parsed);
      const result = await field<VehicleMatch>("vehicle_lookup", {
        station_id: stationId,
        token: parsed,
      });
      setMatch(result);
      setCheckedToken(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify vehicle");
    } finally {
      setBusy(false);
    }
  }
  const shift = data.shifts.find(
    (s) => s.station_id === stationId && s.status === "open",
  );
  if (!shift || Date.parse(shift.due_at) <= now)
    return (
      <div role="status" className="notice warning">
        <div>
          <strong>
            {shift
              ? "Close the overdue shift first"
              : "Open a shift before dispensing on credit"}
          </strong>
          <p>
            A current shift is required to verify the allowance and record a
            fill. Submit the previous readings before opening the next shift.
          </p>
          <a href={`/app?view=shifts&station=${stationId}`}>Go to shifts</a>
        </div>
      </div>
    );
  const valid = !!match && token === checkedToken;
  const eligibleNozzles = nozzlesForFuelGrade(
    nozzles,
    data.tanks,
    valid ? match.grade : null,
  );
  return (
    <div className="parchi-flow">
      <ol className="parchi-steps">
        <li className={valid ? "done" : "current"}>
          <span>{valid ? <Check size={13} /> : "1"}</span>Vehicle pass
        </li>
        <li className={valid ? "current" : ""}>
          <span>2</span>Fill & evidence
        </li>
        <li>
          <span>3</span>Verify & record
        </li>
      </ol>
      <div className="parchi-explainer">
        <QrCode size={30} />
        <div>
          <h3>Scan the vehicle fuel pass</h3>
          <details className="pass-help">
            <summary>Which QR should I scan?</summary>
            <p>
              The owner issues it under Digital parchi → account → Vehicles & QR
              credentials. Scan the printed pass or driver’s saved copy. Payment
              and receipt QRs cannot authorize a fill.
            </p>
          </details>
        </div>
      </div>
      <QrScan
        onRead={(value) => {
          setToken(value);
          void verify(value);
        }}
      />
      <div className="pass-manual">
        <label>
          Vehicle pass code
          <input
            aria-label="Vehicle pass code"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setError("");
            }}
            placeholder="Scan a pass or enter its code"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !token}
          onClick={() => void verify()}
        >
          {busy ? "Checking…" : "Check vehicle"}
        </Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {valid && (
        <div className="matched-vehicle" role="status">
          <span className="matched-truck">
            <Truck size={30} />
          </span>
          <div>
            <small>AUTHORISED VEHICLE</small>
            <h3>{match.registration}</h3>
            <p>{match.account}</p>
          </div>
          <div>
            <strong>{fuelGradeLabel(match.grade)}</strong>
            <small>Up to {number(match.max_liters)} L per fill</small>
          </div>
        </div>
      )}
      {valid && !eligibleNozzles.length && (
        <p role="alert" className="form-error">
          No nozzle is configured for this vehicle’s fuel grade. Ask the owner
          to check its tank mapping.
        </p>
      )}
      <ActionForm
        op="parchi"
        base={{ station_id: stationId, request_id: requestId }}
        onDone={onDone}
        submit="Verify credit & record fuel fill"
        transform={(f) => {
          if (!valid) throw new Error("Check the vehicle fuel pass first.");
          if (!evidence)
            throw new Error("Capture the final nozzle reading first.");
          return {
            ...Object.fromEntries(f),
            token: checkedToken,
            evidence_id: evidence,
          };
        }}
      >
        <fieldset
          disabled={!valid || busy || !eligibleNozzles.length}
          className="parchi-fields"
        >
          <Select
            label="Dispensing nozzle"
            name="nozzle_id"
            options={eligibleNozzles.map((n) => ({
              value: n.id,
              label: n.name,
            }))}
          />
          <Field
            label="Litres dispensed"
            name="liters"
            type="number"
            min={0.01}
            max={match?.max_liters}
          />
          <CameraCapture
            stationId={stationId}
            workspaceId={data.member!.workspace_id}
            value={evidence}
            onCapture={setEvidence}
            label="Capture final nozzle reading"
          />
        </fieldset>
        <div className="parchi-assurance">
          <LockKeyhole size={17} />
          <p>
            Credit availability, vehicle allowance, fuel grade and the open
            shift are checked again when you submit. A scanned pass alone does
            not approve a fill.
          </p>
        </div>
      </ActionForm>
      <a className="offline-flow-link" href="/offline">
        No connection? Continue on this device to save a draft →
      </a>
    </div>
  );
}
