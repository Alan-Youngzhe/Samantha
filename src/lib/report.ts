// 省报 — 数据聚合逻辑
import { UserProfile } from "./memory";

export interface ReportData {
  name: string;
  gender: "male" | "female" | "other";
  daysActive: number;
  totalInteractions: number;
  photosShared: number;
  commitments: {
    total: number;
    fulfilled: number;
    broken: number;
    pending: number;
    fulfillRate: number;
  };
  topPatterns: Array<{
    category: string;
    pattern: string;
    count: number;
    emoji: string;
  }>;
  recentHighlights: Array<{
    date: string;
    summary: string;
  }>;
}

const CATEGORY_EMOJI: Record<string, string> = {
  eating: "🍜",
  activity: "🏃",
  spending: "💸",
  mood: "😶",
  social: "👥",
};

const CATEGORY_LABEL: Record<string, string> = {
  eating: "饮食",
  activity: "活动",
  spending: "消费",
  mood: "情绪",
  social: "社交",
};

export function generateReport(profile: UserProfile): ReportData {
  const fulfilled = profile.commitments.filter((c) => c.status === "fulfilled").length;
  const broken = profile.commitments.filter((c) => c.status === "broken").length;
  const pending = profile.commitments.filter((c) => c.status === "pending").length;
  const total = profile.commitments.length;

  const topPatterns = [...profile.patterns]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((p) => ({
      category: CATEGORY_LABEL[p.category] || p.category,
      pattern: p.pattern,
      count: p.count,
      emoji: CATEGORY_EMOJI[p.category] || "📌",
    }));

  // Extract recent highlights (last 5 interactions with AI insights)
  const recentHighlights = profile.memories
    .slice(-5)
    .map((m) => ({
      date: new Date(m.timestamp).toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
        weekday: "short",
      }),
      summary:
        m.aiResponse.length > 80
          ? m.aiResponse.substring(0, 80) + "..."
          : m.aiResponse,
    }));

  return {
    name: profile.name,
    gender: profile.gender,
    daysActive: profile.stats.daysActive,
    totalInteractions: profile.stats.totalInteractions,
    photosShared: profile.stats.photosShared,
    commitments: {
      total,
      fulfilled,
      broken,
      pending,
      fulfillRate: total > 0 ? Math.round((fulfilled / total) * 100) : 0,
    },
    topPatterns,
    recentHighlights,
  };
}

export { CATEGORY_EMOJI, CATEGORY_LABEL };
