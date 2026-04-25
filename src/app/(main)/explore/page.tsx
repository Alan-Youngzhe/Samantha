"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MapView from "@/components/MapView";
import { unknownStoreLocations } from "@/lib/seed-shops";
import { getProfile } from "@/lib/memory";

interface ShopPin {
  id: string;
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
}

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
        const res = await fetch("/api/reviews");
        if (res.ok) {
          const data = await res.json();
          const reviews = data.reviews || [];
          // Aggregate by store
          const storeMap = new Map<string, { name: string; lat: number; lng: number; category: string; count: number; totalPrice: number; positive: number; neutral: number; negative: number; comments: string[] }>();
          for (const r of reviews) {
            if (!r.lat || !r.lng) continue;
            const key = r.storeName;
            if (!storeMap.has(key)) {
              storeMap.set(key, { name: r.storeName, lat: r.lat, lng: r.lng, category: r.category, count: 0, totalPrice: 0, positive: 0, neutral: 0, negative: 0, comments: [] });
            }
            const s = storeMap.get(key)!;
            s.count++;
            s.totalPrice += r.price;
            if (r.sentiment === "positive") s.positive++;
            else if (r.sentiment === "negative") s.negative++;
            else s.neutral++;
            if (r.comment && s.comments.length < 3) s.comments.push(r.comment);
          }
          const result: ShopPin[] = [];
          storeMap.forEach((v, k) => {
            const total = v.positive + v.neutral + v.negative;
            const posRate = total > 0 ? Math.round((v.positive / total) * 100) : 0;
            let temperature: ShopPin["temperature"] = "unknown";
            if (v.count >= 8 && posRate >= 60) temperature = "hot";
            else if (v.count >= 4 && posRate >= 50) temperature = "active";
            else if (v.count >= 2 && posRate < 50) temperature = "caution";
            else if (v.count >= 1) temperature = "active";
            result.push({
              id: k,
              name: v.name,
              lat: v.lat,
              lng: v.lng,
              category: v.category,
              visitCount: v.count,
              avgPrice: Math.round(v.totalPrice / v.count),
              temperature,
              posRate,
              topComment: v.comments[0],
              hasCaution: v.negative > 0 && total > 0 && (v.negative / total) > 0.3,
            });
          });
          // Add unknown stores as gray pins
          const knownNames = new Set(result.map((p: ShopPin) => p.name));
          for (const u of unknownStoreLocations) {
            if (!knownNames.has(u.storeName)) {
              result.push({
                id: u.storeName,
                name: u.storeName,
                lat: u.lat,
                lng: u.lng,
                category: u.category,
                visitCount: 0,
                avgPrice: 0,
                temperature: "unknown",
              });
            }
          }
          // Mark shops user has visited (from spending records)
          const profile = getProfile();
          if (profile) {
            const spendings = profile.spendings || [];
            const visitedLocations = new Set(
              spendings.filter((s) => s.location).map((s) => s.location!)
            );
            for (const pin of result) {
              if (visitedLocations.has(pin.name)) {
                pin.temperature = "visited";
              }
            }
          }
          setPins(result);
        }
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
            <span className="text-[11px] text-text-secondary">很多人去</span>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-card border border-card-border px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-[#D4A853]" />
            <span className="text-[11px] text-text-secondary">最近有热度</span>
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
          这些点来自大家聊到的真实消费记录，也包括你自己的消费足迹。
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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{selectedPin.name}</h3>
                {selectedPin.posRate != null && (
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
            <div className="flex gap-3 mb-2">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">¥{selectedPin.avgPrice}</p>
                <p className="text-[10px] text-muted">均价</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{selectedPin.visitCount}</p>
                <p className="text-[10px] text-muted">条情报</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{selectedPin.category}</p>
                <p className="text-[10px] text-muted">品类</p>
              </div>
            </div>
            {selectedPin.hasCaution && (
              <p className="text-[11px] text-[#E8564A] mb-2">⚠ 有人踩过雷</p>
            )}
            {selectedPin.topComment && (
              <p className="text-[11px] text-text-secondary leading-relaxed mb-2 border-l-2 border-[#D4A853]/30 pl-2">
                "{selectedPin.topComment}"
              </p>
            )}
            <a
              href={`/explore/${encodeURIComponent(selectedPin.id)}`}
              className="block text-center text-xs text-accent font-medium py-2 rounded-xl border border-accent/20 hover:bg-accent/5 transition-colors"
            >
              查看店铺档案 →
            </a>
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
                if (pins.length === 0) return "我对这座城市还很陌生。你每次带我去一个新地方，我就多认识一点。";
                if (visitedCount > 0) return `这片区域我已经记住了 ${pins.length} 家店，其中 ${visitedCount} 家是你真的去过的。地图上的点来自大家聊到的消费记录，也包括你的足迹。长按空白处可以直接问我。`;
                return `这里现在有 ${pins.length} 家店被我记下了。地图上的信息来自大家聊到的真实消费记录。点开店铺档案，或者长按地图空白处问我这附近怎么样。`;
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
