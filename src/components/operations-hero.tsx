"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowUpRight, Truck, ShieldCheck, Navigation } from "lucide-react";
import type { Delivery, Tank } from "@/lib/types";
import type { MapPoint } from "./route-map";
import { number } from "@/lib/utils";
const RouteMap = dynamic(() => import("./route-map"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
});
export function OperationsHero({
  deliveries,
  tanks,
  pending,
  onDelivery,
  onReview,
  demo,
}: {
  deliveries: Delivery[];
  tanks: Tank[];
  pending: number;
  onDelivery: (id: string) => void;
  onReview: () => void;
  demo: boolean;
}) {
  const d = deliveries.find((x) => x.status !== "decanted") || deliveries[0];
  const [points, setPoints] = useState<MapPoint[]>([]);
  useEffect(() => {
    let canceled = false;
    if (!d) return;
    fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "read", p: { delivery_id: d.id } }),
    })
      .then((r) => r.json())
      .then((value) => {
        if (!canceled) setPoints(value.reports || []);
      })
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [d]);
  const capacity = tanks.reduce((a, t) => a + t.capacity, 0),
    stock = tanks.reduce((a, t) => a + t.stock, 0);
  return (
    <div className="editorial-overview">
      <section className="dispatch-feature">
        <div className="feature-topline">
          <span>
            <i />
            {d ? "DELIVERY SPOTLIGHT" : "YOUR OPERATIONS, CONNECTED"}
          </span>
          <button
            onClick={() => d && onDelivery(d.id)}
            aria-label="Open featured delivery"
          >
            <ArrowUpRight size={19} />
          </button>
        </div>
        <div className="dispatch-heading">
          <div>
            <h2>{d ? `${d.depot} → Station` : "From arrival to assurance."}</h2>
            <p>
              {d
                ? `${d.vehicle} · ${d.reference}`
                : "Every delivery deserves a clear record."}
            </p>
          </div>
          <span className="dispatch-pill">
            {d ? d.status.replace("_", " ") : "Ready to begin"}
          </span>
        </div>
        <div className="truck-stage">
          <div className="truck-halo" />
          <Image
            src="/tanker-studio.png"
            width={880}
            height={460}
            alt="Studio illustration of a petroleum tanker"
            priority
          />
          <div className="floating-reading">
            <small>INVOICE VOLUME</small>
            <strong>
              {d ? number(d.invoice) : "—"} <em>L</em>
            </strong>
          </div>
          <span className="vehicle-caption">CONTRACTOR DELIVERY</span>
        </div>
        <div className="dispatch-stages">
          {["Dispatched", "Arrival audit", "Owner approval", "Decanted"].map(
            (s, i) => (
              <div
                key={s}
                className={
                  d &&
                  i <=
                    ["dispatched", "submitted", "approved", "decanted"].indexOf(
                      d.status,
                    )
                    ? "passed"
                    : ""
                }
              >
                <i />
                <span>{s}</span>
              </div>
            ),
          )}
        </div>
      </section>
      <section className="attention-feature">
        <span className="feature-kicker">
          <ShieldCheck size={16} /> THE OWNER’S BRIEF
        </span>
        <h2>
          {pending ? (
            <>
              {pending} {pending === 1 ? "decision" : "decisions"}.
              <br />
              One clear picture.
            </>
          ) : (
            <>
              Your station.
              <br />
              In a better light.
            </>
          )}
        </h2>
        <p>
          {pending
            ? "Review the details that need your judgement. Evidence first, decisions second."
            : "Bring the forecourt, the stockroom, and the books into the same conversation."}
        </p>
        <div
          className="stock-orbit"
          style={
            {
              "--stock-angle": `${capacity ? (stock / capacity) * 360 : 0}deg`,
            } as React.CSSProperties
          }
        >
          <div>
            <strong>
              {capacity ? Math.round((stock / capacity) * 100) : 0}
              <small>%</small>
            </strong>
            <span>Tank capacity in use</span>
          </div>
        </div>
        <button onClick={onReview}>
          Open review queue <ArrowUpRight size={17} />
        </button>
      </section>
      <section className="fleet-map-panel">
        <div className="feature-topline">
          <span>
            <Navigation size={15} /> DELIVERY LOCATION
          </span>
          <span>
            {demo
              ? "SYNTHETIC ROUTE"
              : points.length
                ? "LAST REPORTED"
                : "AWAITING DRIVER"}
          </span>
        </div>
        <RouteMap points={points} />
        <div className="map-caption">
          <Truck size={15} />
          {points.length
            ? "Route plotted from saved location reports."
            : "The map is ready. A driver’s consent-based reports will appear here."}
          {demo && " Sample positions are synthetic."}
        </div>
      </section>
      <section className="inventory-feature">
        <span className="feature-kicker">UNDERGROUND INVENTORY</span>
        <h2>
          {number(stock)} <small>litres</small>
        </h2>
        <p>Measured. Reconciled. Accounted for.</p>
        <div className="tank-ribbons">
          {tanks.map((t) => (
            <div key={t.id}>
              <span>
                {t.name}
                <b>{number(t.stock)} L</b>
              </span>
              <i>
                <em style={{ width: `${(t.stock / t.capacity) * 100}%` }} />
              </i>
              <small>
                {t.grade} · {number(t.capacity - t.stock)} L ullage
              </small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
