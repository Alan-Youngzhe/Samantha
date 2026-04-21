"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Clock, Flame, TrendingUp } from "lucide-react";
import Link from "next/link";

interface HeatmapPoint {
  lat: number;
  lng: number;
  category: string;
  motive: string;
  hour: number;
  dayOfWeek: number;
  amount: number;
  location?: string;
  timestamp: string;
}

interface HeatmapMeta {
  center: { lat: number; lng: number };
  totalPoints: number;
}

const MOTIVE_COLORS: Record<string, string> = {
  emotional: "#ef4444",
  impulse: "#f59e0b",
  reward: "#a855f7",
  social: "#3b82f6",
  habitual: "#6b7280",
  need: "#22c55e",
};

const MOTIVE_LABELS: Record<string, string> = {
  emotional: "情绪驱动",
  impulse: "冲动消费",
  reward: "自我犒劳",
  social: "社交消费",
  habitual: "习惯消费",
  need: "刚需",
};

const CATEGORY_LABELS: Record<string, string> = {
  food: "餐饮",
  coffee: "咖啡/奶茶",
  shopping: "购物",
  transport: "交通",
  entertainment: "娱乐",
  daily: "日用",
  other: "其他",
};

const DAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default function HeatmapPage() {
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [meta, setMeta] = useState<HeatmapMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch("/api/heatmap")
      .then((r) => r.json())
      .then((data) => {
        setPoints(data.points);
        setMeta(data.meta);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? points : points.filter((p) => p.motive === filter);

  // Canvas 热力图绘制
  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !meta || filtered.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 深色底图
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);

    // 绘制网格
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo((W / 10) * i, 0);
      ctx.lineTo((W / 10) * i, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (H / 10) * i);
      ctx.lineTo(W, (H / 10) * i);
      ctx.stroke();
    }

    // 计算坐标映射范围
    const pad = 0.008;
    const minLat = meta.center.lat - pad;
    const maxLat = meta.center.lat + pad;
    const minLng = meta.center.lng - pad;
    const maxLng = meta.center.lng + pad;

    const toX = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * W;
    const toY = (lat: number) => H - ((lat - minLat) / (maxLat - minLat)) * H;

    // 先画热力光晕
    for (const p of filtered) {
      const x = toX(p.lng);
      const y = toY(p.lat);
      const color = MOTIVE_COLORS[p.motive] || "#6b7280";
      const radius = Math.min(40, Math.max(15, p.amount / 8));

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color + "60");
      gradient.addColorStop(1, color + "00");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 再画实心点
    for (const p of filtered) {
      const x = toX(p.lng);
      const y = toY(p.lat);
      const color = MOTIVE_COLORS[p.motive] || "#6b7280";
      const r = Math.min(6, Math.max(3, p.amount / 50));

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // 金额较大的标注地名
      if (p.amount >= 100 && p.location) {
        ctx.fillStyle = "#a3a3a3";
        ctx.font = "10px sans-serif";
        ctx.fillText(`${p.location}`, x + 8, y - 4);
        ctx.fillStyle = "#fafafa";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(`¥${p.amount}`, x + 8, y + 8);
      }
    }

    // 地标标注
    const landmarks = [
      { name: "龙华天街", lat: 22.6540, lng: 114.0255 },
      { name: "壹方天地", lat: 22.6580, lng: 114.0230 },
      { name: "龙华地铁", lat: 22.6510, lng: 114.0240 },
    ];
    for (const lm of landmarks) {
      const x = toX(lm.lng);
      const y = toY(lm.lat);
      ctx.fillStyle = "#525252";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`📍 ${lm.name}`, x, y - 12);
      ctx.textAlign = "start";
    }
  }, [filtered, meta]);

  useEffect(() => {
    drawHeatmap();
  }, [drawHeatmap]);

  // 统计分析
  const motiveBreakdown = filtered.reduce<Record<string, number>>((acc, p) => {
    acc[p.motive] = (acc[p.motive] || 0) + 1;
    return acc;
  }, {});

  const hourBreakdown = filtered.reduce<Record<number, number>>((acc, p) => {
    acc[p.hour] = (acc[p.hour] || 0) + 1;
    return acc;
  }, {});
  const peakHour = Object.entries(hourBreakdown).sort(([, a], [, b]) => b - a)[0];

  const dayBreakdown = filtered.reduce<Record<number, number>>((acc, p) => {
    acc[p.dayOfWeek] = (acc[p.dayOfWeek] || 0) + 1;
    return acc;
  }, {});
  const peakDay = Object.entries(dayBreakdown).sort(([, a], [, b]) => b - a)[0];

  const totalAmount = filtered.reduce((s, p) => s + p.amount, 0);
  const emotionalRatio = filtered.length > 0
    ? Math.round(
        (filtered.filter((p) => ["emotional", "impulse", "reward"].includes(p.motive)).length /
          filtered.length) *
          100
      )
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-neutral-500 text-sm">
        加载消费热力数据...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-200">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/90 backdrop-blur-sm border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-neutral-500 hover:text-neutral-300">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">龙华消费热力图</h1>
            <p className="text-[11px] text-neutral-500">
              {meta?.totalPoints || 0} 个匿名消费数据点
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Nick 的洞察 */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4">
          <p className="text-[13px] text-neutral-300 leading-relaxed">
            {emotionalRatio > 50
              ? `这个商圈 ${emotionalRatio}% 的消费跟"需要"没关系。年轻人来这里不是购物——是在花钱处理情绪。`
              : `${filtered.length} 笔消费，${emotionalRatio}% 是情绪驱动的。剩下的才是真正的需求。`}
            {peakHour &&
              ` 消费高峰在 ${peakHour[0]}:00 前后——${
                parseInt(peakHour[0]) >= 20
                  ? "深夜的冲动最值钱。"
                  : parseInt(peakHour[0]) >= 12 && parseInt(peakHour[0]) <= 13
                  ? "午饭时间，但很多人点的不是饭，是安慰。"
                  : "白天的消费相对理性。"
              }`}
            {peakDay &&
              ` ${DAY_LABELS[parseInt(peakDay[0])]}是消费最密集的一天。`}
          </p>
        </div>

        {/* 筛选 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              filter === "all"
                ? "bg-neutral-700 text-white"
                : "bg-neutral-900 text-neutral-500 hover:text-neutral-300"
            }`}
          >
            全部
          </button>
          {Object.entries(MOTIVE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-xs transition-colors flex items-center gap-1 ${
                filter === key
                  ? "text-white"
                  : "bg-neutral-900 text-neutral-500 hover:text-neutral-300"
              }`}
              style={filter === key ? { backgroundColor: MOTIVE_COLORS[key] + "40" } : {}}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: MOTIVE_COLORS[key] }}
              />
              {label}
            </button>
          ))}
        </div>

        {/* 热力图 Canvas */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-3 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-auto rounded-xl"
          />
        </div>

        {/* 数据洞察卡片 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3 text-center">
            <Flame className="w-4 h-4 text-red-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-red-400">{emotionalRatio}%</div>
            <div className="text-[10px] text-neutral-600">非理性消费</div>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3 text-center">
            <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-amber-400">
              {peakHour ? `${peakHour[0]}:00` : "-"}
            </div>
            <div className="text-[10px] text-neutral-600">消费高峰</div>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3 text-center">
            <TrendingUp className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-purple-400">¥{totalAmount}</div>
            <div className="text-[10px] text-neutral-600">区域总消费</div>
          </div>
        </div>

        {/* 动机分布 */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-neutral-400 mb-3">消费动机分布</h3>
          <div className="space-y-2">
            {Object.entries(motiveBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([motive, count]) => (
                <div key={motive} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: MOTIVE_COLORS[motive] }}
                  />
                  <span className="text-xs text-neutral-400 w-16">
                    {MOTIVE_LABELS[motive] || motive}
                  </span>
                  <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(count / filtered.length) * 100}%`,
                        backgroundColor: MOTIVE_COLORS[motive],
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-600 w-8 text-right">
                    {Math.round((count / filtered.length) * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* 时段热力 */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-neutral-400 mb-3">24h 消费时段分布</h3>
          <div className="flex items-end gap-[2px] h-16">
            {Array.from({ length: 24 }, (_, h) => {
              const count = hourBreakdown[h] || 0;
              const max = Math.max(...Object.values(hourBreakdown), 1);
              const isEmotional =
                filtered.filter(
                  (p) =>
                    p.hour === h &&
                    ["emotional", "impulse", "reward"].includes(p.motive)
                ).length >
                count / 2;
              return (
                <div
                  key={h}
                  className="flex-1 rounded-t transition-all"
                  style={{
                    height: `${Math.max(2, (count / max) * 100)}%`,
                    backgroundColor: count === 0 ? "#1a1a1a" : isEmotional ? "#ef4444" : "#22c55e",
                    opacity: count === 0 ? 0.3 : 0.7,
                  }}
                  title={`${h}:00 — ${count} 笔`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-neutral-700">0:00</span>
            <span className="text-[9px] text-neutral-700">6:00</span>
            <span className="text-[9px] text-neutral-700">12:00</span>
            <span className="text-[9px] text-neutral-700">18:00</span>
            <span className="text-[9px] text-neutral-700">23:00</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-neutral-600">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> 情绪消费为主
            </span>
            <span className="flex items-center gap-1 text-[10px] text-neutral-600">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> 理性消费为主
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-neutral-700">
            数据来自用户自愿、匿名的消费对话。不追踪、不关联个人身份。
          </p>
        </div>
      </main>
    </div>
  );
}
