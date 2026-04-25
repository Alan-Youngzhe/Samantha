"use client";

import { useEffect, useRef } from "react";

export interface FogPoint {
  x: number;
  y: number;
  weight: number;
}

interface FogProps {
  /**
   * Two-element array: [NW corner, SE corner] of the clear zone in pixel coords.
   */
  exploredPoints: FogPoint[];
  fogColor?: string;
}

// Seeded random for deterministic blob shapes across re-renders
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Dark fog overlay with irregular organic clear zone.
 * Uses multiple overlapping radial blobs to create a natural "explored area" shape.
 */
export default function FogOverlay({
  exploredPoints,
  fogColor = "rgba(40, 36, 32, 0.6)",
}: FogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Fill entire canvas with dark fog
    ctx.fillStyle = fogColor;
    ctx.fillRect(0, 0, w, h);

    if (exploredPoints.length < 2) return;

    const x1 = exploredPoints[0].x;
    const y1 = exploredPoints[0].y;
    const x2 = exploredPoints[1].x;
    const y2 = exploredPoints[1].y;

    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;

    // Cut out irregular blobs to form an organic clear zone
    ctx.globalCompositeOperation = "destination-out";

    const rng = seededRandom(137);

    // Core elliptical blob — slightly off-center for organic feel
    const coreOffX = (rng() - 0.5) * rx * 0.15;
    const coreOffY = (rng() - 0.5) * ry * 0.15;
    const coreR = Math.max(rx, ry) * 0.75;
    const coreGrad = ctx.createRadialGradient(cx + coreOffX, cy + coreOffY, 0, cx + coreOffX, cy + coreOffY, coreR);
    coreGrad.addColorStop(0, "rgba(0,0,0,1)");
    coreGrad.addColorStop(0.65, "rgba(0,0,0,0.95)");
    coreGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = coreGrad;
    ctx.fillRect(cx + coreOffX - coreR, cy + coreOffY - coreR, coreR * 2, coreR * 2);

    // Second core blob offset to create an elongated shape
    const core2X = cx - coreOffX * 1.5;
    const core2Y = cy - coreOffY * 1.2;
    const core2R = Math.min(rx, ry) * 0.65;
    const core2Grad = ctx.createRadialGradient(core2X, core2Y, 0, core2X, core2Y, core2R);
    core2Grad.addColorStop(0, "rgba(0,0,0,1)");
    core2Grad.addColorStop(0.6, "rgba(0,0,0,0.9)");
    core2Grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = core2Grad;
    ctx.fillRect(core2X - core2R, core2Y - core2R, core2R * 2, core2R * 2);

    // Medium blobs — fill body, staggered angles to avoid patterns
    const medCount = 14;
    for (let i = 0; i < medCount; i++) {
      const baseAngle = (i / medCount) * Math.PI * 2;
      const jitter = (rng() - 0.5) * 1.2;
      const angle = baseAngle + jitter;
      const dist = 0.25 + rng() * 0.45;
      const bx = cx + Math.cos(angle) * rx * dist;
      const by = cy + Math.sin(angle) * ry * dist;
      const br = (0.28 + rng() * 0.3) * Math.min(rx, ry);

      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(0.55, "rgba(0,0,0,0.85)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }

    // Edge tendrils — give the boundary an organic, wispy look
    const edgeCount = 20;
    for (let i = 0; i < edgeCount; i++) {
      const angle = (i / edgeCount) * Math.PI * 2 + (rng() - 0.5) * 0.8;
      const stretch = 0.65 + rng() * 0.4;
      const bx = cx + Math.cos(angle) * rx * stretch;
      const by = cy + Math.sin(angle) * ry * stretch;
      const br = (0.12 + rng() * 0.22) * Math.min(rx, ry);

      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0, "rgba(0,0,0,0.85)");
      grad.addColorStop(0.4, "rgba(0,0,0,0.45)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }

    // A few larger outgrowths in random directions for asymmetry
    const outgrowths = 5;
    for (let i = 0; i < outgrowths; i++) {
      const angle = rng() * Math.PI * 2;
      const bx = cx + Math.cos(angle) * rx * (0.5 + rng() * 0.35);
      const by = cy + Math.sin(angle) * ry * (0.5 + rng() * 0.35);
      const br = (0.2 + rng() * 0.25) * Math.max(rx, ry);

      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0, "rgba(0,0,0,0.95)");
      grad.addColorStop(0.5, "rgba(0,0,0,0.6)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }

    ctx.globalCompositeOperation = "source-over";
  }, [exploredPoints, fogColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
    />
  );
}
