import { NextResponse } from "next/server";
import { amapGet } from "@/lib/amap-proxy";

const TYPE_MAP: Record<string, string> = {
  "050000": "food", "050100": "food", "050200": "food",
  "050300": "food", "050400": "food", "050500": "coffee",
  "050505": "coffee", "050507": "coffee", "060100": "shopping",
  "060400": "shopping", "061000": "shopping",
};

function mapCategory(type: string): string {
  for (const [prefix, cat] of Object.entries(TYPE_MAP)) {
    if (type.startsWith(prefix)) return cat;
  }
  if (type.startsWith("05")) return "food";
  if (type.startsWith("06")) return "shopping";
  return "other";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "1000";
  const keyword = searchParams.get("keyword") || "";
  const types = searchParams.get("types") || "050000|060100";

  try {
    let data: Record<string, unknown>;

    if (keyword && !lat) {
      data = await amapGet("/v3/place/text", {
        keywords: keyword, types, city: "上海",
        offset: "20", extensions: "all",
      });
    } else if (lat && lng) {
      const params: Record<string, string> = {
        location: `${lng},${lat}`, radius, types,
        offset: "25", extensions: "all",
      };
      if (keyword) params.keywords = keyword;
      data = await amapGet("/v3/place/around", params);
    } else {
      return NextResponse.json({ error: "need lat+lng or keyword" }, { status: 400 });
    }

    const pois = ((data.pois || []) as Array<Record<string, unknown>>).map((p) => {
      const loc = (String(p.location || "")).split(",");
      const bizExt = (p.biz_ext || {}) as Record<string, string>;
      const photos = ((p.photos || []) as Array<Record<string, string>>)
        .slice(0, 3).map((ph) => ph.url).filter(Boolean);
      return {
        id: String(p.id || ""),
        name: String(p.name || ""),
        lat: parseFloat(loc[1]) || 0,
        lng: parseFloat(loc[0]) || 0,
        category: mapCategory(String(p.typecode || "")),
        type: String(p.type || ""),
        address: String(p.address || ""),
        tel: String(p.tel || ""),
        rating: bizExt.rating ? parseFloat(bizExt.rating) : undefined,
        avgPrice: bizExt.cost ? parseFloat(bizExt.cost) : undefined,
        distance: p.distance ? parseInt(String(p.distance), 10) : undefined,
        photos,
        openTime: bizExt.opentime || bizExt.open_time || "",
      };
    });

    return NextResponse.json({ pois });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
