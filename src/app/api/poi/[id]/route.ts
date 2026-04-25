import { NextResponse } from "next/server";

const AMAP_KEY = process.env.AMAP_KEY || process.env.NEXT_PUBLIC_AMAP_JS_KEY || "";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "need poi id" }, { status: 400 });
  }
  if (!AMAP_KEY) {
    return NextResponse.json({ error: "AMAP_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://restapi.amap.com/v5/place/detail?key=${AMAP_KEY}&id=${id}`
    );
    const data = await res.json();

    if (data.status !== "1" || !data.pois?.length) {
      return NextResponse.json({ error: data.info || "not found" }, { status: 404 });
    }

    const p = data.pois[0];
    const loc = (p.location || "").split(",");
    const bizExt = p.biz_ext || {};

    const photos = (p.photos || []).map((ph: Record<string, string>) => ({
      url: ph.url || "",
      title: ph.title || "",
    }));

    return NextResponse.json({
      id: p.id,
      name: p.name,
      lat: parseFloat(loc[1]) || 0,
      lng: parseFloat(loc[0]) || 0,
      type: p.type || "",
      address: p.address || "",
      tel: p.tel || "",
      rating: bizExt.rating ? parseFloat(bizExt.rating) : undefined,
      avgPrice: bizExt.cost ? parseFloat(bizExt.cost) : undefined,
      openTime: bizExt.opentime || bizExt.opentime_today || "",
      mealOrdering: bizExt.meal_ordering || "",
      photos,
      navUrl: `https://uri.amap.com/navigation?to=${loc[0]},${loc[1]},${encodeURIComponent(p.name)}&mode=walk&src=samantha&coordinate=gaode&callnative=1`,
    });
  } catch {
    return NextResponse.json({ error: "detail request failed" }, { status: 502 });
  }
}
