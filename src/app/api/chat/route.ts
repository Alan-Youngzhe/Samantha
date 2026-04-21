import { SYSTEM_PROMPT } from "@/lib/prompt";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.ANTHROPIC_BASE_URL || "https://claude2.sssaicode.com/api";
const API_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { message, memoryContext, image, history } = await req.json();

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

    // Build the text message with memory context
    let textContent = "";
    if (memoryContext) {
      textContent += `<memory>\n${memoryContext}</memory>\n\n`;
    }
    if (image) {
      textContent += `[用户发送了一张照片，请结合照片内容进行第三人称分析]\n\n`;
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

    // Clean the response text (remove all tags)
    const cleanText = responseText
      .replace(/\n?\[COMMITMENT\]:\s*.+/g, "")
      .replace(/\n?\[COMMITMENT_FULFILLED\]:\s*.+/g, "")
      .replace(/\n?\[COMMITMENT_BROKEN\]:\s*.+/g, "")
      .replace(/\n?\[PATTERN\]:\s*.+/g, "")
      .replace(/\n?\[USER_TRAIT\]:\s*.+/g, "")
      .trim();

    return NextResponse.json({
      text: cleanText,
      commitment,
      commitmentFulfilled,
      commitmentBroken,
      pattern,
      userTrait,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
