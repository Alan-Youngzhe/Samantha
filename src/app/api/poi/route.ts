import { NextResponse } from "next/server";

const AMAP_KEY = process.env.AMAP_KEY || "";

const TYPE_MAP: Record<string, string> = {
  "050000": "food",
  "050100": "food",
  "050200": "food",
  "050300": "food",
  "050400": "food",
  "050500": "coffee",
  "050505": "coffee",
  "050507": "coffee",
  "060100": "shopping",
  "060400": "shopping",
  "061000": "shopping",
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

  if (!AMAP_KEY) {
    return NextResponse.json({ error: "AMAP_KEY not configured" }, { status: 500 });
  }

  try {
    let url: string;

    if (keyword && !lat) {
      url = `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keyword)}&types=${types}&city=上海&offset=20&extensions=all`;
    } else if (lat && lng) {
      const base = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${lng},${lat}&radius=${radius}&types=${types}&offset=25&extensions=all`;
      url = keyword ? `${base}&keywords=${encodeURIComponent(keyword)}` : base;
    } else {
      return NextResponse.json({ error: "need lat+lng or keyword" }, { status: 400 });
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "1") {
      return NextResponse.json({ error: data.info || "amap error" }, { status: 502 });
    }

    const pois = (data.pois || []).map((p: Record<string, unknown>) => {
      const loc = (p.location as string || "").split(",");
      const bizExt = (p.biz_ext || {}) as Record<string, string>;
      return {
        name: p.name as string,
        lat: parseFloat(loc[1]) || 0,
        lng: parseFloat(loc[0]) || 0,
        category: mapCategory(((p.typecode as string) || "")),
        address: p.address as string || "",
        tel: p.tel as string || "",
        rating: bizExt.rating ? parseFloat(bizExt.rating) : undefined,
        avgPrice: bizExt.cost ? parseFloat(bizExt.cost) : undefined,
        distance: p.distance ? parseInt(p.distance as string, 10) : undefined,
      };
    });

    return NextResponse.json({ pois });
  } catch {
    return NextResponse.json({ error: "poi request failed" }, { status: 502 });
  }
}
