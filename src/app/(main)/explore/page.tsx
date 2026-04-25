"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MapView from "@/components/MapView";
import { getProfile } from "@/lib/memory";

interface ShopPin {
  id: string;
  poiId?: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  visitCount: number;
  avgPrice: number;
  temperature: "hot" | "active" | "caution" | "unknown" | "visited";
  posRate?: number;
  topComment?: string;
  hasCaution?: boolean;
  address?: string;
  amapRating?: number;
  distance?: number;
  photos?: string[];
  openTime?: string;
}

interface PoiItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  address: string;
  rating?: number;
  avgPrice?: number;
  distance?: number;
  photos?: string[];
  openTime?: string;
}

// Default center: 龙华街道
const DEFAULT_LAT = 31.1775;
const DEFAULT_LNG = 121.4510;

export default function ExplorePage() {
  const router = useRouter();
  const [pins, setPins] = useState<ShopPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<ShopPin | null>(null);
  const [city, setCity] = useState("上海");
  const [askPopup, setAskPopup] = useState<{ lng: number; lat: number } | null>(null);

  const handleLongPressBlank = (lnglat: { lng: number; lat: number }) => {
    setAskPopup(lnglat);
  };

  const askSamanthaAboutArea = (question: string) => {
    sessionStorage.setItem("samantha_prefill", question);
    if (askPopup) {
      sessionStorage.setItem("samantha_prefill_location", JSON.stringify(askPopup));
    }
    setAskPopup(null);
    router.push("/sami");
  };

  useEffect(() => {
    async function loadPins() {
      try {
        let centerLat = DEFAULT_LAT;
        let centerLng = DEFAULT_LNG;

        // Try to get user location
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
          );
          centerLat = pos.coords.latitude;
          centerLng = pos.coords.longitude;
        } catch {
          // use default
        }

        // Parallel fetch: POI (Amap) + Reviews (Supabase)
        const [poiRes, reviewRes] = await Promise.all([
          fetch(`/api/poi?lat=${centerLat}&lng=${centerLng}&radius=1500&types=050000|050500|060100`).then(r => r.ok ? r.json() : { pois: [] }).catch(() => ({ pois: [] })),
          fetch("/api/reviews").then(r => r.ok ? r.json() : { reviews: [] }).catch(() => ({ reviews: [] })),
        ]);

        const poiList: PoiItem[] = poiRes.pois || [];
        const reviews = reviewRes.reviews || [];

        // Build review aggregation by store name
        const reviewMap = new Map<string, { count: number; totalPrice: number; positive: number; neutral: number; negative: number; comments: string[]; lat: number; lng: number; category: string }>();
        for (const r of reviews) {
          if (!r.storeName) continue;
          const key = r.storeName;
          if (!reviewMap.has(key)) {
            reviewMap.set(key, { count: 0, totalPrice: 0, positive: 0, neutral: 0, negative: 0, comments: [], lat: r.lat || 0, lng: r.lng || 0, category: r.category || "other" });
          }
          const s = reviewMap.get(key)!;
          s.count++;
          s.totalPrice += r.price || 0;
          if (r.sentiment === "positive") s.positive++;
          else if (r.sentiment === "negative") s.negative++;
          else s.neutral++;
          if (r.comment && s.comments.length < 3) s.comments.push(r.comment);
        }

        // Merge: start with POI as base, overlay reviews
        const merged = new Map<string, ShopPin>();

        for (const poi of poiList) {
          if (!poi.lat || !poi.lng) continue;
          merged.set(poi.name, {
            id: poi.name,
            poiId: poi.id,
            name: poi.name,
            lat: poi.lat,
            lng: poi.lng,
            category: poi.category,
            visitCount: 0,
            avgPrice: poi.avgPrice || 0,
            temperature: "unknown",
            address: poi.address,
            amapRating: poi.rating,
            distance: poi.distance,
            photos: poi.photos,
            openTime: poi.openTime,
          });
        }

        // Overlay review data
        reviewMap.forEach((rv, storeName) => {
          const total = rv.positive + rv.neutral + rv.negative;
          const posRate = total > 0 ? Math.round((rv.positive / total) * 100) : 0;
          let temperature: ShopPin["temperature"] = "unknown";
          if (rv.count >= 8 && posRate >= 60) temperature = "hot";
          else if (rv.count >= 4 && posRate >= 50) temperature = "active";
          else if (rv.count >= 2 && posRate < 50) temperature = "caution";
          else if (rv.count >= 1) temperature = "active";

          const existing = merged.get(storeName);
          if (existing) {
            existing.visitCount = rv.count;
            existing.avgPrice = rv.count > 0 ? Math.round(rv.totalPrice / rv.count) : existing.avgPrice;
            existing.temperature = temperature;
            existing.posRate = posRate;
            existing.topComment = rv.comments[0];
            existing.hasCaution = rv.negative > 0 && total > 0 && (rv.negative / total) > 0.3;
          } else if (rv.lat && rv.lng) {
            merged.set(storeName, {
              id: storeName,
              name: storeName,
              lat: rv.lat,
              lng: rv.lng,
              category: rv.category,
              visitCount: rv.count,
              avgPrice: rv.count > 0 ? Math.round(rv.totalPrice / rv.count) : 0,
              temperature,
              posRate,
              topComment: rv.comments[0],
              hasCaution: rv.negative > 0 && total > 0 && (rv.negative / total) > 0.3,
            });
          }
        });

        const result = Array.from(merged.values());

        // Mark shops user has visited
        const profile = getProfile();
        if (profile) {
          const visitedLocations = new Set(
            (profile.spendings || []).filter((s) => s.location).map((s) => s.location!)
          );
          for (const pin of result) {
            if (visitedLocations.has(pin.name)) {
              pin.temperature = "visited";
            }
          }
        }

        setPins(result);
      } catch (e) {
        console.error("Failed to load pins:", e);
      } finally {
        setLoading(false);
      }
    }
    loadPins();
    const storedCity = localStorage.getItem("sanxing_city");
    if (storedCity) setCity(storedCity);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Top row */}
      <div className="flex items-center justify-between px-5 pt-2 pb-1">
        <div className="px-3.5 py-1.5 rounded-2xl bg-surface">
          <span className="text-[13px] font-semibold text-foreground">{new Date().getMonth() + 1}月 · {city}</span>
        </div>
        <div className="w-11 h-11 rounded-[14px] overflow-hidden shadow-sm ring-1 ring-black/5 opacity-90">
          <img src="/logo.svg" alt="Samantha" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="px-5 pb-2">
        <div className="flex gap-2 overflow-x-auto">
          <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-card border border-card-border px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-[11px] text-text-secondary">口碑好·很多人去</span>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-card border border-card-border px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-[#D4A853]" />
            <span className="text-[11px] text-text-secondary">有热度</span>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-card border border-card-border px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-[#7CAF6B]" />
            <span className="text-[11px] text-text-secondary">你去过</span>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-card border border-card-border px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-[#E8564A] opacity-60" />
            <span className="text-[11px] text-text-secondary">有人踩过雷</span>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-card border border-card-border px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-[#D4C4B4]" />
            <span className="text-[11px] text-text-secondary">还没人提过</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted leading-relaxed">
          地图上的店铺来自高德实时数据，颜色来自大家聊到的真实消费记录。颜色代表口碑，不是广告。
        </p>
      </div>

      {/* Map area */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="w-full h-full bg-[#F0E8DE] flex items-center justify-center">
            <span className="text-sm text-muted animate-pulse">加载数据...</span>
          </div>
        ) : (
          <MapView
            pins={pins}
            city={city}
            onPinClick={(pin) => {
              setSelectedPin(pin);
            }}
            onLongPressBlank={handleLongPressBlank}
          />
        )}
      </div>

      {/* Bottom section: either shop detail or Samantha insight */}
      {selectedPin ? (
        <div className="px-4 py-3">
          <div className="bg-card rounded-2xl p-4 border border-card-border">
            {/* Photos carousel */}
            {selectedPin.photos && selectedPin.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto mb-3 -mx-1 px-1">
                {selectedPin.photos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`${selectedPin.name} ${i + 1}`}
                    className="shrink-0 w-24 h-24 rounded-xl object-cover bg-surface"
                  />
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{selectedPin.name}</h3>
                {selectedPin.amapRating && selectedPin.amapRating > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[#D4A853]/10 text-[#D4A853]">
                    {selectedPin.amapRating}分
                  </span>
                )}
                {selectedPin.posRate != null && selectedPin.visitCount >= 3 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    selectedPin.posRate >= 70 ? "bg-[#7CAF6B]/10 text-[#7CAF6B]"
                    : selectedPin.posRate >= 50 ? "bg-[#D4A853]/10 text-[#D4A853]"
                    : "bg-[#E8564A]/10 text-[#E8564A]"
                  }`}>
                    {selectedPin.posRate}%好评
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPin(null)}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            {(selectedPin.address || selectedPin.openTime) && (
              <div className="flex items-center gap-2 mb-2 text-[11px] text-muted">
                {selectedPin.address && <span>{selectedPin.address}</span>}
                {selectedPin.openTime && <span>· {selectedPin.openTime}</span>}
              </div>
            )}
            <div className="flex gap-3 mb-2">
              {selectedPin.avgPrice > 0 && (
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">¥{selectedPin.avgPrice}</p>
                  <p className="text-[10px] text-muted">均价</p>
                </div>
              )}
              {selectedPin.visitCount > 0 && (
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{selectedPin.visitCount}</p>
                  <p className="text-[10px] text-muted">条情报</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{selectedPin.category}</p>
                <p className="text-[10px] text-muted">品类</p>
              </div>
              {selectedPin.distance != null && (
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{selectedPin.distance}m</p>
                  <p className="text-[10px] text-muted">距你</p>
                </div>
              )}
            </div>
            {selectedPin.hasCaution && selectedPin.visitCount >= 3 && (
              <p className="text-[11px] text-[#E8564A] mb-2">有人踩过雷</p>
            )}
            {selectedPin.topComment && selectedPin.visitCount >= 3 && (
              <p className="text-[11px] text-text-secondary leading-relaxed mb-2 border-l-2 border-[#D4A853]/30 pl-2">
                &ldquo;{selectedPin.topComment}&rdquo;
              </p>
            )}
            {selectedPin.visitCount > 0 ? (
              <a
                href={`/explore/${encodeURIComponent(selectedPin.id)}`}
                className="block text-center text-xs text-accent font-medium py-2 rounded-xl border border-accent/20 hover:bg-accent/5 transition-colors"
              >
                查看店铺档案 →
              </a>
            ) : (
              <button
                onClick={() => {
                  sessionStorage.setItem("samantha_prefill", `${selectedPin.name}怎么样？`);
                  router.push("/sami");
                }}
                className="w-full text-center text-xs text-accent font-medium py-2 rounded-xl border border-accent/20 hover:bg-accent/5 transition-colors"
              >
                问问 Samantha →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 py-2">
          <div className="bg-foreground rounded-[14px] px-3.5 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-semibold text-[#F5E6DA]">Samantha 说</span>
            </div>
            <p className="text-xs text-[#F5E6DA] leading-relaxed">
              {(() => {
                const visitedCount = pins.filter((p) => p.temperature === "visited").length;
                const reviewedCount = pins.filter((p) => p.visitCount > 0).length;
                if (pins.length === 0) return "我对这座城市还很陌生。你每次带我去一个新地方，我就多认识一点。";
                if (visitedCount > 0) return `附近有 ${pins.length} 家店，其中 ${reviewedCount} 家有消费情报，${visitedCount} 家是你去过的。点开看看，或者长按空白处问我。`;
                return `附近有 ${pins.length} 家店，${reviewedCount} 家有消费情报。地图上的信息来自大家聊到的真实消费记录。长按地图空白处可以问我。`;
              })()}
            </p>
          </div>
        </div>
      )}

      {/* Long-press "Ask Samantha" popup */}
      {askPopup && (
        <div className="absolute inset-0 z-50 flex items-end justify-center pb-24" onClick={() => setAskPopup(null)}>
          <div
            className="bg-card rounded-2xl border border-card-border p-4 mx-4 w-full max-w-sm shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-foreground mb-3">问 Samantha</p>
            <div className="flex flex-col gap-2">
              {[
                "这附近有什么好吃的？",
                "这个区域怎么样？",
                "推荐一家咖啡店",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => askSamanthaAboutArea(q)}
                  className="text-left text-sm text-text-warm bg-white rounded-[14px] border border-card-border px-3.5 py-2.5 hover:bg-surface transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
