"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  MapPin,
  Navigation,
  Radio,
  ShieldCheck,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Field } from "./forms";
import { Brand } from "./brand";
import { date } from "@/lib/utils";
async function track(op: string, p: Record<string, unknown>) {
  const r = await fetch("/api/tracking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, p }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Unable to update tracking");
  return data;
}
type Report = {
  latitude: number;
  longitude: number;
  accuracy: number;
  received_at: string;
  review_stop: boolean;
};
type TrackingData = {
  session: { id: string; revoked: boolean; expires_at: string } | null;
  reports: Report[];
};
export function ContractorTracking({
  deliveryId,
  dispatched,
}: {
  deliveryId: string;
  dispatched: boolean;
}) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [setup, setSetup] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const refresh = useCallback(async () => {
    try {
      setData(await track("read", { delivery_id: deliveryId }));
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tracking unavailable");
    }
  }, [deliveryId]);
  useEffect(() => {
    let canceled = false;
    track("read", { delivery_id: deliveryId })
      .then((next) => {
        if (!canceled) setData(next);
      })
      .catch((e) => {
        if (!canceled) setError(e.message);
      });
    const t = setInterval(() => void refresh(), 30000);
    return () => {
      canceled = true;
      clearInterval(t);
    };
  }, [deliveryId, refresh]);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget);
      const result = await track("create", {
        delivery_id: deliveryId,
        ...Object.fromEntries(f),
      });
      setLink(`${window.location.origin}/gate/${result.token}`);
      setSetup(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create link");
    } finally {
      setBusy(false);
    }
  }
  const latest = data?.reports.at(-1);
  const stale = latest && now - new Date(latest.received_at).getTime() > 90000;
  return (
    <section className="tracking-panel">
      <div className="tracking-heading">
        <span>
          <Navigation size={17} />
          Contractor phone tracking
        </span>
        {latest && (
          <span
            className={`status ${stale ? "status-pending" : "status-active"}`}
          >
            {stale ? "Signal stale" : "Reporting"}
          </span>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      {latest ? (
        <>
          <div className="tracking-map">
            <div className="tracking-grid" />
            <svg
              viewBox="0 0 500 180"
              role="img"
              aria-label="Recorded location trace; relative coordinate plot, not a road map"
            >
              {(() => {
                const reports = data!.reports;
                const minLat = Math.min(...reports.map((p) => p.latitude)),
                  maxLat = Math.max(...reports.map((p) => p.latitude));
                const minLon = Math.min(...reports.map((p) => p.longitude)),
                  maxLon = Math.max(...reports.map((p) => p.longitude));
                const points = reports.map(
                  (p) =>
                    `${40 + ((p.longitude - minLon) / Math.max(0.001, maxLon - minLon)) * 420},${140 - ((p.latitude - minLat) / Math.max(0.001, maxLat - minLat)) * 100}`,
                );
                const last = points.at(-1)!.split(",");
                return (
                  <>
                    <polyline
                      points={points.join(" ")}
                      fill="none"
                      stroke="#9caf7d"
                      strokeWidth="2"
                    />
                    <circle
                      cx={last[0]}
                      cy={last[1]}
                      r="7"
                      fill="#d6ef84"
                      stroke="#486034"
                      strokeWidth="3"
                    />
                  </>
                );
              })()}
            </svg>
            <span className="trace-label">
              RECORDED LOCATION TRACE · NOT A ROAD MAP
            </span>
          </div>
          <div className="tracking-meta">
            <span>
              {latest.latitude.toFixed(5)}, {latest.longitude.toFixed(5)}
            </span>
            <span>Accuracy ±{Math.round(latest.accuracy)} m</span>
          </div>
          <p className="fine-print">
            Last received {date(latest.received_at)} PKT
          </p>
          {stale ? (
            <div className="notice warning">
              Location is stale. The phone may be offline or the browser may be
              suspended. No current location is inferred.
            </div>
          ) : (
            latest.review_stop && (
              <div className="notice warning">
                Stop requires review: approximately 8+ minutes outside the
                configured depot and station geofences. Contact the driver; this
                is not evidence of theft.
              </div>
            )
          )}
        </>
      ) : (
        <p className="fine-print">
          {data?.session && !data.session.revoked
            ? "Waiting for the driver to open the link and consent to location sharing."
            : "Create a short-lived driver link to receive real phone location reports. No hardware is used."}
        </p>
      )}
      {link && (
        <div className="gatepass-link">
          <input readOnly value={link} aria-label="Driver tracking link" />
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              void navigator.clipboard
                .writeText(link)
                .then(() => toast.success("Driver link copied"))
            }
          >
            <Copy size={15} />
            Copy
          </Button>
          <p className="fine-print">
            Share directly with the driver. The bearer link expires in 48 hours.
            Creating another link revokes the old one.
          </p>
        </div>
      )}
      {dispatched && !setup && (
        <Button
          variant="secondary"
          type="button"
          onClick={() => setSetup(true)}
        >
          {data?.session ? "Replace driver link" : "Create driver gate-pass"}
          <MapPin size={15} />
        </Button>
      )}
      {setup && (
        <form onSubmit={create} className="form-stack">
          <div className="form-grid">
            <Field
              name="depot_lat"
              label="Depot latitude"
              type="number"
              min={-90}
              max={90}
            />
            <Field
              name="depot_lon"
              label="Depot longitude"
              type="number"
              min={-180}
              max={180}
            />
            <Field
              name="station_lat"
              label="Station latitude"
              type="number"
              min={-90}
              max={90}
            />
            <Field
              name="station_lon"
              label="Station longitude"
              type="number"
              min={-180}
              max={180}
            />
          </div>
          <Field
            name="radius_m"
            label="Geofence radius (metres)"
            type="number"
            min={100}
            max={5000}
            defaultValue={500}
          />
          <Button disabled={busy}>Create expiring driver link</Button>
        </form>
      )}
      {data?.session && !data.session.revoked && (
        <Button
          variant="ghost"
          type="button"
          onClick={() =>
            void track("revoke", { delivery_id: deliveryId })
              .then(() => {
                setLink("");
                void refresh();
              })
              .catch((e) => toast.error(e.message))
          }
        >
          Revoke tracking link
        </Button>
      )}
    </section>
  );
}
export function DriverGate({ token }: { token: string }) {
  const [info, setInfo] = useState<{
    vehicle: string;
    depot: string;
    station: string;
    expires_at: string;
  } | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState("");
  const watcher = useRef<number | null>(null);
  const sentAt = useRef(0);
  useEffect(() => {
    track("status", { token })
      .then(setInfo)
      .catch((e) => setError(e.message));
    return () => {
      if (watcher.current !== null)
        navigator.geolocation.clearWatch(watcher.current);
    };
  }, [token]);
  function stop() {
    if (watcher.current !== null)
      navigator.geolocation.clearWatch(watcher.current);
    watcher.current = null;
    setActive(false);
  }
  function start() {
    setError("");
    if (!navigator.geolocation) {
      setError("Location is unavailable in this browser.");
      return;
    }
    setActive(true);
    watcher.current = navigator.geolocation.watchPosition(
      async (p) => {
        if (Date.now() - sentAt.current < 30000) return;
        sentAt.current = Date.now();
        try {
          const result = await track("ping", {
            token,
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy,
          });
          if (result.received_at) setLast(result.received_at);
          setError("");
        } catch (e) {
          setError(e instanceof Error ? e.message : "Connection lost");
        }
      },
      (e) => {
        setError(
          e.code === 1
            ? "Location permission was denied. Enable it in your browser to share your position."
            : "Unable to get a reliable location. Check GPS and network coverage.",
        );
        if (e.code === 1) stop();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 25000 },
    );
  }
  return (
    <main id="main" className="driver-page">
      <Brand />
      <div className="driver-card">
        <span className="empty-icon">
          <Navigation size={28} />
        </span>
        <span className="eyebrow">DRIVER GATE-PASS</span>
        <h1>{info ? info.vehicle : "Your delivery link"}</h1>
        {info && (
          <p>
            {info.depot} <span>→</span> {info.station}
          </p>
        )}
        <div className="notice">
          <ShieldCheck size={19} />
          <span>
            With your permission, PumpShield shares this phone’s location with
            the receiving station owner approximately every 30 seconds. Sharing
            ends when you stop it, close this page, or the delivery audit
            begins.
          </span>
        </div>
        <p className="muted">
          Keep this page open, your phone charged, and location enabled.
          Background tracking is not guaranteed. You can stop sharing at any
          time.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {info && (
          <Button className="full-width" onClick={active ? stop : start}>
            {active ? <Square size={17} /> : <Radio size={17} />}{" "}
            {active ? "Stop sharing location" : "I agree · Share my location"}
          </Button>
        )}
        {last && (
          <p className="fine-print" role="status">
            Last report received: {date(last)} PKT
          </p>
        )}
        {info && (
          <p className="fine-print">Link expires {date(info.expires_at)} PKT</p>
        )}
      </div>
    </main>
  );
}
