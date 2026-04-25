"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type L from "leaflet";
import FogOverlay, { type FogShopPoint } from "@/components/FogOverlay";

interface ShopPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  visitCount: number;
  avgPrice: number;
  temperature: "hot" | "active" | "caution" | "unknown" | "visited";
}

interface MapViewProps {
  pins: ShopPin[];
  onPinClick?: (pin: ShopPin) => void;
  onLongPressBlank?: (lnglat: { lng: number; lat: number }) => void;
  city?: string;
}

const CITY_CENTERS: Record<string, [number, number]> = {
  "上海": [121.4525, 31.1778],
  "北京": [116.4074, 39.9042],
  "深圳": [114.0579, 22.5431],
};

const temperatureColors: Record<ShopPin["temperature"], string> = {
  hot: "#E8564A",
  active: "#D4A853",
  caution: "#E8564A",
  unknown: "#D4C4B4",
  visited: "#7CAF6B",
};

function createPinHTML(pin: ShopPin): string {
  const color = temperatureColors[pin.temperature];
  const label = pin.temperature === "unknown" ? "?" : pin.temperature === "visited" ? "你" : pin.temperature === "caution" ? "!" : String(pin.visitCount);
  const badge = pin.temperature === "hot"
    ? "🔥"
    : pin.temperature === "active"
      ? "✦"
      : pin.temperature === "caution"
        ? "⚠"
        : pin.temperature === "visited"
          ? "★"
          : "?";
  const halo = pin.temperature === "hot"
    ? "0 0 0 8px rgba(232,86,74,0.16), 0 8px 20px rgba(232,86,74,0.28)"
    : pin.temperature === "active"
      ? "0 0 0 6px rgba(212,168,83,0.14), 0 6px 16px rgba(212,168,83,0.22)"
      : pin.temperature === "caution"
        ? "0 0 0 6px rgba(232,86,74,0.10), 0 6px 16px rgba(232,86,74,0.18)"
        : pin.temperature === "visited"
          ? "0 0 0 6px rgba(124,175,107,0.16), 0 6px 16px rgba(124,175,107,0.22)"
          : "0 4px 12px rgba(44,24,16,0.15)";
  const scale = pin.temperature === "hot" ? "scale(1.08)" : "scale(1)";
  const nameColor = pin.temperature === "unknown" ? "#8B7355" : "#4A3526";
  const subtitle = pin.temperature === "unknown"
    ? "未探索"
    : pin.temperature === "hot"
      ? "很多人去"
      : pin.temperature === "active"
        ? "有热度"
        : pin.temperature === "caution"
          ? "有人踩雷"
          : pin.temperature === "visited"
            ? "你去过"
            : "刚有人提过";
  return `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:${scale};transition:transform 160ms ease;">
        <div style="position:absolute;top:-6px;right:-4px;width:16px;height:16px;border-radius:999px;background:#FFF9F4;border:1px solid rgba(240,228,218,0.9);display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1;z-index:2;">${badge}</div>
        <div style="width:30px;height:30px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:${halo};border:2px solid rgba(255,249,244,0.96);">
          <span style="color:#fff;font-size:10px;font-weight:700;">${label}</span>
        </div>
      </div>
      <span style="font-size:9px;font-weight:600;color:${nameColor};margin-top:5px;white-space:nowrap;max-width:74px;overflow:hidden;text-overflow:ellipsis;">${pin.name}</span>
      <span style="font-size:8px;color:#8B7355;margin-top:1px;white-space:nowrap;">${subtitle}</span>
    </div>
  `;
}

export default function MapView({
  pins, onPinClick, onLongPressBlank, city,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const leafletRef = useRef<typeof L | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fogPoints, setFogPoints] = useState<FogShopPoint[]>([]);

  // Dynamic import Leaflet (SSR safe)
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled) return;
      const Leaf = mod.default || mod;
      leafletRef.current = Leaf as typeof L;

      if (!containerRef.current || mapRef.current) return;

      const center = CITY_CENTERS[city || "上海"] || CITY_CENTERS["上海"];

      const map = Leaf.map(containerRef.current, {
        center: [center[1], center[0]],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      Leaf.tileLayer(
        "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=2&style=8&x={x}&y={y}&z={z}",
        { subdomains: "1234", maxZoom: 18, minZoom: 3 },
      ).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    }).catch(() => {
      if (!cancelled) setError("地图加载失败");
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [city]);

  // Long press interaction
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current || !onLongPressBlank) return;
    const map = mapRef.current;
    const Leaf = leafletRef.current;
    const container = map.getContainer();

    let timer: ReturnType<typeof setTimeout> | null = null;
    let startPos: { x: number; y: number } | null = null;

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      startPos = null;
    };

    const resolve = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const pt = Leaf.point(clientX - rect.left, clientY - rect.top);
      const ll = map.containerPointToLatLng(pt);
      onLongPressBlank({ lng: ll.lng, lat: ll.lat });
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startPos = { x: t.clientX, y: t.clientY };
      timer = setTimeout(() => resolve(t.clientX, t.clientY), 600);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!startPos || !timer) return;
      const t = e.touches[0];
      if (Math.hypot(t.clientX - startPos.x, t.clientY - startPos.y) > 10) clear();
    };
    const onMouseDown = (e: MouseEvent) => {
      startPos = { x: e.clientX, y: e.clientY };
      timer = setTimeout(() => resolve(e.clientX, e.clientY), 600);
    };
    const onMouseMove = () => { if (timer) clear(); };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", clear);
    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("mouseup", clear);
    container.addEventListener("mousemove", onMouseMove);

    return () => {
      clear();
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", clear);
      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("mouseup", clear);
      container.removeEventListener("mousemove", onMouseMove);
    };
  }, [mapReady, onLongPressBlank]);

  // Update markers
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const map = mapRef.current;
    const Leaf = leafletRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const pin of pins) {
      const icon = Leaf.divIcon({
        html: createPinHTML(pin),
        className: "",
        iconSize: [80, 60],
        iconAnchor: [40, 55],
      });

      const marker = Leaf.marker([pin.lat, pin.lng], { icon }).addTo(map);

      if (onPinClick) {
        marker.on("click", () => onPinClick(pin));
      }

      markersRef.current.push(marker);
    }
  }, [pins, mapReady, onPinClick]);

  // Fog of war: project visited shops to pixel coords
  const updateFog = useCallback(() => {
    if (!mapRef.current) {
      setFogPoints([]);
      return;
    }
    const map = mapRef.current;
    const points: FogShopPoint[] = pins
      .filter((p) => p.temperature === "visited")
      .map((pin) => {
        const pt = map.latLngToContainerPoint([pin.lat, pin.lng]);
        return { x: pt.x, y: pt.y, radius: 150 };
      });
    setFogPoints(points);
  }, [pins]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    updateFog();
    map.on("move", updateFog);
    map.on("zoomend", updateFog);
    return () => {
      map.off("move", updateFog);
      map.off("zoomend", updateFog);
    };
  }, [mapReady, updateFog]);

  if (error) {
    return (
      <div className="w-full h-full bg-[#F0E8DE] flex items-center justify-center">
        <p className="text-sm text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 bg-[#F0E8DE] flex items-center justify-center">
          <span className="text-sm text-muted animate-pulse">加载地图中...</span>
        </div>
      )}
      {mapReady && <FogOverlay visitedShops={fogPoints} />}
    </div>
  );
}
