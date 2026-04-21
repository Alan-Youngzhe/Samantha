import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.ANTHROPIC_BASE_URL || "https://claude2.sssaicode.com/api";
const API_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { mirrorPrompt, nickMessage, userMessage } = await req.json();

    const response = await fetch(`${API_BASE}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_TOKEN,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: mirrorPrompt,
        messages: [
          {
            role: "user",
            content: `用户刚才说了：「${userMessage}」\n\nNick 的评价是：「${nickMessage}」\n\n现在，作为用户内心那个诚实的声音，你会说什么？`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Mirror API error:", response.status, errText);
      throw new Error(`API ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
    const mirrorText = textBlock ? textBlock.text : "";

    return NextResponse.json({ text: mirrorText.trim() });
  } catch (error) {
    console.error("Mirror API error:", error);
    return NextResponse.json(
      { error: "Mirror failed" },
      { status: 500 }
    );
  }
}
