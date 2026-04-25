"use client";

import { useEffect, useRef } from "react";

export interface FogShopPoint {
  x: number;
  y: number;
  radius: number;
}

interface FogProps {
  visitedShops: FogShopPoint[];
  fogColor?: string;
}

export default function FogOverlay({
  visitedShops,
  fogColor = "rgba(40, 36, 32, 0.45)",
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

    ctx.fillStyle = fogColor;
    ctx.fillRect(0, 0, w, h);

    if (visitedShops.length === 0) return;

    ctx.globalCompositeOperation = "destination-out";

    for (const shop of visitedShops) {
      const grad = ctx.createRadialGradient(
        shop.x, shop.y, 0,
        shop.x, shop.y, shop.radius,
      );
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(0.6, "rgba(0,0,0,0.9)");
      grad.addColorStop(0.85, "rgba(0,0,0,0.3)");
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(shop.x, shop.y, shop.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  }, [visitedShops, fogColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
    />
  );
}
