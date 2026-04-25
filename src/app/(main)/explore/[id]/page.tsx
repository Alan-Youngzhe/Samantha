"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ExternalLink, MessageCircle } from "lucide-react";

interface Review {
  id: string;
  storeName: string;
  productName: string;
  category: string;
  price: number;
  comment: string;
  sentiment: "positive" | "neutral" | "negative";
  motive?: string;
  lat?: number;
  lng?: number;
  trustScore: number;
  timestamp: string;
  verified: boolean;
}

export default function ShopArchivePage() {
  const params = useParams();
  const router = useRouter();
  const storeId = decodeURIComponent(params.id as string);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/reviews?store=${encodeURIComponent(storeId)}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
        }
      } catch (e) {
        console.error("Failed to load reviews:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storeId]);

  const avgPrice = reviews.length > 0
    ? Math.round(reviews.reduce((sum, r) => sum + r.price, 0) / reviews.length)
    : 0;
  const avgTrust = reviews.length > 0
    ? Math.round(reviews.reduce((sum, r) => sum + r.trustScore, 0) / reviews.length)
    : 0;
  const topCategory = reviews.length > 0
    ? reviews.reduce((acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};
  const categoryLabel = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || "未知";
  const sentimentCounts = reviews.reduce(
    (acc, review) => {
      acc[review.sentiment] += 1;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 }
  );
  const topProducts = Object.entries(
    reviews.reduce((acc, review) => {
      acc[review.productName] = (acc[review.productName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const mapLat = reviews.find((review) => review.lat != null)?.lat;
  const mapLng = reviews.find((review) => review.lng != null)?.lng;
  const navHref = mapLat != null && mapLng != null
    ? `https://uri.amap.com/navigation?to=${mapLng},${mapLat},${encodeURIComponent(storeId)}&mode=walk&src=samantha&coordinate=gaode&callnative=1`
    : null;

  const sentimentWidth = (count: number) => (reviews.length > 0 ? `${Math.max((count / reviews.length) * 100, count > 0 ? 8 : 0)}%` : "0%");

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg text-text-secondary hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{storeId}</h1>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-muted animate-pulse">加载中...</span>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="px-5 pb-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-2xl py-3 text-center border border-card-border">
                <p className="text-lg font-bold text-foreground">¥{avgPrice}</p>
                <p className="text-[10px] text-muted mt-0.5">均价</p>
              </div>
              <div className="bg-card rounded-2xl py-3 text-center border border-card-border">
                <p className="text-lg font-bold text-foreground">{reviews.length}</p>
                <p className="text-[10px] text-muted mt-0.5">条情报</p>
              </div>
              <div className="bg-card rounded-2xl py-3 text-center border border-card-border">
                <p className="text-lg font-bold text-foreground">{avgTrust}%</p>
                <p className="text-[10px] text-muted mt-0.5">可信度</p>
              </div>
            </div>
          </div>

          {/* Category tag */}
          <div className="px-5 pb-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-block px-3 py-1 rounded-full bg-surface text-xs text-text-secondary font-medium">
                {categoryLabel}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sessionStorage.setItem("samantha_prefill", `帮我看看 ${storeId} 这家店值不值得去？`);
                    router.push("/sami");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-card-border bg-white text-xs text-text-warm hover:bg-card transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  问 Samantha
                </button>
                {navHref && (
                  <a
                    href={navHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-card-border bg-white text-xs text-text-warm hover:bg-card transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    去导航
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="px-5 pb-4">
            <div className="bg-card rounded-2xl border border-card-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-foreground">情绪分布</h2>
                <span className="text-[11px] text-muted">基于 {reviews.length} 条情报</span>
              </div>
              <div className="h-2 w-full bg-surface rounded-full overflow-hidden flex">
                <div className="bg-success h-full" style={{ width: sentimentWidth(sentimentCounts.positive) }} />
                <div className="bg-warm-gold h-full" style={{ width: sentimentWidth(sentimentCounts.neutral) }} />
                <div className="bg-accent h-full" style={{ width: sentimentWidth(sentimentCounts.negative) }} />
              </div>
              <div className="flex items-center gap-4 mt-3 text-[11px] text-muted">
                <span>喜欢 {sentimentCounts.positive}</span>
                <span>一般 {sentimentCounts.neutral}</span>
                <span>踩雷 {sentimentCounts.negative}</span>
              </div>
              {topProducts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {topProducts.map(([product, count]) => (
                    <span
                      key={product}
                      className="px-2.5 py-1 rounded-full bg-white border border-card-border text-[11px] text-text-warm"
                    >
                      {product} · {count}次
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 适合场景 */}
          {(() => {
            const motiveCount: Record<string, number> = {};
            const hourCount: Record<number, number> = {};
            for (const r of reviews) {
              if (r.motive) motiveCount[r.motive] = (motiveCount[r.motive] || 0) + 1;
              const h = new Date(r.timestamp).getHours();
              hourCount[h] = (hourCount[h] || 0) + 1;
            }
            const total = reviews.length;
            const tags: string[] = [];
            const socialRatio = (motiveCount["social"] || 0) / total;
            const rewardRatio = (motiveCount["reward"] || 0) / total;
            const emotionalRatio = ((motiveCount["emotional"] || 0) + (motiveCount["impulse"] || 0)) / total;
            const eveningCount = Object.entries(hourCount).filter(([h]) => parseInt(h) >= 18).reduce((s, [, c]) => s + c, 0);
            if (socialRatio >= 0.3) tags.push("👥 适合和朋友去");
            if (rewardRatio >= 0.25) tags.push("🎁 适合犒劳自己");
            if (emotionalRatio >= 0.35) tags.push("💭 情绪驱动的选择");
            if (eveningCount / total >= 0.4) tags.push("🌙 适合晚上去坐坐");
            if (sentimentCounts.positive / total >= 0.7) tags.push("👍 口碑不错");
            if (tags.length === 0) return null;
            return (
              <div className="px-5 pb-4">
                <div className="bg-card rounded-2xl border border-card-border p-4">
                  <h2 className="text-sm font-semibold text-foreground mb-2">适合场景</h2>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-full bg-surface text-[12px] text-foreground leading-snug">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Review list */}
          <div className="px-5 pb-8 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">消费情报</h2>
            {reviews.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">暂无情报数据</p>
            ) : (
              reviews.map((r) => (
                <div
                  key={r.id}
                  className="bg-card rounded-2xl p-3.5 border border-card-border"
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.productName}</p>
                      <span className="text-xs text-muted">
                        {new Date(r.timestamp).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <span className="text-xs text-foreground font-semibold">¥{r.price}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{r.comment || "这条情报还没有留下具体感受。"}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      r.verified
                        ? "bg-success/10 text-success"
                        : "bg-muted/10 text-muted"
                    }`}>
                      {r.verified ? "✓ 已验证" : "待验证"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      r.sentiment === "positive"
                        ? "bg-success/10 text-success"
                        : r.sentiment === "negative"
                          ? "bg-accent/10 text-accent"
                          : "bg-warm-gold/10 text-warm-gold"
                    }`}>
                      {r.sentiment === "positive" ? "喜欢" : r.sentiment === "negative" ? "踩雷" : "一般"}
                    </span>
                    <span className="text-[10px] text-muted">可信度 {r.trustScore}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
