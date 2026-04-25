"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import FogOverlay, { type FogPoint } from "@/components/FogOverlay";

declare global {
  interface Window {
    AMap: typeof AMap;
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

declare namespace AMap {
  class Map {
    constructor(container: string | HTMLElement, opts?: MapOptions);
    destroy(): void;
    setCenter(center: [number, number]): void;
    getCenter(): { getLng(): number; getLat(): number };
    getZoom(): number;
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
    lngLatToContainer(lnglat: LngLat | [number, number]): Pixel;
  }
  class LngLat {
    constructor(lng: number, lat: number);
    getLng(): number;
    getLat(): number;
  }
  interface MapOptions {
    zoom?: number;
    center?: [number, number];
    mapStyle?: string;
    viewMode?: string;
    features?: string[];
    pitch?: number;
  }
  class Marker {
    constructor(opts?: MarkerOptions);
    setMap(map: Map | null): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
    getPosition(): { getLng(): number; getLat(): number };
  }
  interface MarkerOptions {
    position: [number, number];
    content?: string | HTMLElement;
    offset?: Pixel;
    anchor?: string;
  }
  class Pixel {
    constructor(x: number, y: number);
    getX(): number;
    getY(): number;
  }
}

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

const LONGHUA_BOUNDS = {
  north: 31.1830,
  south: 31.1720,
  west: 121.4460,
  east: 121.4580,
};

const AMAP_JS_KEY = process.env.NEXT_PUBLIC_AMAP_JS_KEY || "";
const AMAP_SECURITY_CODE = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || "";

function loadAMapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      resolve();
      return;
    }
    // AMap 2.0 security config (if provided)
    if (AMAP_SECURITY_CODE) {
      window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
    }
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_JS_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load AMap JS API"));
    document.head.appendChild(script);
  });
}

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

function extractLngLat(event: unknown): { lng: number; lat: number } | null {
  if (!event || typeof event !== "object") return null;

  const maybeEvent = event as {
    lnglat?: {
      getLng?: () => number;
      getLat?: () => number;
      lng?: number;
      lat?: number;
    };
  };

  const lnglat = maybeEvent.lnglat;
  if (!lnglat) return null;

  const lng = typeof lnglat.getLng === "function" ? lnglat.getLng() : lnglat.lng;
  const lat = typeof lnglat.getLat === "function" ? lnglat.getLat() : lnglat.lat;

  if (typeof lng !== "number" || typeof lat !== "number") return null;
  return { lng, lat };
 }

export default function MapView({
  pins, onPinClick, onLongPressBlank, city,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMap.Map | null>(null);
  const markersRef = useRef<AMap.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fogPoints, setFogPoints] = useState<FogPoint[]>([]);

  // Initialize map
  useEffect(() => {
    if (!AMAP_JS_KEY) {
      setError("请配置 NEXT_PUBLIC_AMAP_JS_KEY（Web端JS API 类型的 key）");
      return;
    }

    let destroyed = false;
    loadAMapScript()
      .then(() => {
        if (destroyed || !containerRef.current) return;
        const map = new window.AMap.Map(containerRef.current, {
          zoom: 16,
          center: CITY_CENTERS[city || "上海"] || CITY_CENTERS["上海"],
          mapStyle: "amap://styles/whitesmoke",
          viewMode: "2D",
          features: ["bg", "road", "building", "point"],
        });
        mapRef.current = map;
        setMapReady(true);
      })
      .catch(() => {
        if (!destroyed) setError("地图加载失败");
      });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  // Long press on map blank
  useEffect(() => {
    if (!mapReady || !mapRef.current || !onLongPressBlank) return;
    const map = mapRef.current;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pressLngLat: { lng: number; lat: number } | null = null;

    const onDown = (...args: unknown[]) => {
      pressLngLat = extractLngLat(args[0]);
      timer = setTimeout(() => {
        if (pressLngLat) {
          onLongPressBlank(pressLngLat);
          return;
        }
        const center = map.getCenter();
        onLongPressBlank({ lng: center.getLng(), lat: center.getLat() });
      }, 600);
    };
    const onUp = () => {
      if (timer) clearTimeout(timer);
      pressLngLat = null;
    };
    const onMove = () => {
      if (timer) clearTimeout(timer);
      pressLngLat = null;
    };

    map.on("mousedown", onDown);
    map.on("mouseup", onUp);
    map.on("mousemove", onMove);
    map.on("touchstart", onDown);
    map.on("touchend", onUp);
    map.on("touchmove", onMove);

    return () => {
      if (timer) clearTimeout(timer);
      pressLngLat = null;
    };
  }, [mapReady, onLongPressBlank]);

  // Update markers when pins change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Add new markers
    for (const pin of pins) {
      const marker = new window.AMap.Marker({
        position: [pin.lng, pin.lat],
        content: createPinHTML(pin),
        anchor: "bottom-center",
      });
      marker.setMap(mapRef.current);

      // Click
      if (onPinClick) {
        marker.on("click", () => onPinClick(pin));
      }

      markersRef.current.push(marker);
    }
  }, [pins, mapReady, onPinClick]);

  // Fog of war: project 龙华街道 bounding box to pixel coords
  const updateFog = useCallback(() => {
    if (!mapRef.current) {
      setFogPoints([]);
      return;
    }
    const map = mapRef.current;
    try {
      const nw = map.lngLatToContainer([LONGHUA_BOUNDS.west, LONGHUA_BOUNDS.north]);
      const se = map.lngLatToContainer([LONGHUA_BOUNDS.east, LONGHUA_BOUNDS.south]);
      const x1 = nw.getX(), y1 = nw.getY(), x2 = se.getX(), y2 = se.getY();
      if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) {
        setFogPoints([]);
        return;
      }
      setFogPoints([
        { x: x1, y: y1, weight: 0 },
        { x: x2, y: y2, weight: 0 },
      ]);
    } catch {
      setFogPoints([]);
    }
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    updateFog();
    map.on("moveend", updateFog);
    map.on("zoomend", updateFog);
    return () => {
      map.off("moveend", updateFog);
      map.off("zoomend", updateFog);
    };
  }, [mapReady, updateFog]);

  if (error) {
    return (
      <div className="w-full h-full bg-[#F0E8DE] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted mb-1">{error}</p>
          <p className="text-xs text-text-secondary">在 .env.local 中设置 NEXT_PUBLIC_AMAP_JS_KEY</p>
        </div>
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

      {/* Fog of war */}
      {mapReady && <FogOverlay exploredPoints={fogPoints} />}
    </div>
  );
}
