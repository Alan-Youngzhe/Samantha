import { NextResponse } from "next/server";
import { amapGet } from "@/lib/amap-proxy";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "need lat and lng" }, { status: 400 });
  }

  try {
    const data = await amapGet("/v3/geocode/regeo", {
      location: `${lng},${lat}`,
      extensions: "base",
    });

    const comp = (data.regeocode as Record<string, unknown>)?.addressComponent as Record<string, unknown> || {};
    const parts: string[] = [];
    if (comp.district) parts.push(String(comp.district));
    if (comp.township) parts.push(String(comp.township));
    const bizAreas = (comp.businessAreas || []) as Array<Record<string, string>>;
    if (bizAreas[0]?.name) parts.push(bizAreas[0].name);

    const regeocode = data.regeocode as Record<string, unknown> || {};
    const name = parts.length > 0
      ? parts.join(" · ")
      : String(regeocode.formatted_address || `${lat},${lng}`);

    return NextResponse.json({ name });
  } catch {
    return NextResponse.json({ error: "geocode request failed" }, { status: 502 });
  }
}
