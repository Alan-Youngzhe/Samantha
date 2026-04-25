// 匿名单品消费情报 API — Supabase 持久化存储

import { NextResponse } from "next/server";
import type { ReviewRecord, TrustContext } from "@/lib/reviews";
import { buildNearbySummary, calculateTrustScore, profileDepthScore } from "@/lib/reviews";
import { supabase } from "@/lib/supabase";

/** Map Supabase row (snake_case) → ReviewRecord (camelCase) */
function toReviewRecord(row: Record<string, unknown>): ReviewRecord {
  return {
    id: row.id as string,
    storeName: row.store_name as string,
    storeLocation: (row.store_location as string) || undefined,
    productName: row.product_name as string,
    category: row.category as string,
    price: Number(row.price),
    sentiment: row.sentiment as "positive" | "neutral" | "negative",
    comment: (row.comment as string) || "",
    motive: row.motive as string,
    motiveConfidence: row.motive_confidence as "high" | "medium" | "low",
    lat: row.lat != null ? Number(row.lat) : undefined,
    lng: row.lng != null ? Number(row.lng) : undefined,
    hour: Number(row.hour),
    dayOfWeek: Number(row.day_of_week),
    timestamp: row.created_at as string,
    trustScore: Number(row.trust_score),
    verified: row.verified as boolean,
    verifiedAt: (row.verified_at as string) || undefined,
    hasMatchingSpending: row.has_matching_spending as boolean,
    hasLocationMatch: row.has_location_match as boolean,
    profileDepth: Number(row.profile_depth),
  };
}

// GET: 查询评价
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = parseInt(searchParams.get("radius") || "500");
  const store = searchParams.get("store");

  // 按附近位置查询（bounding box approximation → then haversine filter）
  if (lat && lng) {
    const latF = parseFloat(lat);
    const lngF = parseFloat(lng);
    // ~0.005 degree ≈ 500m at this latitude
    const delta = radius / 111000;
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .gte("lat", latF - delta)
      .lte("lat", latF + delta)
      .gte("lng", lngF - delta)
      .lte("lng", lngF + delta)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const reviews = (data || []).map(toReviewRecord);
    const summary = buildNearbySummary(reviews);
    return NextResponse.json({ reviews, summary, count: reviews.length });
  }

  // 按店铺查询
  if (store) {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .or(`store_name.ilike.%${store}%,store_location.ilike.%${store}%`)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const reviews = (data || []).map(toReviewRecord);
    const summary = buildNearbySummary(reviews);
    return NextResponse.json({ reviews, summary, count: reviews.length });
  }

  // 全量（B端用）
  const { data, error, count } = await supabase
    .from("reviews")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    reviews: (data || []).map(toReviewRecord),
    count: count || 0,
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
    const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const { error } = await supabase.from("reviews").insert({
      id,
      store_name: storeName,
      store_location: storeLocation || null,
      product_name: productName,
      category: category || "other",
      price: parseFloat(price),
      sentiment: sentiment || "neutral",
      comment: comment || "",
      motive: motive || "habitual",
      motive_confidence: ["high", "medium", "low"].includes(motiveConfidence) ? motiveConfidence : "medium",
      lat: lat != null ? parseFloat(lat) : null,
      lng: lng != null ? parseFloat(lng) : null,
      hour: body.hour != null ? Number(body.hour) : now.getHours(),
      day_of_week: body.dayOfWeek != null ? Number(body.dayOfWeek) : now.getDay(),
      trust_score: trustScore,
      verified: false,
      has_matching_spending: ctx.hasMatchingSpending,
      has_location_match: ctx.hasLocationMatch,
      profile_depth: depth,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id, trustScore });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}

// PATCH: Samantha 回访验证 — 更新评价的 sentiment/verified 状态
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { storeName, productName, newSentiment, verified } = body;

    if (!storeName || !productName) {
      return NextResponse.json({ error: "need storeName and productName" }, { status: 400 });
    }

    // 找到最近的匹配评价
    const { data: matches, error: findError } = await supabase
      .from("reviews")
      .select("id, trust_score")
      .eq("store_name", storeName)
      .eq("product_name", productName)
      .order("created_at", { ascending: false })
      .limit(1);

    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
    if (!matches || matches.length === 0) {
      return NextResponse.json({ error: "review not found" }, { status: 404 });
    }

    const match = matches[0];
    const updates: Record<string, unknown> = {};
    if (newSentiment) updates.sentiment = newSentiment;
    if (verified) {
      updates.verified = true;
      updates.verified_at = new Date().toISOString();
      updates.trust_score = Math.min(100, Number(match.trust_score) + 10);
    }

    const { error: updateError } = await supabase
      .from("reviews")
      .update(updates)
      .eq("id", match.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      id: match.id,
      trustScore: updates.trust_score ?? match.trust_score,
      verified: updates.verified ?? false,
    });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
