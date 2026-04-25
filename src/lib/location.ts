// LBS 空间感知模块 — 浏览器定位 + 高德逆地理编码（通过 /api/geocode 代理）

export interface LocationInfo {
  lat: number;
  lng: number;
  name: string; // 人类可读地点名称
}

const LOCATION_CACHE_KEY = "bz-last-location";

/** 获取当前位置（浏览器 Geolocation API） */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("浏览器不支持定位"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000, // 5min cache
    });
  });
}

/** 高德逆地理编码（通过服务端 /api/geocode 代理，保护 API key） */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
    if (!res.ok) return `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const data = await res.json();
    return data.name || `${lat.toFixed(4)},${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  }
}

/** 一站式获取地理位置信息 */
export async function getLocationInfo(): Promise<LocationInfo | null> {
  try {
    const pos = await getCurrentPosition();
    const { latitude: lat, longitude: lng } = pos.coords;
    const name = await reverseGeocode(lat, lng);
    const info: LocationInfo = { lat, lng, name };
    // Cache it
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(info));
    }
    return info;
  } catch {
    return null;
  }
}

/** 获取缓存的上次位置 */
export function getCachedLocation(): LocationInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LOCATION_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocationInfo;
  } catch {
    return null;
  }
}
