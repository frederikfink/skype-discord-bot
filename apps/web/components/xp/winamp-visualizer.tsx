"use client";

import { useEffect, useRef } from "react";

type WinampVisualizerProps = {
  active: boolean;
  /** Changes when track changes — nudges the fake waveform */
  trackKey: string;
};

export function WinampVisualizer({ active, trackKey }: WinampVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackSeed = useRef(0);

  useEffect(() => {
    trackSeed.current = trackKey.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  }, [trackKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      frame += 1;
      const t = frame * 0.04;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const seed = trackSeed.current;

      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(0, 255, 80, 0.12)";
      ctx.lineWidth = 1;
      for (let gy = 0; gy < h; gy += 8) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      if (!active) {
        ctx.strokeStyle = "rgba(0, 200, 60, 0.35)";
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(0, 255, 100, 0.5)";
        ctx.font = "9px Courier New, monospace";
        ctx.fillText("it really whips the llama's ass", 6, h / 2 - 4);
        raf = requestAnimationFrame(draw);
        return;
      }

      const bars = 40;
      const barW = w / bars;
      for (let i = 0; i < bars; i++) {
        const n =
          Math.sin(t * 2.2 + i * 0.35 + seed * 0.01) * 0.35 +
          Math.sin(t * 5.1 + i * 0.9) * 0.2 +
          Math.random() * 0.28;
        const bh = Math.max(4, (0.25 + n) * h);
        const hue = (i * 7 + t * 90 + seed) % 360;
        ctx.fillStyle = `hsla(${hue}, 95%, 55%, 0.85)`;
        ctx.fillRect(i * barW + 1, h - bh, barW - 2, bh);
      }

      ctx.strokeStyle = "#0f0";
      ctx.shadowColor = "#0f0";
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const wave =
          Math.sin(x * 0.11 + t * 4 + seed) * 0.55 +
          Math.sin(x * 0.03 - t * 2.5) * 0.35 +
          (Math.random() - 0.5) * 0.15;
        const y = h * 0.32 + wave * (h * 0.22);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255, 0, 255, 0.6)";
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const wave = Math.sin(x * 0.07 - t * 3.2 + seed * 0.02) * 0.7;
        const y = h * 0.68 + wave * (h * 0.18);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active]);

  return (
    <div className={`winamp-canvas-wrap${active ? " active" : ""}`} aria-hidden>
      <canvas ref={canvasRef} className="winamp-canvas-viz" />
      <span className="winamp-viz-label">{active ? "AVS // ON" : "AVS // STBY"}</span>
    </div>
  );
}
