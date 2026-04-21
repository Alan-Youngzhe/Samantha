"use client";

import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bubble } from "react-chartjs-2";
import type { SpendingRecord } from "@/lib/memory";

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

const MUTED = "rgba(255,255,255,0.35)";
const GRID = "rgba(255,255,255,0.06)";

const MOTIVE_COLORS: Record<string, string> = {
  need: "#22c55e",
  emotional: "#ef4444",
  impulse: "#f59e0b",
  social: "#8b5cf6",
  habitual: "#3b82f6",
  reward: "#ec4899",
};
const MOTIVE_LABELS: Record<string, string> = {
  need: "真实需要",
  emotional: "情绪消费",
  impulse: "冲动消费",
  social: "社交消费",
  habitual: "习惯消费",
  reward: "自我奖励",
};

function emotionScore(motive: string): number {
  const scores: Record<string, number> = {
    need: 10,
    habitual: 35,
    social: 55,
    reward: 65,
    impulse: 80,
    emotional: 95,
  };
  return scores[motive] ?? 50;
}

interface Props {
  spendings: SpendingRecord[];
}

export default function SpendingCharts({ spendings }: Props) {
  if (spendings.length === 0) return null;

  const bubbleMotiveCount: Record<string, { totalAmount: number; count: number }> = {};
  for (const s of spendings) {
    if (!bubbleMotiveCount[s.motive]) bubbleMotiveCount[s.motive] = { totalAmount: 0, count: 0 };
    bubbleMotiveCount[s.motive].totalAmount += s.amount;
    bubbleMotiveCount[s.motive].count += 1;
  }

  const bubbleDatasets = Object.entries(bubbleMotiveCount).map(([motive, d]) => ({
    label: MOTIVE_LABELS[motive] || motive,
    data: [
      {
        x: Math.round(d.totalAmount / d.count),
        y: emotionScore(motive),
        r: Math.min(4 + d.count * 4, 24),
      },
    ],
    backgroundColor: (MOTIVE_COLORS[motive] || "#666") + "99",
    borderColor: MOTIVE_COLORS[motive] || "#666",
    borderWidth: 1,
  }));

  const bubbleData = { datasets: bubbleDatasets };

  const bubbleOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: MUTED, boxWidth: 10, font: { size: 10 } } },
    },
    scales: {
      x: {
        title: { display: true, text: "平均金额 (¥)", color: MUTED, font: { size: 10 } },
        ticks: { color: MUTED, font: { size: 10 }, callback: (v: unknown) => `¥${v}` },
        grid: { color: GRID },
      },
      y: {
        title: { display: true, text: "情绪补偿指数", color: MUTED, font: { size: 10 } },
        ticks: { color: MUTED, font: { size: 10 } },
        grid: { color: GRID },
        min: 0,
        max: 100,
      },
    },
  };

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-1">你的钱在给什么情绪买单</h3>
      <p className="text-[11px] text-neutral-600 mb-3">气泡越大 = 出现次数越多，越高 = 情绪驱动越强</p>
      <div className="h-52">
        <Bubble data={bubbleData} options={bubbleOptions} />
      </div>
    </div>
  );
}
