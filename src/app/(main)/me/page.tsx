"use client";

import { useState, useEffect } from "react";
import { getProfile, type UserProfile } from "@/lib/memory";

// ── Helper functions ──

const MOOD_COLORS: Record<string, string> = {
  "平静": "#7CAF6B",
  "开心": "#D4A853",
  "兴奋": "#E8564A",
  "心动": "#EC6B9C",
  "累": "#8B7355",
  "累但满足": "#B8A089",
  "决心": "#3B82F6",
  "沁丧": "#8B7355",
  "烦": "#B8A089",
};

const MOOD_EMOJI: Record<string, string> = {
  "平静": "😌",
  "开心": "😊",
  "兴奋": "🤩",
  "心动": "💕",
  "累": "😮‍💨",
  "累但满足": "😌",
  "决心": "💪",
  "沁丧": "😞",
  "烦": "😤",
};

const TRAIT_PREFIXES: Record<string, string[]> = {
  preference: ["我发现你", "我注意到你"],
  habit: ["有个事情我一直想说——", "我觉得你自己可能没意识到，"],
  mood_pattern: ["我有点担心，", "我感觉到"],
  social_style: ["我觉得你", "我看得出来你"],
  value: ["跟你聊久了我发现，", "我喜欢你这一点——"],
  contradiction: ["有个有意思的事——", "说个好玩的，"],
  personality: ["我觉得你是那种", "和你聊天让我觉得你是"],
};

function traitToDiary(category: string, description: string): string {
  const prefixes = TRAIT_PREFIXES[category] || ["我注意到"];
  const prefix = prefixes[Math.floor(description.length % prefixes.length)];
  return `${prefix}${description}`;
}

function getTopCategory(profile: UserProfile): string {
  const spendings = profile.spendings || [];
  if (spendings.length === 0) return "—";
  const catCount: Record<string, number> = {};
  for (const s of spendings) {
    catCount[s.category] = (catCount[s.category] || 0) + 1;
  }
  const sorted = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
  const labels: Record<string, string> = { coffee: "咖啡", food: "餐饮", shopping: "购物", entertainment: "娱乐", other: "其他" };
  return labels[sorted[0][0]] || sorted[0][0];
}

function getAvgSpending(profile: UserProfile): number {
  const spendings = profile.spendings || [];
  if (spendings.length === 0) return 0;
  const total = spendings.reduce((sum, s) => sum + s.amount, 0);
  return Math.round(total / spendings.length);
}

function getPeakTime(profile: UserProfile): string {
  const spendings = profile.spendings || [];
  if (spendings.length === 0) return "—";
  const hourCount: Record<number, number> = {};
  for (const s of spendings) {
    const h = new Date(s.timestamp).getHours();
    hourCount[h] = (hourCount[h] || 0) + 1;
  }
  const sorted = Object.entries(hourCount).sort((a, b) => b[1] - a[1]);
  const peakHour = parseInt(sorted[0][0]);
  if (peakHour < 12) return "上午";
  if (peakHour < 14) return "午间";
  if (peakHour < 18) return "下午";
  return "晚间";
}

function getEmotionalRatio(profile: UserProfile): number {
  const spendings = profile.spendings || [];
  if (spendings.length === 0) return 0;
  const emotionalCount = spendings.filter(
    (s) => s.motive === "emotional" || s.motive === "impulse" || s.motive === "reward"
  ).length;
  return Math.round((emotionalCount / spendings.length) * 100);
}

const CATEGORY_EMOJI: Record<string, string> = {
  coffee: "☕",
  food: "🍜",
  shopping: "🛍️",
  entertainment: "🎬",
  transport: "🚇",
  daily: "🧴",
  other: "📦",
};

const CATEGORY_LABEL: Record<string, string> = {
  coffee: "咖啡",
  food: "餐饮",
  shopping: "购物",
  entertainment: "娱乐",
  transport: "交通",
  daily: "日用",
  other: "其他",
};

function getSpendingNarrative(profile: UserProfile): string[] {
  const spendings = profile.spendings || [];
  if (spendings.length < 2) return [];
  const tags: string[] = [];

  // 时段×品类交叉
  const peakHour = getPeakHourRaw(profile);
  const topCat = getTopCategoryRaw(profile);
  if (peakHour >= 12 && peakHour < 18 && topCat === "coffee") {
    tags.push("下午会想喝点东西 ☕");
  } else if (peakHour >= 18 && topCat === "food") {
    tags.push("晚上喜欢出去吃 🍜");
  } else if (peakHour < 12 && topCat === "coffee") {
    tags.push("早上离不开咖啡 ☕");
  } else if (topCat) {
    tags.push(`${CATEGORY_EMOJI[topCat] || "📦"} ${CATEGORY_LABEL[topCat] || topCat}是你的常客`);
  }

  // 情绪动机
  const emotionalRatio = getEmotionalRatio(profile);
  if (emotionalRatio >= 60) {
    tags.push("心情不好的时候容易冲动买 🛍️");
  } else if (emotionalRatio >= 35) {
    tags.push("消费里有一半跟心情有关 💭");
  }

  // 消费态度
  const avg = getAvgSpending(profile);
  if (avg >= 80) {
    tags.push("你对自己挺大方的 💰");
  } else if (avg >= 40 && avg < 80) {
    tags.push("花钱不算大手大脚 🤏");
  } else if (avg > 0 && avg < 40) {
    tags.push("你挺省的 🫙");
  }

  return tags.slice(0, 3);
}

function getPeakHourRaw(profile: UserProfile): number {
  const spendings = profile.spendings || [];
  if (spendings.length === 0) return 12;
  const hourCount: Record<number, number> = {};
  for (const s of spendings) {
    const h = new Date(s.timestamp).getHours();
    hourCount[h] = (hourCount[h] || 0) + 1;
  }
  const sorted = Object.entries(hourCount).sort((a, b) => b[1] - a[1]);
  return parseInt(sorted[0][0]);
}

function getTopCategoryRaw(profile: UserProfile): string {
  const spendings = profile.spendings || [];
  if (spendings.length === 0) return "";
  const catCount: Record<string, number> = {};
  for (const s of spendings) {
    catCount[s.category] = (catCount[s.category] || 0) + 1;
  }
  const sorted = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

function getTimeDistribution(profile: UserProfile): { label: string; count: number; emoji: string }[] {
  const spendings = profile.spendings || [];
  const slots = [
    { label: "上午", range: [6, 12], emoji: "🌅" },
    { label: "午间", range: [12, 14], emoji: "🍱" },
    { label: "下午", range: [14, 18], emoji: "☕" },
    { label: "晚间", range: [18, 24], emoji: "🌙" },
  ];
  return slots.map((slot) => {
    const count = spendings.filter((s) => {
      const h = new Date(s.timestamp).getHours();
      return h >= slot.range[0] && h < slot.range[1];
    }).length;
    return { label: slot.label, count, emoji: slot.emoji };
  });
}

function getPersonalityText(profile: UserProfile): string {
  const traits = profile.traits || [];
  const personalityTrait = traits.find((t) => t.category === "personality");
  if (personalityTrait) return personalityTrait.description;
  if (traits.length === 0) return "";
  return traits[traits.length - 1].description;
}

function getRelationshipClock(createdAt: string): string {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const hours = Math.max(1, Math.floor(elapsed / 3600000));
  if (hours < 24) return `${hours}h`;
  return `${Math.max(1, Math.floor(hours / 24))} 天`;
}

function getRelationshipProgress(profile: UserProfile): { label: string; sublabel: string; progress: number } {
  const score = Math.min(
    100,
    profile.stats.totalInteractions * 7 + profile.stats.photosShared * 10 + profile.commitments.length * 6 + profile.traits.length * 5
  );

  if (score < 20) {
    return {
      label: "我才刚刚摸到你生活的一点边角",
      sublabel: "再多聊几句，我会更知道你在意什么。",
      progress: 18,
    };
  }

  if (score < 45) {
    return {
      label: "我开始记住你那些很小的习惯了",
      sublabel: "比如你会在什么时刻想喝点东西，或者突然想躲起来。",
      progress: 38,
    };
  }

  if (score < 70) {
    return {
      label: "你的情绪和节奏，我已经能慢慢接住了",
      sublabel: "有些话你没明说，我也会隐约感觉到。",
      progress: 62,
    };
  }

  if (score < 90) {
    return {
      label: "你已经把一部分世界认真地借给我了",
      sublabel: "我不只是记得你去过哪，还会记得你当时是怎么想的。",
      progress: 82,
    };
  }

  return {
    label: "我已经很熟悉你留给我的那些细节了",
    sublabel: "像一本被翻过很多次的日记，越看越有温度。",
    progress: 96,
  };
}

// ── Component ──

export default function MePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const p = getProfile();
    if (p) setProfile(p);
  }, []);

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-sm text-muted">还没有个人资料，先去和 Samantha 聊聊吧。</p>
      </div>
    );
  }

  const daysActive = Math.max(1, Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86400000));
  const traits = profile.traits || [];
  const commitments = profile.commitments || [];
  const triggerChains = profile.triggerChains || [];
  const memoriesWithMood = profile.memories.filter((m) => m.mood);
  const relationshipProgress = getRelationshipProgress(profile);
  const relationshipClock = getRelationshipClock(profile.createdAt);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Top bar */}
      <div className="flex justify-end px-5 pt-4">
        <button className="text-xs text-text-secondary px-3 py-1.5 rounded-2xl border border-[#D4C4B4] hover:bg-card transition-colors">
          设置
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center pt-5 pb-6">
        <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-3">
          <span className="text-white text-xl">📷</span>
        </div>
        <h1 className="text-[22px] font-bold text-foreground">{profile.name}</h1>
        <div className="mt-3 px-4 py-3 rounded-[18px] border border-[#D4C4B4] bg-card w-[calc(100%-40px)] max-w-sm">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span>💬</span>
            <span>Samantha 进入你的世界已经 {daysActive > 1 ? `${daysActive} 天` : relationshipClock}</span>
          </div>
          <p className="mt-2 text-[13px] text-foreground leading-relaxed">{relationshipProgress.label}</p>
          <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">{relationshipProgress.sublabel}</p>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted">我对你的了解</span>
              <span className="text-[10px] text-accent font-medium">{relationshipProgress.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${relationshipProgress.progress}%` }} />
            </div>
          </div>
        </div>
        {getPersonalityText(profile) && (
          <p className="mt-2 text-xs text-text-secondary italic">
            &ldquo;{getPersonalityText(profile)}&rdquo;
          </p>
        )}
      </div>

      {/* 1. 情绪轨迹 */}
      <div className="mx-4 mb-4">
        <div className="bg-card rounded-2xl p-4 border border-card-border">
          <h2 className="text-[15px] font-semibold text-foreground mb-3">最近的心情</h2>
          {memoriesWithMood.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {memoriesWithMood.slice(-10).map((m) => {
                const emoji = MOOD_EMOJI[m.mood!] || "🫥";
                const color = MOOD_COLORS[m.mood!] || "#B8A089";
                const day = new Date(m.timestamp).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
                return (
                  <div key={m.id} className="flex flex-col items-center shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: color + "1A", border: `1.5px solid ${color}40` }}
                    >
                      {emoji}
                    </div>
                    <span className="text-[9px] text-muted mt-1">{day}</span>
                    <span className="text-[9px] text-text-secondary">{m.mood}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted">Samantha 还在学习感知你的情绪。多聊几次就会出现啦。</p>
          )}
        </div>
      </div>

      {/* 2. Samantha 的心迹 */}
      {traits.length > 0 && (
        <div className="mx-4 mb-4">
          <div className="bg-card rounded-2xl p-4 border border-card-border">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[15px] font-semibold text-foreground">Samantha 的心迹</h2>
              <span className="text-[10px] text-muted">—— 她想对你说的话</span>
            </div>
            <div className="space-y-3">
              {traits.slice(-5).map((t, i) => (
                <div key={i} className="pl-3 border-l-2 border-accent/20">
                  <p className="text-[13px] text-foreground leading-relaxed">
                    {traitToDiary(t.category, t.description)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. 承诺追踪 */}
      {commitments.length > 0 && (
        <div className="mx-4 mb-4">
          <div className="bg-card rounded-2xl p-4 border border-card-border">
            <h2 className="text-[15px] font-semibold text-foreground mb-3">你说过的话</h2>
            <div className="space-y-2">
              {commitments.slice(-5).map((c) => {
                const statusConfig = {
                  pending: { label: "还没兑现", color: "text-[#D4A853]", bg: "bg-[#D4A853]/10" },
                  fulfilled: { label: "做到了", color: "text-[#7CAF6B]", bg: "bg-[#7CAF6B]/10" },
                  broken: { label: "没能坚持", color: "text-[#E8564A]", bg: "bg-[#E8564A]/10" },
                };
                const sc = statusConfig[c.status];
                const date = new Date(c.madeAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground truncate">&ldquo;{c.content}&rdquo;</p>
                      <p className="text-[10px] text-muted mt-0.5">{date}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${sc.color} ${sc.bg}`}>
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. 情绪-行为关联 */}
      {triggerChains.length > 0 && (
        <div className="mx-4 mb-4">
          <div className="bg-card rounded-2xl p-4 border border-card-border">
            <h2 className="text-[15px] font-semibold text-foreground mb-3">我发现的规律</h2>
            <div className="space-y-2.5">
              {triggerChains.slice(-4).map((tc) => (
                <div key={tc.id} className="flex items-center gap-2">
                  <span className="text-[13px] text-text-secondary">&ldquo;{tc.trigger}&rdquo;</span>
                  <span className="text-muted text-xs">→</span>
                  <span className="text-[13px] text-foreground font-medium">&ldquo;{tc.behavior}&rdquo;</span>
                  <span className="text-[10px] text-muted ml-auto shrink-0">({tc.count}次)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. 消费习惯 */}
      <div className="mx-4 mb-6">
        <div className="bg-card rounded-2xl p-4 border border-card-border">
          <h2 className="text-[15px] font-semibold text-foreground mb-3">消费习惯</h2>

          {/* 情绪标签行 */}
          {(() => {
            const narrative = getSpendingNarrative(profile);
            if (narrative.length > 0) {
              return (
                <div className="flex flex-wrap gap-2 mb-3">
                  {narrative.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full bg-surface text-[12px] text-foreground leading-snug"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              );
            }
            return null;
          })()}

          {/* 时段分布横条 */}
          {(() => {
            const dist = getTimeDistribution(profile);
            const maxCount = Math.max(...dist.map((d) => d.count), 1);
            const hasData = dist.some((d) => d.count > 0);
            if (!hasData) return null;
            return (
              <div className="mb-3">
                <div className="flex items-end gap-1.5 h-10">
                  {dist.map((d) => (
                    <div key={d.label} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded-t-sm bg-accent/60 transition-all duration-300"
                        style={{ height: `${Math.max((d.count / maxCount) * 28, d.count > 0 ? 4 : 0)}px` }}
                      />
                      <span className="text-[9px] text-muted">{d.emoji}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5 mt-0.5">
                  {dist.map((d) => (
                    <div key={d.label} className="flex-1 text-center">
                      <span className="text-[9px] text-text-secondary">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 辅助数字 2×2 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface rounded-[10px] py-2 text-center">
              <p className="text-[15px] font-bold text-foreground">¥{getAvgSpending(profile) || "—"}</p>
              <p className="text-[10px] text-muted mt-0.5">均单价</p>
            </div>
            <div className="bg-surface rounded-[10px] py-2 text-center">
              <p className="text-[15px] font-bold text-foreground">{getTopCategory(profile)}</p>
              <p className="text-[10px] text-muted mt-0.5">最爱品类</p>
            </div>
            <div className="bg-surface rounded-[10px] py-2 text-center">
              <p className="text-[15px] font-bold text-foreground">{getPeakTime(profile)}</p>
              <p className="text-[10px] text-muted mt-0.5">高频时段</p>
            </div>
            <div className="bg-surface rounded-[10px] py-2 text-center">
              <p className="text-[15px] font-bold text-foreground">{getEmotionalRatio(profile)}%</p>
              <p className="text-[10px] text-muted mt-0.5">跟心情有关</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
