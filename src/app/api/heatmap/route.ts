// 消费热点地图 API — 匿名聚合消费地点数据
// 黑客松版本：内存存储 + 预埋 demo 数据（无需数据库）

import { NextResponse } from "next/server";

export interface HeatmapPoint {
  lat: number;
  lng: number;
  category: string;
  motive: string;
  hour: number;       // 0-23，消费发生的小时
  dayOfWeek: number;  // 0-6，周日=0
  amount: number;
  location?: string;
  timestamp: string;
}

// ── 龙华商圈 demo 数据 ──
// 预埋 ~30 个点，覆盖龙华天街、壹方天地、龙华大道周边
const LONGHUA_CENTER = { lat: 22.6533, lng: 114.0249 };

function jitter(base: number, range = 0.005): number {
  return base + (Math.random() - 0.5) * range;
}

function demoTimestamp(daysAgo: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

const DEMO_DATA: HeatmapPoint[] = [
  // 龙华天街附近 — 奶茶/咖啡/快餐密集
  { lat: 22.6540, lng: 114.0255, category: "coffee", motive: "habitual", hour: 9, dayOfWeek: 1, amount: 16, location: "龙华天街·瑞幸", timestamp: demoTimestamp(1, 9) },
  { lat: 22.6542, lng: 114.0258, category: "coffee", motive: "emotional", hour: 15, dayOfWeek: 3, amount: 22, location: "龙华天街·喜茶", timestamp: demoTimestamp(2, 15) },
  { lat: 22.6538, lng: 114.0252, category: "food", motive: "reward", hour: 12, dayOfWeek: 5, amount: 48, location: "龙华天街·外婆家", timestamp: demoTimestamp(3, 12) },
  { lat: 22.6541, lng: 114.0260, category: "shopping", motive: "impulse", hour: 20, dayOfWeek: 6, amount: 299, location: "龙华天街·ZARA", timestamp: demoTimestamp(1, 20) },
  { lat: 22.6536, lng: 114.0248, category: "food", motive: "social", hour: 19, dayOfWeek: 5, amount: 156, location: "龙华天街·海底捞", timestamp: demoTimestamp(4, 19) },
  { lat: 22.6543, lng: 114.0256, category: "entertainment", motive: "reward", hour: 21, dayOfWeek: 6, amount: 80, location: "龙华天街·CGV影院", timestamp: demoTimestamp(2, 21) },
  { lat: 22.6539, lng: 114.0254, category: "coffee", motive: "emotional", hour: 22, dayOfWeek: 4, amount: 18, location: "龙华天街·Manner", timestamp: demoTimestamp(5, 22) },
  { lat: 22.6537, lng: 114.0250, category: "shopping", motive: "impulse", hour: 14, dayOfWeek: 0, amount: 189, location: "龙华天街·优衣库", timestamp: demoTimestamp(3, 14) },

  // 壹方天地（稍北）
  { lat: 22.6580, lng: 114.0230, category: "food", motive: "emotional", hour: 13, dayOfWeek: 2, amount: 65, location: "壹方天地·一风堂", timestamp: demoTimestamp(1, 13) },
  { lat: 22.6582, lng: 114.0235, category: "coffee", motive: "habitual", hour: 10, dayOfWeek: 1, amount: 16, location: "壹方天地·瑞幸", timestamp: demoTimestamp(2, 10) },
  { lat: 22.6578, lng: 114.0228, category: "shopping", motive: "social", hour: 16, dayOfWeek: 6, amount: 450, location: "壹方天地·Nike", timestamp: demoTimestamp(5, 16) },
  { lat: 22.6584, lng: 114.0232, category: "entertainment", motive: "impulse", hour: 15, dayOfWeek: 0, amount: 120, location: "壹方天地·KTV", timestamp: demoTimestamp(4, 15) },

  // 龙华大道沿线（通勤路上）
  { lat: 22.6510, lng: 114.0240, category: "coffee", motive: "habitual", hour: 8, dayOfWeek: 1, amount: 16, location: "龙华地铁站·便利店", timestamp: demoTimestamp(1, 8) },
  { lat: 22.6515, lng: 114.0243, category: "food", motive: "need", hour: 7, dayOfWeek: 2, amount: 12, location: "龙华大道·包子铺", timestamp: demoTimestamp(3, 7) },
  { lat: 22.6508, lng: 114.0238, category: "coffee", motive: "emotional", hour: 23, dayOfWeek: 4, amount: 28, location: "龙华大道·全家", timestamp: demoTimestamp(2, 23) },

  // 观澜附近
  { lat: 22.6620, lng: 114.0300, category: "food", motive: "reward", hour: 19, dayOfWeek: 5, amount: 88, location: "观澜·烤肉店", timestamp: demoTimestamp(1, 19) },
  { lat: 22.6625, lng: 114.0305, category: "shopping", motive: "impulse", hour: 22, dayOfWeek: 5, amount: 67, location: "观澜·拼多多取件", timestamp: demoTimestamp(6, 22) },

  // 深夜消费集中区
  { lat: jitter(22.6540), lng: jitter(114.0255), category: "food", motive: "emotional", hour: 23, dayOfWeek: 3, amount: 42, location: "龙华天街·麦当劳", timestamp: demoTimestamp(1, 23) },
  { lat: jitter(22.6540), lng: jitter(114.0255), category: "food", motive: "emotional", hour: 0, dayOfWeek: 6, amount: 35, location: "龙华夜市", timestamp: demoTimestamp(2, 0) },
  { lat: jitter(22.6540), lng: jitter(114.0255), category: "coffee", motive: "emotional", hour: 23, dayOfWeek: 1, amount: 15, location: "便利店", timestamp: demoTimestamp(4, 23) },

  // 周末冲动消费
  { lat: jitter(22.6542), lng: jitter(114.0258), category: "shopping", motive: "impulse", hour: 15, dayOfWeek: 6, amount: 599, location: "龙华天街·Apple", timestamp: demoTimestamp(1, 15) },
  { lat: jitter(22.6580), lng: jitter(114.0230), category: "shopping", motive: "social", hour: 14, dayOfWeek: 0, amount: 320, location: "壹方天地·Adidas", timestamp: demoTimestamp(3, 14) },
  { lat: jitter(22.6538), lng: jitter(114.0252), category: "entertainment", motive: "impulse", hour: 20, dayOfWeek: 6, amount: 198, location: "龙华天街·密室逃脱", timestamp: demoTimestamp(2, 20) },

  // 工作日午餐（高频刚需 vs 情绪补偿）
  { lat: jitter(22.6510), lng: jitter(114.0240), category: "food", motive: "need", hour: 12, dayOfWeek: 1, amount: 18, location: "公司楼下·食堂", timestamp: demoTimestamp(1, 12) },
  { lat: jitter(22.6510), lng: jitter(114.0240), category: "food", motive: "emotional", hour: 12, dayOfWeek: 2, amount: 52, location: "公司附近·日料", timestamp: demoTimestamp(2, 12) },
  { lat: jitter(22.6510), lng: jitter(114.0240), category: "food", motive: "emotional", hour: 12, dayOfWeek: 3, amount: 45, location: "公司附近·酸菜鱼", timestamp: demoTimestamp(3, 12) },
  { lat: jitter(22.6510), lng: jitter(114.0240), category: "food", motive: "need", hour: 12, dayOfWeek: 4, amount: 15, location: "公司楼下·食堂", timestamp: demoTimestamp(4, 12) },
  { lat: jitter(22.6510), lng: jitter(114.0240), category: "food", motive: "reward", hour: 12, dayOfWeek: 5, amount: 68, location: "公司附近·牛排", timestamp: demoTimestamp(5, 12) },
];

// 运行时内存存储（重启丢失，黑客松够用）
const livePoints: HeatmapPoint[] = [];

// GET: 返回所有热点数据
export async function GET() {
  return NextResponse.json({
    points: [...DEMO_DATA, ...livePoints],
    meta: {
      center: LONGHUA_CENTER,
      totalPoints: DEMO_DATA.length + livePoints.length,
      demoPoints: DEMO_DATA.length,
      livePoints: livePoints.length,
    },
  });
}

// POST: 接收新的匿名消费数据点
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng, category, motive, amount, location } = body;

    if (lat == null || lng == null || !category || !amount) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const now = new Date();
    const point: HeatmapPoint = {
      lat,
      lng,
      category,
      motive: motive || "impulse",
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      amount,
      location,
      timestamp: now.toISOString(),
    };

    livePoints.push(point);

    return NextResponse.json({ ok: true, total: DEMO_DATA.length + livePoints.length });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}
