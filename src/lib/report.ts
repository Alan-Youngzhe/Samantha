// 别装 — 心理洞察报告数据聚合
import { UserProfile, type TriggerChain, type UserTrait } from "./memory";

export interface ReportData {
  name: string;
  gender: "male" | "female" | "other";
  daysActive: number;
  totalInteractions: number;
  // Nick 风格人格叙述
  nickNarrative: string;
  spendingPersona: string;
  // 心理洞察数据
  triggerChains: TriggerChain[];
  excuses: UserTrait[];
  contradictions: UserTrait[];
  fears: UserTrait[];
  // 承诺追踪（心理维度）
  commitments: {
    total: number;
    fulfilled: number;
    broken: number;
    pending: number;
    fulfillRate: number;
  };
  // 行为模式（保留）
  topPatterns: Array<{
    category: string;
    pattern: string;
    count: number;
    emoji: string;
  }>;
  // Nick 的笔记
  recentHighlights: Array<{
    date: string;
    summary: string;
  }>;
}

const PATTERN_EMOJI: Record<string, string> = {
  impulse: "⚡",
  emotional: "😤",
  social: "👥",
  habitual: "🔄",
  rational: "✅",
};

const PATTERN_LABEL: Record<string, string> = {
  impulse: "冲动消费",
  emotional: "情绪消费",
  social: "社交消费",
  habitual: "习惯消费",
  rational: "理性消费",
};

export const MOTIVE_LABELS: Record<string, string> = {
  need: "真实需要",
  emotional: "情绪消费",
  impulse: "冲动消费",
  social: "社交消费",
  habitual: "习惯消费",
  reward: "自我奖励",
};

export const MOTIVE_COLORS: Record<string, string> = {
  need: "#22c55e",
  emotional: "#ef4444",
  impulse: "#f59e0b",
  social: "#8b5cf6",
  habitual: "#3b82f6",
  reward: "#ec4899",
};

function derivePersona(profile: UserProfile): string {
  const traits = profile.traits || [];
  const personaTrait = traits.find((t) => t.category === "persona");
  if (personaTrait) return personaTrait.description;

  const spendings = profile.spendings || [];
  if (spendings.length === 0) return "数据不足";
  const emotionalCount = spendings.filter((s) => s.motive === "emotional" || s.motive === "reward").length;
  const impulseCount = spendings.filter((s) => s.motive === "impulse").length;
  const socialCount = spendings.filter((s) => s.motive === "social").length;
  const habitualCount = spendings.filter((s) => s.motive === "habitual").length;

  const max = Math.max(emotionalCount, impulseCount, socialCount, habitualCount);
  if (max === emotionalCount) return "情绪补偿型消费者";
  if (max === impulseCount) return "冲动决策型消费者";
  if (max === socialCount) return "社交货币囤积者";
  if (max === habitualCount) return "仪式感依赖者";
  return "混合型消费者";
}

function buildNickNarrative(profile: UserProfile): string {
  const pronoun = profile.gender === "female" ? "她" : "他";
  const traits = profile.traits || [];
  const spendings = profile.spendings || [];
  const chains = profile.triggerChains || [];

  if (spendings.length === 0 && traits.length === 0) {
    return `${pronoun}刚来。还看不出什么。让我再观察一阵。`;
  }

  const parts: string[] = [];

  // Persona
  const persona = derivePersona(profile);
  if (persona !== "数据不足") {
    parts.push(`${profile.name}是个${persona}。`);
  }

  // Most common trigger chain
  if (chains.length > 0) {
    const top = [...chains].sort((a, b) => b.count - a.count)[0];
    parts.push(`${pronoun}最明显的模式是"${top.trigger}"之后就会"${top.behavior}"——已经${top.count}次了。`);
  }

  // Excuses
  const excuses = traits.filter((t) => t.category === "excuse");
  if (excuses.length > 0) {
    parts.push(`${pronoun}最常用的借口是"${excuses[0].description}"。`);
  }

  // Contradictions
  const contradictions = traits.filter((t) => t.category === "contradiction");
  if (contradictions.length > 0) {
    parts.push(`有意思的是——${contradictions[0].description}。`);
  }

  if (parts.length === 0) {
    parts.push(`还在观察${pronoun}。数据不够多，但已经有些苗头了。`);
  }

  return parts.join("");
}

export function generateReport(profile: UserProfile): ReportData {
  const fulfilled = profile.commitments.filter((c) => c.status === "fulfilled").length;
  const broken = profile.commitments.filter((c) => c.status === "broken").length;
  const pending = profile.commitments.filter((c) => c.status === "pending").length;
  const total = profile.commitments.length;

  const traits = profile.traits || [];

  const topPatterns = [...profile.patterns]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((p) => ({
      category: PATTERN_LABEL[p.category] || p.category,
      pattern: p.pattern,
      count: p.count,
      emoji: PATTERN_EMOJI[p.category] || "📌",
    }));

  const recentHighlights = profile.memories
    .slice(-5)
    .map((m) => ({
      date: new Date(m.timestamp).toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
        weekday: "short",
      }),
      summary:
        m.aiResponse.length > 100
          ? m.aiResponse.substring(0, 100) + "..."
          : m.aiResponse,
    }));

  return {
    name: profile.name,
    gender: profile.gender,
    daysActive: profile.stats.daysActive,
    totalInteractions: profile.stats.totalInteractions,
    nickNarrative: buildNickNarrative(profile),
    spendingPersona: derivePersona(profile),
    triggerChains: (profile.triggerChains || []).sort((a, b) => b.count - a.count),
    excuses: traits.filter((t) => t.category === "excuse"),
    contradictions: traits.filter((t) => t.category === "contradiction"),
    fears: traits.filter((t) => t.category === "fear"),
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

export { PATTERN_EMOJI, PATTERN_LABEL };
