"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Copy,
  MapPin,
  Navigation,
  Radio,
  ShieldCheck,
  Square,
  ArrowUpRight,
} from "./icons";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Brand } from "./brand";
import { LocationPicker } from "./location-picker";
import type { Station } from "@/lib/types";
import type { Geo } from "@/lib/geo";
import { date } from "@/lib/utils";
const FieldMap = dynamic(() => import("./field-map"), { ssr: false });
async function track(
  op: string,
  p: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const r = await fetch("/api/tracking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, p }),
    signal,
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Unable to update tracking");
  return data;
}
type Report = Geo & {
  accuracy: number;
  received_at: string;
  review_stop: boolean;
  heading?: number | null;
  speed_ms?: number | null;
};
type Session = {
  id: string;
  revoked: boolean;
  expires_at: string;
  depot_lat: number;
  depot_lon: number;
  station_lat: number;
  station_lon: number;
};
type TrackingData = { session: Session | null; reports: Report[] };
export function ContractorTracking({
  deliveryId,
  dispatched,
  station,
}: {
  deliveryId: string;
  dispatched: boolean;
  station?: Station;
}) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [setup, setSetup] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [destination, setDestination] = useState<Geo | null>(
    station?.latitude != null && station.longitude != null
      ? {
          latitude: Number(station.latitude),
          longitude: Number(station.longitude),
        }
      : null,
  );
  const [depot, setDepot] = useState<Geo | null>(null);
  const [choosing, setChoosing] = useState<"station" | "depot">("station");
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const result = await track("read", { delivery_id: deliveryId }, signal);
        if (!signal?.aborted) {
          setData(result);
          setNow(Date.now());
          setError("");
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") setError(e.message);
      }
    },
    [deliveryId],
  );
  useEffect(() => {
    const c = new AbortController();
    const first = setTimeout(() => void refresh(c.signal), 0);
    const timer = setInterval(() => {
      if (!document.hidden) void refresh(c.signal);
    }, 8000);
    return () => {
      c.abort();
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);
  const latest = data?.reports.at(-1);
  const stale = !!latest && now - Date.parse(latest.received_at) > 90000;
  const session = data?.session;
  const stationPoint = session
    ? {
        latitude: Number(session.station_lat),
        longitude: Number(session.station_lon),
      }
    : destination;
  const depotPoint = session
    ? {
        latitude: Number(session.depot_lat),
        longitude: Number(session.depot_lon),
      }
    : depot;
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!destination || !depot) {
      setError(
        "Choose both the receiving station and loading depot on the map.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      const result = await track("create", {
        delivery_id: deliveryId,
        depot_lat: depot.latitude,
        depot_lon: depot.longitude,
        station_lat: destination.latitude,
        station_lon: destination.longitude,
        radius_m: Number(form.get("radius_m")),
        save_station: form.get("save_station") === "on",
      });
      setLink(`${location.origin}/gate/${result.token}`);
      setSetup(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create link");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Driver link copied");
    } catch {
      setError("Copy the link from the field below.");
    }
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({
          title: "PumpShield delivery tracking",
          text: "Open this secure delivery link and choose Share my location. Keep it open during the trip.",
          url: link,
        });
      else await copy();
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError")
        setError(
          "Sharing was unavailable. Use the WhatsApp, SMS, or copy buttons.",
        );
    }
  }
  const shareText = `PumpShield delivery tracking: ${link}\nOpen the link, allow location, and tap Share my location. Keep the page open during the trip.`;
  return (
    <section className="tracking-experience">
      <header className="tracking-title">
        <div>
          <span className="eyebrow">DELIVERY SIGNAL</span>
          <h3>Follow the delivery.</h3>
        </div>
        <span
          className={`tracking-state ${stale ? "stale" : latest ? "live" : "waiting"}`}
        >
          <i />
          {session?.revoked
            ? "Link revoked"
            : stale
              ? "Signal stale"
              : latest
                ? "GPS reporting"
                : "Awaiting driver"}
        </span>
      </header>
      {!setup && (
        <div className="tracking-map-wrap">
          <FieldMap
            points={data?.reports || []}
            station={stationPoint}
            depot={depotPoint}
          />
          <div className="tracking-glass-card">
            <span>
              <Navigation size={15} />
              {station?.name || "Receiving station"}
            </span>
            <strong>
              {latest?.speed_ms != null
                ? `${Math.max(0, Math.round(latest.speed_ms * 3.6))}`
                : "—"}
              <small>
                {latest?.speed_ms != null ? "km/h reported" : "last known GPS"}
              </small>
            </strong>
            <p>
              {latest
                ? `Accuracy ±${Math.round(latest.accuracy)} m`
                : "Driver consent required"}
            </p>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {latest && (
        <div className="tracking-signal-details">
          <span>
            <small>LAST RECEIVED · PKT</small>
            {date(latest.received_at)}
          </span>
          <span>
            <small>RECENT REPORTS</small>
            {data!.reports.length}
          </span>
          <span>
            <small>COORDINATES</small>
            {latest.latitude.toFixed(5)}, {latest.longitude.toFixed(5)}
          </span>
        </div>
      )}
      {stale && (
        <div className="notice warning">
          The phone’s location is stale. The marker stays at the last report; no
          movement is predicted.
        </div>
      )}
      {latest?.review_stop && (
        <div className="notice warning">
          An extended stop outside configured geofences needs a check with the
          driver. Location data alone does not establish theft.
        </div>
      )}
      {!latest && !setup && (
        <p className="fine-print">
          {session && !session.revoked
            ? "Waiting for the driver to open the link and consent to sharing."
            : "Create an expiring link and send it to the driver. No truck hardware or app installation is needed."}
        </p>
      )}
      {link && !setup && (
        <div className="tracking-share">
          <label>
            Private driver link
            <input
              readOnly
              value={link}
              aria-label="Driver tracking link"
              onFocus={(e) => e.target.select()}
            />
          </label>
          <div>
            <Button type="button" onClick={() => void share()}>
              <ArrowUpRight size={16} />
              Share link
            </Button>
            <a
              className="button button-secondary"
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
            <a
              className="button button-secondary"
              href={`sms:?body=${encodeURIComponent(shareText)}`}
            >
              SMS
            </a>
            <Button type="button" variant="ghost" onClick={() => void copy()}>
              <Copy size={16} />
              Copy
            </Button>
          </div>
          <p>
            Share only with this delivery’s driver. The link expires in 48 hours
            and stops accepting reports when the arrival audit begins.
          </p>
        </div>
      )}
      {dispatched && !setup && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (session) {
              setDepot({
                latitude: Number(session.depot_lat),
                longitude: Number(session.depot_lon),
              });
              setDestination({
                latitude: Number(session.station_lat),
                longitude: Number(session.station_lon),
              });
            }
            setChoosing("station");
            setSetup(true);
          }}
        >
          <MapPin size={16} />
          {session ? "Replace driver link" : "Create & share driver link"}
        </Button>
      )}
      {setup && (
        <form className="tracking-setup" onSubmit={create}>
          <div
            className="map-location-tabs"
            role="group"
            aria-label="Tracking locations"
          >
            <button
              type="button"
              aria-pressed={choosing === "station"}
              onClick={() => setChoosing("station")}
            >
              1 · Receiving station {destination ? "✓" : ""}
            </button>
            <button
              type="button"
              aria-pressed={choosing === "depot"}
              onClick={() => setChoosing("depot")}
            >
              2 · Loading depot {depot ? "✓" : ""}
            </button>
          </div>
          <LocationPicker
            key={choosing}
            label={
              choosing === "station"
                ? "Receiving petrol station"
                : "Loading depot"
            }
            value={choosing === "station" ? destination : depot}
            onChange={choosing === "station" ? setDestination : setDepot}
          />
          {choosing === "station" && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setChoosing("depot")}
            >
              Next: place the loading depot <ArrowUpRight size={15} />
            </Button>
          )}
          <label>
            Geofence radius (metres)
            <input
              type="number"
              name="radius_m"
              defaultValue={station?.geofence_m || 500}
              min={100}
              max={5000}
              required
            />
          </label>
          <label className="inline-check">
            <input type="checkbox" name="save_station" defaultChecked />
            Save this receiving pin as the station’s default location
          </label>
          {session && !session.revoked && (
            <p className="notice warning">
              Creating a replacement will revoke the previous link. Send the new
              link to the driver.
            </p>
          )}
          <div className="form-actions">
            <Button disabled={!destination || !depot || busy}>
              {busy ? "Creating…" : "Create private driver link"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSetup(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {session && !session.revoked && !setup && (
        <button
          className="text-link text-danger"
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await track("revoke", { delivery_id: deliveryId });
              setLink("");
              await refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to revoke");
            } finally {
              setBusy(false);
            }
          }}
        >
          Revoke driver link
        </button>
      )}
      <p className="tracking-provenance">
        Truck animation connects received GPS reports. The trail is not a
        calculated road route. Location sharing depends on phone permission and
        an open browser.
      </p>
    </section>
  );
}
type GateInfo = {
  vehicle: string;
  depot: string;
  station: string;
  expires_at: string;
  station_lat: number;
  station_lon: number;
  depot_lat: number;
  depot_lon: number;
};
export function DriverGate({ token }: { token: string }) {
  const [info, setInfo] = useState<GateInfo | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const watcher = useRef<number | null>(null);
  const sentAt = useRef(0);
  const sending = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void track("status", { token })
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
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
    if (watcher.current !== null) return;
    setActive(true);
    sentAt.current = 0;
    watcher.current = navigator.geolocation.watchPosition(
      async (p) => {
        if (sending.current || Date.now() - sentAt.current < 30000) return;
        sending.current = true;
        try {
          const result = await track("ping", {
            token,
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy,
            heading: p.coords.heading,
            speed_ms: p.coords.speed,
          });
          if (result.received_at) {
            sentAt.current = Date.now();
            setLast(result.received_at);
            setReports((previous) => [
              ...previous.slice(-119),
              {
                latitude: p.coords.latitude,
                longitude: p.coords.longitude,
                accuracy: p.coords.accuracy,
                heading: p.coords.heading,
                speed_ms: p.coords.speed,
                received_at: result.received_at,
                review_stop: false,
              },
            ]);
          }
          setError("");
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Connection lost. Keep this page open to retry.",
          );
        } finally {
          sending.current = false;
        }
      },
      (e) => {
        setError(
          e.code === 1
            ? "Location permission was denied. Enable location in your browser to share."
            : "Unable to get a reliable position. Check GPS and network coverage.",
        );
        if (e.code === 1) stop();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 25000 },
    );
  }
  return (
    <main id="main" className="driver-page">
      <Brand />
      <div className="driver-card driver-card-modern">
        <span className="eyebrow">PRIVATE DELIVERY LINK</span>
        <h1>{info?.vehicle || "Your delivery link"}</h1>
        {info && (
          <p>
            {info.depot} → {info.station}
          </p>
        )}
        {info && (
          <FieldMap
            points={reports}
            compact
            station={{
              latitude: Number(info.station_lat),
              longitude: Number(info.station_lon),
            }}
            depot={{
              latitude: Number(info.depot_lat),
              longitude: Number(info.depot_lon),
            }}
          />
        )}
        <div className="driver-consent">
          <ShieldCheck size={22} />
          <p>
            With your permission, this phone sends its location to the receiving
            station approximately every 30 seconds. Sharing stops when you stop
            it, close the page, or the arrival audit starts.
          </p>
        </div>
        <p className="muted">
          Keep this page open and the phone charged. Browser background tracking
          is not guaranteed.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {info && (
          <Button className="full-width" onClick={active ? stop : start}>
            {active ? <Square size={17} /> : <Radio size={17} />}
            {active ? "Stop sharing location" : "I agree · Share my location"}
          </Button>
        )}
        {last && (
          <p className="fine-print" role="status">
            Last report received {date(last)} PKT
          </p>
        )}
        {info && (
          <p className="fine-print">
            Private link expires {date(info.expires_at)} PKT
          </p>
        )}
      </div>
    </main>
  );
}
