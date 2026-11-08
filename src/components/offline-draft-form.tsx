"use client";
import { useEffect, useState } from "react";
import type { FieldContext, FieldDraft, DraftKind } from "@/lib/offline-types";
import type { CapturedEvidence, StoredEvidence } from "@/lib/evidence-capture";
import { storeCapture } from "@/lib/evidence-capture";
import { parseVehicleCredential } from "@/lib/vehicle-credential";
import { CameraCapture } from "./camera";
import { QrScan } from "./qr-scan";
import { Button } from "./ui/button";
import { Camera, Check, Plus } from "./icons";
import { date } from "@/lib/utils";
export function OfflineDraftForm({
  context,
  onSave,
}: {
  context: FieldContext;
  onSave: (draft: FieldDraft) => Promise<void>;
}) {
  const [kind, setKind] = useState<DraftKind>("parchi");
  const [token, setToken] = useState("");
  const [deliveryId, setDeliveryId] = useState(context.deliveries[0]?.id || "");
  const [photos, setPhotos] = useState<Record<string, StoredEvidence>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [encodingPhotos, setEncodingPhotos] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const [pos, setPos] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const expired = now > Date.parse(context.expires_at);
  const delivery = context.deliveries.find((d) => d.id === deliveryId);
  async function photo(name: string, capture: CapturedEvidence) {
    setEncodingPhotos((count) => count + 1);
    try {
      const image = await storeCapture(capture);
      setPhotos((old) => ({ ...old, [name]: image }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not keep the photo");
    } finally {
      setEncodingPhotos((count) => count - 1);
    }
  }
  const capture = (name: string, label: string) => (
    <div className="offline-photo-field" key={name}>
      <span>
        {photos[name] ? <Check size={16} /> : <Camera size={16} />} {label}
      </span>
      <CameraCapture
        stationId={context.station.id}
        workspaceId={context.workspace_id}
        value={photos[name]?.captureId}
        onLocalCapture={(c) => void photo(name, c)}
        label="Capture photo"
      />
    </div>
  );
  function changeKind(next: DraftKind) {
    if (
      Object.keys(photos).length &&
      !confirm("Changing the form clears its unsaved photos. Continue?")
    )
      return;
    setKind(next);
    setPos(0);
    setPhotos({});
    setToken("");
    setError("");
    setFormKey((k) => k + 1);
  }
  return (
    <section className="offline-form-card">
      <div className="offline-card-heading">
        <div>
          <span className="eyebrow">CAPTURE WITHOUT A CONNECTION</span>
          <h2>New field record</h2>
        </div>
        <span className="draft-only-tag">Draft only</span>
      </div>
      <div
        className="offline-kind-tabs"
        role="group"
        aria-label="Offline record type"
      >
        {(
          [
            ["parchi", "Fuel parchi"],
            ["submit_delivery", "Arrival audit"],
            ["close_shift", "Shift close"],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={kind === id}
            onClick={() => changeKind(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {expired ? (
        <p className="notice warning">
          This device’s station data is older than 24 hours. Connect and refresh
          before creating another record.
        </p>
      ) : (
        <form
          key={formKey}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const form = e.currentTarget;
            try {
              const f = new FormData(form);
              const evidence: Record<string, StoredEvidence> = {};
              const photoReference = (key: string) => {
                const image = photos[key];
                if (!image)
                  throw new Error(
                    `Capture the ${key.replaceAll("_", " ")} photo first.`,
                  );
                evidence[key] = image;
                return `local:${image.captureId}`;
              };
              let payload: Record<string, unknown>;
              let title: string;
              if (kind === "parchi") {
                if (!context.shift)
                  throw new Error(
                    "Prepare an open shift online before recording credit fuel.",
                  );
                payload = {
                  token: parseVehicleCredential(token),
                  nozzle_id: f.get("nozzle_id"),
                  liters: Number(f.get("liters")),
                  evidence_id: photoReference("final_nozzle"),
                };
                title = `Fuel parchi · ${payload.liters} L`;
              } else if (kind === "submit_delivery") {
                if (!delivery)
                  throw new Error(
                    "Choose a dispatched delivery from the saved workspace.",
                  );
                payload = {
                  id: delivery.id,
                  arrival_temp: Number(f.get("arrival_temp")),
                  dips: Array.from({ length: delivery.chamber_count }, (_, i) =>
                    Number(f.get(`dip_${i}`)),
                  ),
                  evidence_id: photoReference("temperature_and_dips"),
                };
                title = `Arrival audit · ${delivery.reference}`;
              } else {
                if (!context.shift)
                  throw new Error("Prepare an open shift online first.");
                payload = {
                  id: context.shift.id,
                  nozzles: context.nozzles.map((n) => ({
                    id: n.id,
                    closing: Number(f.get(`closing_${n.id}`)),
                    testing: Number(f.get(`testing_${n.id}`)),
                    evidence_id: photoReference(`nozzle_${n.id}`),
                  })),
                  tanks: context.tanks.map((t) => ({
                    id: t.id,
                    dip: Number(f.get(`tank_${t.id}`)),
                    evidence_id: photoReference(`tank_${t.id}`),
                  })),
                  cash: Number(f.get("cash")),
                  pos: Number(f.get("pos")),
                };
                if (Number(payload.pos) > 0)
                  payload.pos_evidence_id = photoReference("pos_receipt");
                title = `Shift close · ${context.shift.name}`;
              }
              await onSave({
                id: crypto.randomUUID(),
                user_id: context.user_id,
                workspace_id: context.workspace_id,
                station_id: context.station.id,
                shift_id: context.shift?.id || null,
                kind,
                captured_at: new Date().toISOString(),
                title,
                payload,
                evidence,
                state: "pending",
              });
              setPhotos({});
              setToken("");
              setPos(0);
              setFormKey((k) => k + 1);
              form.reset();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Unable to save the draft",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {kind === "parchi" && (
            <>
              <div className="notice warning">
                An offline draft does not approve credit or authorise a fill.
                Follow the station’s manual approval procedure until the server
                verifies it.
              </div>
              <QrScan onRead={setToken} />
              <label>
                Owner-issued vehicle pass code
                <input
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Scan the vehicle fuel pass"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label>
                Dispensing nozzle
                <select name="nozzle_id" required defaultValue="">
                  <option value="" disabled>
                    Choose a nozzle
                  </option>
                  {context.nozzles.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} · {n.grade}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Litres dispensed
                <input
                  name="liters"
                  type="number"
                  min="0.01"
                  max="10000"
                  step=".01"
                  required
                />
              </label>
              {capture("final_nozzle", "Final nozzle reading")}
            </>
          )}
          {kind === "submit_delivery" && (
            <>
              <label>
                Dispatched delivery
                <select
                  value={deliveryId}
                  onChange={(e) => {
                    setDeliveryId(e.target.value);
                    setPhotos({});
                  }}
                  required
                >
                  <option value="">Choose a delivery</option>
                  {context.deliveries.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.reference} · {d.vehicle}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Arrival fuel temperature (°C)
                <input
                  name="arrival_temp"
                  type="number"
                  min="-10"
                  max="70"
                  step=".1"
                  required
                />
              </label>
              {delivery &&
                Array.from({ length: delivery.chamber_count }, (_, i) => (
                  <label key={i}>
                    Chamber {i + 1} dip (mm)
                    <input
                      name={`dip_${i}`}
                      type="number"
                      min="0"
                      max="20000"
                      step=".1"
                      required
                    />
                  </label>
                ))}
              {capture("temperature_and_dips", "Temperature and chamber dips")}
              <p className="fine-print">
                The server uses the delivery’s locked calibration and thermal
                coefficient. No approval or decant is performed offline.
              </p>
            </>
          )}
          {kind === "close_shift" && (
            <>
              {context.shift ? (
                <p className="offline-shift-context">
                  {context.shift.name} · Due {date(context.shift.due_at)} PKT
                </p>
              ) : (
                <p className="notice warning">
                  No open shift was saved on this device. Connect and refresh
                  the workspace.
                </p>
              )}
              {context.nozzles.map((n) => (
                <fieldset key={n.id} className="offline-reading-group">
                  <legend>
                    {n.name} · {n.grade}
                  </legend>
                  <label>
                    Closing totalizer (L)
                    <input
                      name={`closing_${n.id}`}
                      type="number"
                      min={n.totalizer}
                      step=".01"
                      required
                    />
                  </label>
                  <label>
                    Testing / returned litres
                    <input
                      name={`testing_${n.id}`}
                      type="number"
                      min="0"
                      step=".01"
                      defaultValue="0"
                      required
                    />
                  </label>
                  {capture(`nozzle_${n.id}`, `${n.name} totalizer`)}
                </fieldset>
              ))}
              {context.tanks.map((t) => (
                <fieldset key={t.id} className="offline-reading-group">
                  <legend>
                    {t.name} · {t.grade}
                  </legend>
                  <label>
                    Closing tank dip (mm)
                    <input
                      name={`tank_${t.id}`}
                      type="number"
                      min="0"
                      max="20000"
                      step=".1"
                      required
                    />
                  </label>
                  {capture(`tank_${t.id}`, `${t.name} dip`)}
                </fieldset>
              ))}
              <div className="form-grid">
                <label>
                  Cash collected (PKR)
                  <input
                    name="cash"
                    type="number"
                    min="0"
                    step=".01"
                    required
                  />
                </label>
                <label>
                  POS collected (PKR)
                  <input
                    name="pos"
                    type="number"
                    min="0"
                    step=".01"
                    required
                    defaultValue="0"
                    onChange={(e) => setPos(Number(e.target.value))}
                  />
                </label>
              </div>
              {pos > 0 && capture("pos_receipt", "POS receipt")}
              <p className="fine-print">
                The original shift must still be open when this is posted. Late
                closures are flagged for the owner. Earlier pending credit fills
                must be resolved before closing.
              </p>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="full-width"
            type="submit"
            disabled={
              busy ||
              encodingPhotos > 0 ||
              ((kind === "parchi" || kind === "close_shift") && !context.shift)
            }
          >
            <Plus size={17} />
            {busy
              ? "Encrypting…"
              : encodingPhotos > 0
                ? "Preparing photo…"
                : "Save encrypted draft"}
          </Button>
          <p className="fine-print">
            Photos and readings stay encrypted on this device until a verified
            online submission succeeds.
          </p>
        </form>
      )}
    </section>
  );
}
