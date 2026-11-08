"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, RotateCcw } from "@/components/icons";
import type { CapturedEvidence } from "@/lib/evidence-capture";
import { browserDb } from "@/lib/supabase/client";
import { command } from "@/lib/api";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
export function CameraCapture({
  stationId,
  workspaceId,
  onCapture,
  onLocalCapture,
  label = "Capture evidence",
  value,
}: {
  stationId: string;
  workspaceId: string;
  onCapture?: (id: string) => void;
  onLocalCapture?: (capture: CapturedEvidence) => void;
  label?: string;
  value?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  useEffect(() => {
    if (!open) return;
    let canceled = false;
    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: false,
      })
      .then((s) => {
        if (canceled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          video.current
            .play()
            .catch(() => setError("Tap the camera preview to start."));
        }
      })
      .catch(() =>
        setError(
          "Camera access is required. Allow camera permission in your browser, then reopen capture.",
        ),
      );
    return () => {
      canceled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setReady(false);
    };
  }, [open]);
  async function capture() {
    setBusy(true);
    setError("");
    try {
      if (!video.current || !video.current.videoWidth)
        throw new Error("Wait for the camera to be ready.");
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(
            resolve,
            () =>
              reject(
                new Error(
                  "Location permission is required for evidence. Enable location and try again.",
                ),
              ),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
          ),
      );
      const capturedAt = new Date().toISOString();
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(video.current.videoWidth, 1600);
      canvas.height = Math.round(
        (video.current.videoHeight * canvas.width) / video.current.videoWidth,
      );
      const context = canvas.getContext("2d")!;
      context.drawImage(video.current, 0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(0,0,0,.78)";
      context.fillRect(0, canvas.height - 65, canvas.width, 65);
      context.fillStyle = "#fff";
      context.font = `${Math.max(14, canvas.width / 65)}px sans-serif`;
      context.fillText(
        `PumpShield · ${capturedAt} · ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
        18,
        canvas.height - 35,
      );
      context.fillText(
        `Accuracy ±${Math.round(position.coords.accuracy)}m · Camera evidence`,
        18,
        canvas.height - 12,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Photo capture failed"))),
          "image/jpeg",
          0.85,
        ),
      );
      const digest = await crypto.subtle.digest(
        "SHA-256",
        await blob.arrayBuffer(),
      );
      const sha256 = Array.from(new Uint8Array(digest))
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      if (onLocalCapture) {
        onLocalCapture({
          captureId: crypto.randomUUID(),
          blob,
          capturedAt,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          sha256,
        });
        setOpen(false);
        return;
      }
      const db = browserDb();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new Error("Sign in again to capture.");
      const path = `${workspaceId}/${user.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await db.storage
        .from("evidence")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const result = await command("evidence", {
        station_id: stationId,
        path,
        captured_at: capturedAt,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        sha256,
      });
      onCapture?.(result.id);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={`capture-button ${value ? "captured" : ""}`}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        {value ? <Check size={18} /> : <Camera size={18} />}{" "}
        {value ? "Photo captured" : label}
        {value && <RotateCcw size={13} />}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => !busy && setOpen(v)}
        title="Keep the reading in focus."
        description="Capture the actual meter, dip rod, or document. Camera and location permissions are required."
      >
        <div className="camera-view">
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            onCanPlay={() => setReady(true)}
            onClick={() => video.current?.play()}
          />
          <div className="camera-reticle" />
          <span>Position the reading inside the frame</span>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button
          type="button"
          disabled={!ready || busy}
          onClick={capture}
          className="full-width"
        >
          {busy ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}{" "}
          {busy ? "Securing your evidence…" : "Capture & save photo"}
        </Button>
        <p className="fine-print">
          Capture time, location accuracy, and a file hash are recorded. Browser
          evidence still requires human review.
        </p>
      </Dialog>
    </>
  );
}
