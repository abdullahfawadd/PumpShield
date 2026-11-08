"use client";
import { useEffect, useRef } from "react";
import groups from "@/lib/wall-tiles.json";

// Independently implemented orthographic wall. Reference/media attribution: public/flowing/SOURCE.md.
export function DesignCanvas() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const host = stage.current,
      surface = canvas.current;
    if (!host || !surface) return;
    const ctx = surface.getContext("2d", { alpha: false });
    if (!ctx || typeof ctx.roundRect !== "function") return;
    let frame = 0,
      disposed = false,
      last = 0,
      elapsed = 0,
      speed = 0;
    let width = 0,
      height = 0,
      px = 0,
      py = 0,
      tx = 0,
      ty = 0;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const tiles = groups.flat().map((name) => {
      const img = new Image();
      img.src = `/flowing/${name}`;
      return img;
    });
    const videos = new Map<string, HTMLVideoElement>();
    const resize = () => {
      const box = host.getBoundingClientRect();
      width = box.width;
      height = box.height;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const setupMedia = () => {
      videos.forEach((v) => {
        v.pause();
        v.removeAttribute("src");
        v.load();
      });
      videos.clear();
      if (!motion.matches)
        for (const name of [
          "elastic-toggles",
          "angry-slider",
          "globe-drag",
          "aurora-drift-fast",
        ]) {
          const v = document.createElement("video");
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          v.preload = "metadata";
          v.src = `/flowing/${name}.mp4`;
          videos.set(name, v);
          void v.play().catch(() => {});
        }
    };
    setupMedia();
    const move = (e: PointerEvent) => {
      if (motion.matches || e.pointerType !== "mouse") return;
      const r = host.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 90;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 90;
    };
    const leave = () => {
      tx = 0;
      ty = 0;
    };
    const wheel = (e: WheelEvent) => {
      if (motion.matches) return;
      e.preventDefault();
      speed = Math.max(-900, Math.min(900, speed + e.deltaY * 0.7));
    };
    const visibility = () => {
      videos.forEach((v) =>
        document.hidden ? v.pause() : void v.play().catch(() => {}),
      );
      last = 0;
    };
    const draw = (now: number) => {
      if (disposed) return;
      if (motion.matches) return;
      frame = requestAnimationFrame(draw);
      if (document.hidden || now - last < 32) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (!motion.matches) {
        elapsed += dt * (13 + speed);
        speed *= Math.exp(-dt * 2.5);
        px += (tx - px) * 0.08;
        py += (ty - py) * 0.08;
      }
      ctx.fillStyle = "#111110";
      ctx.fillRect(0, 0, width, height);
      // Affine projection: an oblique plane, without perspective enlargement at the near edge.
      const angle = (-40 * Math.PI) / 180,
        tilt = Math.cos((55 * Math.PI) / 180);
      const ax = Math.cos(angle),
        ay = -Math.sin(angle),
        bx = Math.sin(angle) * tilt,
        by = Math.cos(angle) * tilt;
      const cellW = 261,
        cellH = 163,
        gap = 16;
      const columns = Math.ceil((width + height) / (cellW * tilt)) + 4,
        rows = Math.ceil((width + height) / (cellH * tilt)) + 6;
      ctx.save();
      ctx.translate(width / 2 + px, height / 2 + py);
      ctx.transform(ax, bx, ay, by, 0, 0);
      for (let col = -columns; col <= columns; col++)
        for (let row = -rows; row <= rows; row++) {
          const travel = motion.matches ? 0 : elapsed * (1 + (col % 4) * 0.08);
          const offset =
            ((travel % (cellH + gap)) + (cellH + gap)) % (cellH + gap);
          const x = col * (cellW + gap),
            y = row * (cellH + gap) + offset;
          const sx =
              ax * (x + cellW / 2) + ay * (y + cellH / 2) + width / 2 + px,
            sy = bx * (x + cellW / 2) + by * (y + cellH / 2) + height / 2 + py;
          if (sx < -270 || sx > width + 270 || sy < -180 || sy > height + 180)
            continue;
          const index =
              (((col * 7 + (row - Math.floor(travel / (cellH + gap))) * 11) %
                tiles.length) +
                tiles.length) %
              tiles.length,
            img = tiles[index];
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, cellW, cellH, 10);
          ctx.clip();
          ctx.fillStyle = "#1b1b19";
          ctx.fillRect(x, y, cellW, cellH);
          const video = videos.get(
            img.src.split("/").pop()!.replace(".webp", ""),
          );
          const media = video && video.readyState >= 2 ? video : img;
          if (
            (media instanceof HTMLVideoElement && media.readyState >= 2) ||
            (media instanceof HTMLImageElement &&
              media.complete &&
              media.naturalWidth)
          ) {
            const iw =
              media instanceof HTMLVideoElement
                ? media.videoWidth
                : media.naturalWidth;
            const ih =
              media instanceof HTMLVideoElement
                ? media.videoHeight
                : media.naturalHeight;
            const scale = Math.max(cellW / iw, cellH / ih);
            ctx.drawImage(
              media,
              x + (cellW - iw * scale) / 2,
              y + (cellH - ih * scale) / 2,
              iw * scale,
              ih * scale,
            );
          }
          ctx.restore();
          ctx.strokeStyle = "#353532";
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.roundRect(x, y, cellW, cellH, 10);
          ctx.stroke();
        }
      ctx.restore();
      if (
        tiles.every((img) => img.complete) &&
        tiles.some((img) => img.naturalWidth > 0)
      )
        host.dataset.ready = "true";
    };
    frame = requestAnimationFrame(draw);
    const changeMotion = () => {
      setupMedia();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    motion.addEventListener("change", changeMotion);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("wheel", wheel, { passive: false });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", changeMotion);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("wheel", wheel);
      document.removeEventListener("visibilitychange", visibility);
      videos.forEach((v) => {
        v.pause();
        v.removeAttribute("src");
        v.load();
      });
    };
  }, []);
  return (
    <div ref={stage} className="reference-wall" aria-hidden="true">
      <canvas ref={canvas} />
      <span className="wall-depth" />
      <span className="flowing-credit">Interface studies by Flowing</span>
    </div>
  );
}
