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

function getPersonalityText(profile: UserProfile): string {
  const traits = profile.traits || [];
  const personalityTrait = traits.find((t) => t.category === "personality");
  if (personalityTrait) return personalityTrait.description;
  if (traits.length === 0) return "";
  return traits[traits.length - 1].description;
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
        <div className="mt-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-[14px] border border-[#D4C4B4]">
          <span className="text-[11px]">💬</span>
          <span className="text-xs text-muted">和 Samantha 聊天第 {daysActive} 天</span>
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
          <h2 className="text-[15px] font-semibold text-foreground mb-2.5">消费习惯</h2>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-surface rounded-[10px] py-2.5 text-center">
              <p className="text-lg font-bold text-foreground">¥{getAvgSpending(profile) || "—"}</p>
              <p className="text-[10px] text-muted mt-1">均单价</p>
            </div>
            <div className="bg-surface rounded-[10px] py-2.5 text-center">
              <p className="text-lg font-bold text-foreground">{getTopCategory(profile)}</p>
              <p className="text-[10px] text-muted mt-1">最爱品类</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface rounded-[10px] py-2.5 text-center">
              <p className="text-lg font-bold text-foreground">{getPeakTime(profile)}</p>
              <p className="text-[10px] text-muted mt-1">高频时段</p>
            </div>
            <div className="bg-surface rounded-[10px] py-2.5 text-center">
              <p className="text-lg font-bold text-foreground">{getEmotionalRatio(profile)}%</p>
              <p className="text-[10px] text-muted mt-1">跟心情有关</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
