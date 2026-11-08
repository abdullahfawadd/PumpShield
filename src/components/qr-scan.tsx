"use client";
import { useEffect, useRef, useState } from "react";
import { QrCode, Camera } from "./icons";
import { Button } from "./ui/button";
import { parseVehicleCredential } from "@/lib/vehicle-credential";
export function QrScan({ onRead }: { onRead: (token: string) => void }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);
  useEffect(() => {
    if (!active) return;
    const target = video.current;
    let cancelled = false;
    let controls: { stop: () => void } | undefined;
    void import("@zxing/browser")
      .then(async ({ BrowserQRCodeReader }) => {
        if (cancelled || !target) return;
        const reader = new BrowserQRCodeReader();
        const c = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          target,
          (result) => {
            if (!result || cancelled) return;
            try {
              const token = parseVehicleCredential(result.getText());
              onReadRef.current(token);
              setActive(false);
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Use a PumpShield vehicle pass",
              );
            }
          },
        );
        controls = c;
        if (cancelled) c.stop();
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Allow camera access, or enter the vehicle pass code below.",
          );
          setActive(false);
        }
      });
    return () => {
      cancelled = true;
      controls?.stop();
      const stream = target?.srcObject;
      if (stream instanceof MediaStream)
        stream.getTracks().forEach((t) => t.stop());
    };
  }, [active]);
  return (
    <div className="qr-scanner">
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setActive(!active);
          setError("");
        }}
      >
        <QrCode size={19} />
        {active ? "Close scanner" : "Scan vehicle fuel pass"}
      </Button>
      {active && (
        <div className="camera-view qr-camera">
          <video ref={video} autoPlay playsInline muted />
          <div className="camera-reticle" />
          <span>
            <Camera size={15} />
            Place the vehicle pass inside the frame
          </span>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
