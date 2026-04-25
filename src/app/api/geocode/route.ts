// 逆地理编码代理 — 高德 Web 服务 API（key 不暴露到前端）

import { NextResponse } from "next/server";

const AMAP_KEY = process.env.AMAP_KEY || process.env.NEXT_PUBLIC_AMAP_JS_KEY || "";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "need lat and lng" }, { status: 400 });
  }

  if (!AMAP_KEY) {
    return NextResponse.json({ error: "AMAP_KEY not configured" }, { status: 500 });
  }

  try {
    // 高德要求 location 格式为 "经度,纬度"（注意顺序：lng,lat）
    const res = await fetch(
      `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${AMAP_KEY}&extensions=base`
    );
    const data = await res.json();

    if (data.status !== "1") {
      return NextResponse.json({ error: data.info || "amap error" }, { status: 502 });
    }

    const comp = data.regeocode?.addressComponent || {};
    // 优先使用：区 + 街道/乡镇 + 商圈，组成简洁地名
    const parts: string[] = [];
    if (comp.district) parts.push(comp.district);
    if (comp.township) parts.push(comp.township);
    // 附近商圈
    const biz = comp.businessAreas?.[0]?.name;
    if (biz) parts.push(biz);

    const name = parts.length > 0
      ? parts.join(" · ")
      : data.regeocode?.formatted_address || `${lat},${lng}`;

    return NextResponse.json({ name });
  } catch {
    return NextResponse.json({ error: "geocode request failed" }, { status: 502 });
  }
}
