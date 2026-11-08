"use client";
import Image from "next/image";
import { useSyncExternalStore } from "react";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const snapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tiles = [
  "elastic-toggles",
  "angry-slider",
  "star-scramble",
  "save-button",
  "globe-drag",
  "platform-controls",
  "platform-search",
  "platform-sidebar",
  "depth-map-scroll",
  "aurora-drift-fast",
  "flow-field-red",
  "prism-silk",
];
export function DesignCanvas() {
  const reduced = useSyncExternalStore(subscribe, snapshot, () => true);
  return (
    <div className="flowing-canvas" aria-hidden="true">
      <div className="flowing-wall">
        {[...tiles, ...tiles, ...tiles].map((name, i) => (
          <div className={`flowing-tile tile-${i % 5}`} key={`${name}-${i}`}>
            <Image
              src={`/flowing/${name}.webp`}
              width={480}
              height={320}
              alt=""
              unoptimized
              loading={i < 8 ? "eager" : "lazy"}
            />
            {!reduced &&
              i < 12 &&
              [
                "elastic-toggles",
                "angry-slider",
                "globe-drag",
                "aurora-drift-fast",
              ].includes(name) && (
                <video
                  src={`/flowing/${name}.mp4`}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              )}
          </div>
        ))}
      </div>
      <span className="flowing-credit">Interface studies by Flowing</span>
    </div>
  );
}
