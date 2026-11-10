"use client";
import Image from "next/image";
import { useState } from "react";
import type { Delivery, Station } from "@/lib/types";
import { number } from "@/lib/utils";
import { ArrowRight, ArrowUpRight, MapPin } from "./icons";
import { Button } from "./ui/button";
import { ContractorTracking } from "./tracking";

const stages = ["dispatched", "submitted", "approved", "decanted"] as const;
const labels = ["Dispatched", "Arrival audit", "Approved", "Received"];
export function ReceivingFocus({
  deliveries,
  station,
  onOpen,
}: {
  deliveries: Delivery[];
  station?: Station;
  onOpen: (type: string, id?: string) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [mapFor, setMapFor] = useState("");
  const index = Math.max(
    0,
    deliveries.findIndex((d) => d.id === selectedId),
  );
  const delivery = deliveries[index];
  if (!delivery)
    return (
      <p className="overview-empty">No loaded deliveries in this stage.</p>
    );
  const step = stages.indexOf(delivery.status);
  const chambers = delivery.chamber_count || delivery.chambers?.length || 0;
  return (
    <div className="receiving-focus">
      <div className="receiving-identity">
        <div>
          <strong>{delivery.vehicle}</strong>
          <span>{delivery.reference}</span>
        </div>
        <div className="receiving-controls">
          <button
            aria-label="Previous delivery"
            disabled={index === 0}
            onClick={() => setSelectedId(deliveries[index - 1].id)}
          >
            ←
          </button>
          <span>
            {index + 1} / {deliveries.length}
          </span>
          <button
            aria-label="Next delivery"
            disabled={index === deliveries.length - 1}
            onClick={() => setSelectedId(deliveries[index + 1].id)}
          >
            →
          </button>
        </div>
      </div>
      <div className="receiving-vehicle">
        <Image
          src="/illustrations/fuel-tanker-v1.webp"
          width={1100}
          height={550}
          alt=""
          sizes="(max-width: 560px) 90vw, (max-width: 1100px) 75vw, 40vw"
        />
        <div className="receiving-load">
          <small>Invoice volume</small>
          <strong>
            {number(delivery.invoice)}
            <span>L</span>
          </strong>
        </div>
        <span className="receiving-art-label">Vehicle illustration</span>
      </div>
      <div className="receiving-route">
        <div>
          <small>From depot</small>
          <strong>{delivery.depot}</strong>
        </div>
        <ArrowRight size={16} />
        <div>
          <small>Receiving station</small>
          <strong>{station?.name || "Selected station"}</strong>
        </div>
      </div>
      <ol
        className="receiving-progress"
        aria-label="Delivery verification stage"
      >
        {stages.map((s, i) => (
          <li
            key={s}
            className={i <= step ? "reached" : ""}
            aria-current={i === step ? "step" : undefined}
          >
            <span>{i < step ? "✓" : i + 1}</span>
            <small>
              {labels[i]}
              {i === step && <em>Current</em>}
            </small>
          </li>
        ))}
      </ol>
      <div className="receiving-facts">
        <span>
          <small>Compartments</small>
          <strong>{chambers || "Not recorded"}</strong>
        </span>
        <span>
          <small>Measured arrival</small>
          <strong>
            {delivery.measured == null
              ? "Not submitted"
              : `${number(delivery.measured, 1)} L`}
          </strong>
        </span>
        <span>
          <small>Loading temperature</small>
          <strong>{number(delivery.loading_temp, 1)} °C</strong>
        </span>
      </div>
      <div className="receiving-actions">
        <Button
          variant="secondary"
          onClick={() => onOpen("delivery_detail", delivery.id)}
        >
          View receiving record
          <ArrowUpRight size={15} />
        </Button>
        <button
          className="receiving-map-button"
          aria-expanded={mapFor === delivery.id}
          onClick={() => setMapFor(mapFor === delivery.id ? "" : delivery.id)}
        >
          <MapPin size={16} />
          {mapFor === delivery.id ? "Close map" : "Map & sharing"}
        </button>
      </div>
      {mapFor === delivery.id && (
        <div className="receiving-map" key={delivery.id}>
          <ContractorTracking
            deliveryId={delivery.id}
            dispatched={delivery.status === "dispatched"}
            station={station}
          />
        </div>
      )}
    </div>
  );
}
