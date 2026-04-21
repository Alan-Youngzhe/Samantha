import { SYSTEM_PROMPT } from "@/lib/prompt";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.ANTHROPIC_BASE_URL || "https://claude2.sssaicode.com/api";
const API_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { message, memoryContext, image, history, location, lat, lng, trustContext } = await req.json();

    // Build content blocks (Anthropic Messages format)
    const content: Array<Record<string, unknown>> = [];

    // Add image if present
    if (image) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.data,
        },
      });
    }

    // Fetch nearby reviews if user has location
    let nearbyReviewsSummary = "";
    if (lat != null && lng != null) {
      try {
        const origin = req.nextUrl.origin;
        const reviewsRes = await fetch(`${origin}/api/reviews?lat=${lat}&lng=${lng}&radius=500`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          if (reviewsData.summary) {
            nearbyReviewsSummary = reviewsData.summary;
          }
        }
      } catch { /* ignore */ }
    }

    // Build the text message with memory context + nearby reviews
    let textContent = "";
    if (memoryContext) {
      textContent += `<memory>\n${memoryContext}</memory>\n\n`;
    }
    if (nearbyReviewsSummary) {
      textContent += `<nearby_reviews>\n${nearbyReviewsSummary}</nearby_reviews>\n\n`;
    }
    if (image) {
      textContent += `[用户发送了一张照片（可能是小票、外卖截图、购物照片等）。请：1) 分析消费金额和动机；2) 尽可能提取店铺名、具体商品名、价格，如果都能提取到就输出 [REVIEW] 标签]\n\n`;
    }
    if (location) {
      textContent += `[用户当前位置：${location}，请结合地点场景丰富叙事]\n\n`;
    }
    textContent += `用户说：${message}`;

    content.push({ type: "text", text: textContent });

    // Build messages array
    const messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }> = [];

    // Skip history for image messages to keep payload small
    if (!image && history && Array.isArray(history)) {
      const recent = history.slice(-10);
      for (const h of recent) {
        const text = typeof h.content === "string" ? h.content : String(h.content);
        messages.push({ role: h.role, content: text });
      }
      // Ensure alternating roles
      while (messages.length > 0 && messages[messages.length - 1].role === "user") {
        messages.pop();
      }
    }

    // Add current user message
    messages.push({ role: "user", content });

    const response = await fetch(`${API_BASE}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_TOKEN,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("API error:", response.status, errText);
      throw new Error(`API ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
    const responseText = textBlock ? textBlock.text : "";

    // Extract structured tags
    let commitment: string | null = null;
    let commitmentFulfilled: string | null = null;
    let commitmentBroken: string | null = null;
    let pattern: { category: string; description: string } | null = null;
    let userTrait: { category: string; description: string } | null = null;
    let spending: { amount: number; category: string; motive: string } | null = null;
    let triggerChain: { trigger: string; behavior: string } | null = null;
    let review: { storeName: string; productName: string; price: number; sentiment: string; comment: string } | null = null;
    let verify: { storeName: string; productName: string; newSentiment: string } | null = null;

    const commitMatch = responseText.match(/\[COMMITMENT\]:\s*(.+)/);
    if (commitMatch) commitment = commitMatch[1].trim();

    const fulfilledMatch = responseText.match(/\[COMMITMENT_FULFILLED\]:\s*(.+)/);
    if (fulfilledMatch) commitmentFulfilled = fulfilledMatch[1].trim();

    const brokenMatch = responseText.match(/\[COMMITMENT_BROKEN\]:\s*(.+)/);
    if (brokenMatch) commitmentBroken = brokenMatch[1].trim();

    const patternMatch = responseText.match(/\[PATTERN\]:\s*(\w+)\|(.+)/);
    if (patternMatch) {
      pattern = { category: patternMatch[1].trim(), description: patternMatch[2].trim() };
    }

    const traitMatch = responseText.match(/\[USER_TRAIT\]:\s*(\w+)\|(.+)/);
    if (traitMatch) {
      userTrait = { category: traitMatch[1].trim(), description: traitMatch[2].trim() };
    }

    const spendingMatch = responseText.match(/\[SPENDING\]:\s*(\d+(?:\.\d+)?)\|(\w+)\|(\w+)/);
    if (spendingMatch) {
      spending = {
        amount: parseFloat(spendingMatch[1]),
        category: spendingMatch[2].trim(),
        motive: spendingMatch[3].trim(),
      };
    }

    const chainMatch = responseText.match(/\[TRIGGER_CHAIN\]:\s*(.+?)\|(.+)/);
    if (chainMatch) {
      triggerChain = { trigger: chainMatch[1].trim(), behavior: chainMatch[2].trim() };
    }

    const reviewMatch = responseText.match(/\[REVIEW\]:\s*(.+?)\|(.+?)\|(\d+(?:\.\d+)?)\|(\w+)\|(.+)/);
    if (reviewMatch) {
      review = {
        storeName: reviewMatch[1].trim(),
        productName: reviewMatch[2].trim(),
        price: parseFloat(reviewMatch[3]),
        sentiment: reviewMatch[4].trim(),
        comment: reviewMatch[5].trim(),
      };
      // Auto-report to reviews API with trust context (fire and forget)
      const origin = req.nextUrl.origin;
      fetch(`${origin}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...review,
          motive: spending?.motive || "habitual",
          category: spending?.category || "other",
          lat: lat || undefined,
          lng: lng || undefined,
          trustContext: trustContext || undefined,
        }),
      }).catch(() => {});
    }

    const verifyMatch = responseText.match(/\[VERIFY\]:\s*(.+?)\|(.+?)\|(\w+)/);
    if (verifyMatch) {
      verify = {
        storeName: verifyMatch[1].trim(),
        productName: verifyMatch[2].trim(),
        newSentiment: verifyMatch[3].trim(),
      };
      // Update review via PATCH (fire and forget)
      const origin2 = req.nextUrl.origin;
      fetch(`${origin2}/api/reviews`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: verify.storeName,
          productName: verify.productName,
          newSentiment: verify.newSentiment !== "unchanged" ? verify.newSentiment : undefined,
          verified: true,
        }),
      }).catch(() => {});
    }

    // Clean the response text (remove all tags)
    const cleanText = responseText
      .replace(/\n?\[COMMITMENT\]:\s*.+/g, "")
      .replace(/\n?\[COMMITMENT_FULFILLED\]:\s*.+/g, "")
      .replace(/\n?\[COMMITMENT_BROKEN\]:\s*.+/g, "")
      .replace(/\n?\[PATTERN\]:\s*.+/g, "")
      .replace(/\n?\[USER_TRAIT\]:\s*.+/g, "")
      .replace(/\n?\[SPENDING\]:\s*.+/g, "")
      .replace(/\n?\[TRIGGER_CHAIN\]:\s*.+/g, "")
      .replace(/\n?\[REVIEW\]:\s*.+/g, "")
      .replace(/\n?\[VERIFY\]:\s*.+/g, "")
      .trim();

    return NextResponse.json({
      text: cleanText,
      commitment,
      commitmentFulfilled,
      commitmentBroken,
      pattern,
      userTrait,
      spending,
      triggerChain,
      review,
      verify,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
