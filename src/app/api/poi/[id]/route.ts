import { NextResponse } from "next/server";
import { amapGet } from "@/lib/amap-proxy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "need poi id" }, { status: 400 });
  }

  try {
    const data = await amapGet("/v3/place/detail", { id });
    const pois = (data.pois || []) as Array<Record<string, unknown>>;
    if (!pois.length) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const p = pois[0];
    const loc = String(p.location || "").split(",");
    const bizExt = (p.biz_ext || {}) as Record<string, string>;
    const photos = ((p.photos || []) as Array<Record<string, string>>).map((ph) => ({
      url: ph.url || "",
      title: ph.title || "",
    }));

    return NextResponse.json({
      id: p.id,
      name: p.name,
      lat: parseFloat(loc[1]) || 0,
      lng: parseFloat(loc[0]) || 0,
      type: p.type || "",
      address: String(p.address || ""),
      tel: String(p.tel || ""),
      rating: bizExt.rating ? parseFloat(bizExt.rating) : undefined,
      avgPrice: bizExt.cost ? parseFloat(bizExt.cost) : undefined,
      openTime: bizExt.opentime || bizExt.open_time || "",
      photos,
      navUrl: `https://uri.amap.com/navigation?to=${loc[0]},${loc[1]},${encodeURIComponent(String(p.name))}&mode=walk&src=samantha&coordinate=gaode&callnative=1`,
    });
  } catch {
    return NextResponse.json({ error: "detail request failed" }, { status: 502 });
  }
}
