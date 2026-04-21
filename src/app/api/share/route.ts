// Share Target API — 接收从微信支付/支付宝等分享过来的截图或文本
// PWA share_target 会 POST 到这里

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const text = formData.get("text") as string | null;
    const title = formData.get("title") as string | null;
    const url = formData.get("url") as string | null;
    const media = formData.get("media") as File | null;

    // 构建重定向 URL，带上分享内容作为 query params
    const params = new URLSearchParams();
    if (text) params.set("shared_text", text);
    if (title) params.set("shared_title", title);
    if (url) params.set("shared_url", url);

    // 如果有图片，转成 base64 存到 sessionStorage 的指令
    if (media) {
      const bytes = await media.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = media.type || "image/png";
      params.set("shared_image", `data:${mimeType};base64,${base64}`);
    }

    // 重定向回主页面，带上分享数据
    return NextResponse.redirect(new URL(`/?${params.toString()}`, req.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/", req.url), 303);
  }
}
