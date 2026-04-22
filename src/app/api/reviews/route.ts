// 匿名单品消费情报 API — 内存存储 + 龙华商圈 demo 数据

import { NextResponse } from "next/server";
import type { ReviewRecord, TrustContext } from "@/lib/reviews";
import { filterNearby, buildNearbySummary, calculateTrustScore, profileDepthScore } from "@/lib/reviews";

function ts(daysAgo: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

// 龙华天街坐标中心
const LH = { lat: 22.6540, lng: 114.0255 };
// 壹方天地
const YF = { lat: 22.6580, lng: 114.0230 };
// 龙华大道
const LD = { lat: 22.6510, lng: 114.0240 };

function j(base: number, r = 0.001): number {
  return base + (Math.random() - 0.5) * r;
}

let nextId = 1;
function rid(): string {
  return `demo-${nextId++}`;
}

// demo 用户的 trust 字段 — 模拟不同画像深度的用户
function demoTrust(level: "high" | "mid" | "low"): Pick<ReviewRecord, "trustScore" | "verified" | "hasMatchingSpending" | "hasLocationMatch" | "profileDepth" | "motiveConfidence"> {
  if (level === "high") return { trustScore: 82 + Math.floor(Math.random() * 10), verified: true, hasMatchingSpending: true, hasLocationMatch: true, profileDepth: 75 + Math.floor(Math.random() * 15), motiveConfidence: "high" };
  if (level === "mid") return { trustScore: 55 + Math.floor(Math.random() * 15), verified: false, hasMatchingSpending: true, hasLocationMatch: true, profileDepth: 40 + Math.floor(Math.random() * 20), motiveConfidence: "medium" };
  return { trustScore: 20 + Math.floor(Math.random() * 15), verified: false, hasMatchingSpending: false, hasLocationMatch: false, profileDepth: 10 + Math.floor(Math.random() * 15), motiveConfidence: "low" };
}

const DEMO_REVIEWS: ReviewRecord[] = [
  // ── 喜茶（龙华天街） ──
  { id: rid(), storeName: "喜茶", storeLocation: "龙华天街店", productName: "多肉葡萄", category: "coffee", price: 22, sentiment: "positive", comment: "每次路过都忍不住，葡萄很新鲜", motive: "habitual", lat: j(LH.lat), lng: j(LH.lng), hour: 15, dayOfWeek: 3, timestamp: ts(1, 15), ...demoTrust("high") },
  { id: rid(), storeName: "喜茶", storeLocation: "龙华天街店", productName: "多肉葡萄", category: "coffee", price: 22, sentiment: "positive", comment: "比上次好喝，冰度刚好", motive: "emotional", lat: j(LH.lat), lng: j(LH.lng), hour: 20, dayOfWeek: 5, timestamp: ts(2, 20), ...demoTrust("mid") },
  { id: rid(), storeName: "喜茶", storeLocation: "龙华天街店", productName: "多肉葡萄", category: "coffee", price: 22, sentiment: "negative", comment: "今天太甜了，是不是换了配方", motive: "impulse", lat: j(LH.lat), lng: j(LH.lng), hour: 22, dayOfWeek: 6, timestamp: ts(3, 22), ...demoTrust("low") },
  { id: rid(), storeName: "喜茶", storeLocation: "龙华天街店", productName: "芝芝莓莓", category: "coffee", price: 25, sentiment: "positive", comment: "草莓季限定，必买", motive: "social", lat: j(LH.lat), lng: j(LH.lng), hour: 14, dayOfWeek: 0, timestamp: ts(1, 14), ...demoTrust("high") },
  { id: rid(), storeName: "喜茶", storeLocation: "龙华天街店", productName: "芝芝莓莓", category: "coffee", price: 25, sentiment: "neutral", comment: "排了20分钟就这？", motive: "social", lat: j(LH.lat), lng: j(LH.lng), hour: 15, dayOfWeek: 0, timestamp: ts(4, 15), ...demoTrust("mid") },
  { id: rid(), storeName: "喜茶", storeLocation: "龙华天街店", productName: "烤黑糖波波牛乳", category: "coffee", price: 19, sentiment: "positive", comment: "便宜又好喝，波波很Q", motive: "habitual", lat: j(LH.lat), lng: j(LH.lng), hour: 16, dayOfWeek: 2, timestamp: ts(5, 16), ...demoTrust("high") },

  // ── 瑞幸（龙华天街） ──
  { id: rid(), storeName: "瑞幸", storeLocation: "龙华天街店", productName: "生椰拿铁", category: "coffee", price: 16, sentiment: "positive", comment: "永远的神，9.9活动太香了", motive: "habitual", lat: j(LH.lat), lng: j(LH.lng), hour: 9, dayOfWeek: 1, timestamp: ts(1, 9), ...demoTrust("high") },
  { id: rid(), storeName: "瑞幸", storeLocation: "龙华天街店", productName: "生椰拿铁", category: "coffee", price: 16, sentiment: "positive", comment: "续命咖啡，每天一杯", motive: "habitual", lat: j(LH.lat), lng: j(LH.lng), hour: 10, dayOfWeek: 2, timestamp: ts(2, 10), ...demoTrust("high") },
  { id: rid(), storeName: "瑞幸", storeLocation: "龙华天街店", productName: "生椰拿铁", category: "coffee", price: 9.9, sentiment: "positive", comment: "9坩9还要什么自行车", motive: "habitual", lat: j(LH.lat), lng: j(LH.lng), hour: 8, dayOfWeek: 3, timestamp: ts(3, 8), ...demoTrust("mid") },
  { id: rid(), storeName: "瑞幸", storeLocation: "龙华天街店", productName: "橙C美式", category: "coffee", price: 13, sentiment: "neutral", comment: "一般般，还是生椰好喝", motive: "need", lat: j(LH.lat), lng: j(LH.lng), hour: 14, dayOfWeek: 4, timestamp: ts(4, 14), ...demoTrust("mid") },
  { id: rid(), storeName: "瑞幸", storeLocation: "龙华天街店", productName: "厚乳拿铁", category: "coffee", price: 16, sentiment: "negative", comment: "甜到齁，下次不点了", motive: "impulse", lat: j(LH.lat), lng: j(LH.lng), hour: 15, dayOfWeek: 5, timestamp: ts(1, 15), ...demoTrust("low") },

  // ── 海底捞（龙华天街） ──
  { id: rid(), storeName: "海底捞", storeLocation: "龙华天街店", productName: "番茄锅底", category: "food", price: 158, sentiment: "positive", comment: "番茄锅永远不会踩雷", motive: "social", lat: j(LH.lat), lng: j(LH.lng), hour: 19, dayOfWeek: 5, timestamp: ts(2, 19), ...demoTrust("high") },
  { id: rid(), storeName: "海底捞", storeLocation: "龙华天街店", productName: "番茄锅底", category: "food", price: 175, sentiment: "negative", comment: "排了一个半小时不值得，下次不来了", motive: "social", lat: j(LH.lat), lng: j(LH.lng), hour: 18, dayOfWeek: 6, timestamp: ts(1, 18), ...demoTrust("mid") },
  { id: rid(), storeName: "海底捞", storeLocation: "龙华天街店", productName: "捞派牛肉粒", category: "food", price: 38, sentiment: "positive", comment: "必点，小料加麻酱绝了", motive: "social", lat: j(LH.lat), lng: j(LH.lng), hour: 19, dayOfWeek: 6, timestamp: ts(1, 19), ...demoTrust("high") },

  // ── 外婆家（龙华天街） ──
  { id: rid(), storeName: "外婆家", storeLocation: "龙华天街店", productName: "茶香鸡", category: "food", price: 48, sentiment: "positive", comment: "性价比之王，每次来必点", motive: "reward", lat: j(LH.lat), lng: j(LH.lng), hour: 12, dayOfWeek: 5, timestamp: ts(3, 12), ...demoTrust("high") },
  { id: rid(), storeName: "外婆家", storeLocation: "龙华天街店", productName: "西湖醋鱼", category: "food", price: 38, sentiment: "neutral", comment: "中规中矩，没有很惊艳", motive: "need", lat: j(LH.lat), lng: j(LH.lng), hour: 12, dayOfWeek: 2, timestamp: ts(5, 12), ...demoTrust("mid") },
  { id: rid(), storeName: "外婆家", storeLocation: "龙华天街店", productName: "麻婆豆腐", category: "food", price: 22, sentiment: "positive", comment: "3块钱的麻婆豆腐哪里找去，便宜到离谱", motive: "need", lat: j(LH.lat), lng: j(LH.lng), hour: 12, dayOfWeek: 4, timestamp: ts(6, 12), ...demoTrust("mid") },

  // ── ZARA（龙华天街） ──
  { id: rid(), storeName: "ZARA", storeLocation: "龙华天街店", productName: "亚麻衬衫", category: "shopping", price: 299, sentiment: "negative", comment: "买回去洗了一次就皱成狗", motive: "impulse", lat: j(LH.lat), lng: j(LH.lng), hour: 20, dayOfWeek: 6, timestamp: ts(1, 20), ...demoTrust("high") },
  { id: rid(), storeName: "ZARA", storeLocation: "龙华天街店", productName: "基础T恤", category: "shopping", price: 99, sentiment: "positive", comment: "白T百搭，多买几件", motive: "need", lat: j(LH.lat), lng: j(LH.lng), hour: 15, dayOfWeek: 0, timestamp: ts(3, 15), ...demoTrust("mid") },

  // ── 优衣库（龙华天街） ──
  { id: rid(), storeName: "优衣库", storeLocation: "龙华天街店", productName: "AIRism T恤", category: "shopping", price: 79, sentiment: "positive", comment: "夏天必备，透气舒服", motive: "need", lat: j(LH.lat), lng: j(LH.lng), hour: 14, dayOfWeek: 0, timestamp: ts(2, 14), ...demoTrust("high") },
  { id: rid(), storeName: "优衣库", storeLocation: "龙华天街店", productName: "联名UT", category: "shopping", price: 99, sentiment: "neutral", comment: "联名图案一般，买了个情怀", motive: "impulse", lat: j(LH.lat), lng: j(LH.lng), hour: 16, dayOfWeek: 6, timestamp: ts(4, 16), ...demoTrust("low") },

  // ── Manner（壹方天地） ──
  { id: rid(), storeName: "Manner", storeLocation: "壹方天地店", productName: "美式", category: "coffee", price: 10, sentiment: "positive", comment: "带杯子减5块，5块钱美式谁不爱", motive: "habitual", lat: j(YF.lat), lng: j(YF.lng), hour: 8, dayOfWeek: 1, timestamp: ts(1, 8), ...demoTrust("high") },
  { id: rid(), storeName: "Manner", storeLocation: "壹方天地店", productName: "脏脏拿铁", category: "coffee", price: 15, sentiment: "positive", comment: "巧克力味刚好，不腻", motive: "reward", lat: j(YF.lat), lng: j(YF.lng), hour: 15, dayOfWeek: 3, timestamp: ts(2, 15), ...demoTrust("mid") },
  { id: rid(), storeName: "Manner", storeLocation: "壹方天地店", productName: "桂花拿铁", category: "coffee", price: 15, sentiment: "positive", comment: "季节限定太香了", motive: "emotional", lat: j(YF.lat), lng: j(YF.lng), hour: 16, dayOfWeek: 5, timestamp: ts(3, 16), ...demoTrust("mid") },

  // ── 一风堂（壹方天地） ──
  { id: rid(), storeName: "一风堂", storeLocation: "壹方天地店", productName: "白丸元味拉面", category: "food", price: 52, sentiment: "positive", comment: "汤头很浓，叉烧嫩", motive: "reward", lat: j(YF.lat), lng: j(YF.lng), hour: 12, dayOfWeek: 6, timestamp: ts(1, 12), ...demoTrust("high") },
  { id: rid(), storeName: "一风堂", storeLocation: "壹方天地店", productName: "赤丸拉面", category: "food", price: 58, sentiment: "neutral", comment: "偏辣，吃完胃不太舒服", motive: "emotional", lat: j(YF.lat), lng: j(YF.lng), hour: 13, dayOfWeek: 2, timestamp: ts(3, 13), ...demoTrust("mid") },
  { id: rid(), storeName: "一风堂", storeLocation: "壹方天地店", productName: "煎饺", category: "food", price: 28, sentiment: "positive", comment: "必加的小食，皮脆馅多", motive: "social", lat: j(YF.lat), lng: j(YF.lng), hour: 12, dayOfWeek: 0, timestamp: ts(5, 12), ...demoTrust("high") },

  // ── Nike（壹方天地） ──
  { id: rid(), storeName: "Nike", storeLocation: "壹方天地店", productName: "Air Force 1", category: "shopping", price: 799, sentiment: "positive", comment: "经典款不会出错", motive: "need", lat: j(YF.lat), lng: j(YF.lng), hour: 15, dayOfWeek: 6, timestamp: ts(2, 15), ...demoTrust("high") },
  { id: rid(), storeName: "Nike", storeLocation: "壹方天地店", productName: "Dunk Low", category: "shopping", price: 699, sentiment: "negative", comment: "冲动买的，回家发现跟已有的撞色了", motive: "impulse", lat: j(YF.lat), lng: j(YF.lng), hour: 16, dayOfWeek: 6, timestamp: ts(4, 16), ...demoTrust("mid") },

  // ── 便利店（龙华大道） ──
  { id: rid(), storeName: "全家", storeLocation: "龙华大道店", productName: "关东煮", category: "food", price: 15, sentiment: "positive", comment: "深夜暖胃神器", motive: "emotional", lat: j(LD.lat), lng: j(LD.lng), hour: 23, dayOfWeek: 4, timestamp: ts(1, 23), ...demoTrust("mid") },
  { id: rid(), storeName: "全家", storeLocation: "龙华大道店", productName: "饭团", category: "food", price: 8, sentiment: "neutral", comment: "凑合吃吧，赶时间", motive: "need", lat: j(LD.lat), lng: j(LD.lng), hour: 8, dayOfWeek: 1, timestamp: ts(2, 8), ...demoTrust("low") },

  // ── 麦当劳（龙华天街） ──
  { id: rid(), storeName: "麦当劳", storeLocation: "龙华天街店", productName: "麦辣鸡腿堡套餐", category: "food", price: 32, sentiment: "positive", comment: "深夜emo就靠它了", motive: "emotional", lat: j(LH.lat), lng: j(LH.lng), hour: 23, dayOfWeek: 3, timestamp: ts(1, 23), ...demoTrust("high") },
  { id: rid(), storeName: "麦当劳", storeLocation: "龙华天街店", productName: "麦旋风", category: "food", price: 13, sentiment: "positive", comment: "奥利奥味永远的神", motive: "reward", lat: j(LH.lat), lng: j(LH.lng), hour: 21, dayOfWeek: 5, timestamp: ts(2, 21), ...demoTrust("mid") },
  { id: rid(), storeName: "麦当劳", storeLocation: "龙华天街店", productName: "薯条", category: "food", price: 11, sentiment: "negative", comment: "等了15分钟，拿到手是软的", motive: "habitual", lat: j(LH.lat), lng: j(LH.lng), hour: 12, dayOfWeek: 1, timestamp: ts(4, 12), ...demoTrust("high") },

  // ── CGV影院（龙华天街） ──
  { id: rid(), storeName: "CGV影院", storeLocation: "龙华天街店", productName: "IMAX厅", category: "entertainment", price: 80, sentiment: "positive", comment: "效果很好，座位舒服", motive: "social", lat: j(LH.lat), lng: j(LH.lng), hour: 19, dayOfWeek: 6, timestamp: ts(2, 19), ...demoTrust("high") },
  { id: rid(), storeName: "CGV影院", storeLocation: "龙华天街店", productName: "爆米花套餐", category: "food", price: 45, sentiment: "negative", comment: "45块的爆米花是认真的吗", motive: "impulse", lat: j(LH.lat), lng: j(LH.lng), hour: 19, dayOfWeek: 6, timestamp: ts(2, 19), ...demoTrust("mid") },
];

// 运行时内存存储
const liveReviews: ReviewRecord[] = [];

function getAllReviews(): ReviewRecord[] {
  return [...DEMO_REVIEWS, ...liveReviews];
}

// GET: 查询评价
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = parseInt(searchParams.get("radius") || "500");
  const store = searchParams.get("store");

  const all = getAllReviews();

  // 按附近位置查询
  if (lat && lng) {
    const nearby = filterNearby(all, parseFloat(lat), parseFloat(lng), radius);
    const summary = buildNearbySummary(nearby);
    return NextResponse.json({
      reviews: nearby,
      summary,
      count: nearby.length,
    });
  }

  // 按店铺查询
  if (store) {
    const storeReviews = all.filter(
      (r) => r.storeName.includes(store) || (r.storeLocation && r.storeLocation.includes(store))
    );
    const summary = buildNearbySummary(storeReviews);
    return NextResponse.json({
      reviews: storeReviews,
      summary,
      count: storeReviews.length,
    });
  }

  // 全量（B端用）
  return NextResponse.json({
    reviews: all,
    count: all.length,
    demo: DEMO_REVIEWS.length,
    live: liveReviews.length,
  });
}

// POST: 新增匿名评价（带 Trust Score 计算）
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeName, storeLocation, productName, category, price, sentiment, comment, motive, motiveConfidence, lat, lng, trustContext } = body;

    if (!storeName || !productName || !price) {
      return NextResponse.json({ error: "missing required fields: storeName, productName, price" }, { status: 400 });
    }

    // 计算 Trust Score
    const ctx: TrustContext = trustContext || {
      totalConversations: 0, totalSpendings: 0, totalPatterns: 0,
      totalCommitments: 0, triggerChainCount: 0, accountAgeDays: 0,
      hasMatchingSpending: false, hasLocationMatch: false,
    };
    const trustScore = calculateTrustScore(ctx);
    const depth = profileDepthScore(ctx);

    const now = new Date();
    const review: ReviewRecord = {
      id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      storeName,
      storeLocation: storeLocation || undefined,
      productName,
      category: category || "other",
      price: parseFloat(price),
      sentiment: sentiment || "neutral",
      comment: comment || "",
      motive: motive || "habitual",
      motiveConfidence: (["high", "medium", "low"].includes(motiveConfidence) ? motiveConfidence : "medium") as "high" | "medium" | "low",
      lat: lat != null ? parseFloat(lat) : undefined,
      lng: lng != null ? parseFloat(lng) : undefined,
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      timestamp: now.toISOString(),
      trustScore,
      verified: false,
      hasMatchingSpending: ctx.hasMatchingSpending,
      hasLocationMatch: ctx.hasLocationMatch,
      profileDepth: depth,
    };

    liveReviews.push(review);

    return NextResponse.json({ ok: true, id: review.id, trustScore, total: getAllReviews().length });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}

// PATCH: Nick 回访验证 — 更新评价的 sentiment/verified 状态
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { storeName, productName, newSentiment, verified } = body;

    if (!storeName || !productName) {
      return NextResponse.json({ error: "need storeName and productName" }, { status: 400 });
    }

    // 找到最近的匹配评价并更新
    const all = [...DEMO_REVIEWS, ...liveReviews];
    const match = all
      .filter((r) => r.storeName === storeName && r.productName === productName)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

    if (!match) {
      return NextResponse.json({ error: "review not found" }, { status: 404 });
    }

    if (newSentiment) match.sentiment = newSentiment;
    if (verified) {
      match.verified = true;
      match.verifiedAt = new Date().toISOString();
      // 验证通过后 trust +10
      match.trustScore = Math.min(100, match.trustScore + 10);
    }

    return NextResponse.json({ ok: true, id: match.id, trustScore: match.trustScore, verified: match.verified });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
