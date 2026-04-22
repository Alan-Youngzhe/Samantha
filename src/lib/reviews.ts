// 匿名单品消费情报系统 — 数据结构 + 聚合工具 + Trust Score

export interface ReviewRecord {
  id: string;
  storeName: string;       // "喜茶"
  storeLocation?: string;  // "龙华天街店"
  productName: string;     // "多肉葡萄"
  category: string;        // coffee/food/shopping/entertainment/daily/other
  price: number;           // 22
  sentiment: "positive" | "neutral" | "negative";
  comment: string;         // "比上次好喝"
  motive: string;          // emotional/impulse/habitual/social/need/reward
  motiveConfidence: "high" | "medium" | "low"; // Nick 对动机推断的置信度
  lat?: number;
  lng?: number;
  hour: number;            // 0-23
  dayOfWeek: number;       // 0-6
  timestamp: string;
  // Trust Score 体系
  trustScore: number;           // 0-100，评价可信度
  verified: boolean;            // Nick 是否已回访验证
  verifiedAt?: string;          // 验证时间
  hasMatchingSpending: boolean; // 是否有对应的 [SPENDING] 记录
  hasLocationMatch: boolean;    // 经纬度是否匹配店铺区域
  profileDepth: number;         // 用户画像深度（0-100）
}

// 从前端传过来的用户画像上下文（用于计算 trustScore）
export interface TrustContext {
  totalConversations: number;   // 历史对话总数
  totalSpendings: number;       // 历史消费记录数
  totalPatterns: number;        // 已识别的消费模式数
  totalCommitments: number;     // 承诺数
  triggerChainCount: number;    // 触发链数
  accountAgeDays: number;       // 账号年龄（天）
  hasMatchingSpending: boolean; // 本次评价是否有对应的 SPENDING 记录
  hasLocationMatch: boolean;    // 用户位置是否在店铺附近
}

export interface StoreSummary {
  storeName: string;
  storeLocation?: string;
  totalReviews: number;
  avgPrice: number;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  topProducts: ProductSummary[];
  lat?: number;
  lng?: number;
}

export interface ProductSummary {
  productName: string;
  reviewCount: number;
  avgPrice: number;
  sentiment: { positive: number; neutral: number; negative: number };
  recentComments: string[];
  motiveBreakdown: Record<string, number>;
  avgTrust: number;             // 平均可信度
  verifiedCount: number;        // 已验证评价数
  highConfidenceCount: number;  // 高置信度评价数
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 计算单条评价的可信度分数（0-100） */
export function calculateTrustScore(ctx: TrustContext): number {
  let score = 0;

  // 画像深度（最多40分）— 用户聊得越多越可信
  const depthScore = Math.min(40,
    (ctx.totalConversations >= 10 ? 10 : ctx.totalConversations) +
    (ctx.totalSpendings >= 5 ? 10 : ctx.totalSpendings * 2) +
    (ctx.totalPatterns >= 3 ? 5 : ctx.totalPatterns * 1.5) +
    (ctx.triggerChainCount >= 2 ? 5 : ctx.triggerChainCount * 2.5) +
    (ctx.totalCommitments >= 2 ? 5 : ctx.totalCommitments * 2.5) +
    Math.min(5, ctx.accountAgeDays / 6)  // 30天满5分
  );
  score += depthScore;

  // 行为一致性（20分）— 有对应的 SPENDING 记录
  if (ctx.hasMatchingSpending) score += 20;

  // 位置验证（20分）— 用户确实在店铺附近
  if (ctx.hasLocationMatch) score += 20;

  // 基础分（20分）— 只要不是全新用户就某个底分
  if (ctx.totalConversations >= 3) score += 10;
  if (ctx.accountAgeDays >= 7) score += 10;

  return Math.min(100, Math.round(score));
}

/** 计算画像深度分（0-100）用于展示 */
export function profileDepthScore(ctx: TrustContext): number {
  return Math.min(100, Math.round(
    Math.min(25, ctx.totalConversations * 2.5) +
    Math.min(25, ctx.totalSpendings * 5) +
    Math.min(20, ctx.totalPatterns * 6) +
    Math.min(15, ctx.triggerChainCount * 7) +
    Math.min(15, ctx.accountAgeDays / 2)
  ));
}

export function filterNearby(
  reviews: ReviewRecord[],
  lat: number,
  lng: number,
  radiusMeters: number = 500
): ReviewRecord[] {
  return reviews.filter(
    (r) =>
      r.lat != null &&
      r.lng != null &&
      haversineDistance(lat, lng, r.lat, r.lng) <= radiusMeters
  );
}

export function aggregateByStore(reviews: ReviewRecord[]): StoreSummary[] {
  const storeMap = new Map<string, ReviewRecord[]>();
  for (const r of reviews) {
    if (!storeMap.has(r.storeName)) storeMap.set(r.storeName, []);
    storeMap.get(r.storeName)!.push(r);
  }

  return Array.from(storeMap.entries()).map(([storeName, recs]) => {
    const productMap = new Map<string, ReviewRecord[]>();
    for (const r of recs) {
      if (!productMap.has(r.productName)) productMap.set(r.productName, []);
      productMap.get(r.productName)!.push(r);
    }

    const topProducts: ProductSummary[] = Array.from(productMap.entries())
      .map(([productName, pRecs]) => ({
        productName,
        reviewCount: pRecs.length,
        avgPrice: Math.round(pRecs.reduce((s, r) => s + r.price, 0) / pRecs.length),
        sentiment: {
          positive: pRecs.filter((r) => r.sentiment === "positive").length,
          neutral: pRecs.filter((r) => r.sentiment === "neutral").length,
          negative: pRecs.filter((r) => r.sentiment === "negative").length,
        },
        recentComments: pRecs
          .sort((a, b) => b.trustScore - a.trustScore || b.timestamp.localeCompare(a.timestamp))
          .slice(0, 3)
          .map((r) => r.comment),
        motiveBreakdown: pRecs.reduce<Record<string, number>>((acc, r) => {
          // 低置信度动机不计入动机分布
          if (r.motiveConfidence !== "low") acc[r.motive] = (acc[r.motive] || 0) + 1;
          return acc;
        }, {}),
        avgTrust: Math.round(
          pRecs.reduce((s, r) => s + r.trustScore * (r.motiveConfidence === "low" ? 0.3 : 1), 0) /
          pRecs.reduce((s, r) => s + (r.motiveConfidence === "low" ? 0.3 : 1), 0)
        ),
        verifiedCount: pRecs.filter((r) => r.verified).length,
        highConfidenceCount: pRecs.filter((r) => r.motiveConfidence === "high").length,
      }))
      .sort((a, b) => b.reviewCount - a.reviewCount);

    return {
      storeName,
      storeLocation: recs[0].storeLocation,
      totalReviews: recs.length,
      avgPrice: Math.round(recs.reduce((s, r) => s + r.price, 0) / recs.length),
      sentimentBreakdown: {
        positive: recs.filter((r) => r.sentiment === "positive").length,
        neutral: recs.filter((r) => r.sentiment === "neutral").length,
        negative: recs.filter((r) => r.sentiment === "negative").length,
      },
      topProducts,
      lat: recs[0].lat,
      lng: recs[0].lng,
    };
  }).sort((a, b) => b.totalReviews - a.totalReviews);
}

export function buildNearbySummary(reviews: ReviewRecord[]): string {
  if (reviews.length === 0) return "";

  // 城市层摘要：排除低置信度评价
  const credibleReviews = reviews.filter((r) => r.motiveConfidence !== "low");
  if (credibleReviews.length === 0) return "";

  const stores = aggregateByStore(credibleReviews);
  const lines: string[] = [];

  for (const store of stores.slice(0, 5)) {
    const sentTotal = store.totalReviews;
    const posRate = sentTotal > 0 ? Math.round((store.sentimentBreakdown.positive / sentTotal) * 100) : 0;

    let storeLine = `${store.storeName}${store.storeLocation ? `(${store.storeLocation})` : ""}：${store.totalReviews}人消费过，均价¥${store.avgPrice}，${posRate}%好评`;

    for (const p of store.topProducts.slice(0, 3)) {
      const comments = p.recentComments.filter(Boolean).slice(0, 2);
      const commentStr = comments.length > 0 ? `，有人说"${comments.join('"、"')}"` : "";
      // Trust + Confidence 标注
      const trustLabel = p.avgTrust >= 70 ? "（高可信度）" : p.avgTrust >= 40 ? "" : "（可信度偏低）";
      const verifiedLabel = p.verifiedCount > 0 ? `，${p.verifiedCount}人已回访验证` : "";
      const confLabel = p.highConfidenceCount > 0 && p.reviewCount >= 2 ? `（基于${p.highConfidenceCount}条高置信度评价）` : "";
      storeLine += `\n  - ${p.productName}：${p.reviewCount}人买过，均价¥${p.avgPrice}${trustLabel}${verifiedLabel}${confLabel}${commentStr}`;

      const emotionalCount = (p.motiveBreakdown["emotional"] || 0) + (p.motiveBreakdown["impulse"] || 0);
      if (emotionalCount > 0 && p.reviewCount >= 2) {
        storeLine += `（其中${emotionalCount}人是情绪/冲动消费）`;
      }
    }

    lines.push(storeLine);
  }

  return lines.join("\n");
}
