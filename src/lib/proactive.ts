// 主动刺穿引擎 — Proactive Agent
// 不等用户开口，Nick 主动找茬

import type { UserProfile } from "./memory";

const PROACTIVE_KEY = "bz-proactive-last";

export interface ProactiveResult {
  shouldTrigger: boolean;
  message?: string;
  reason?: string;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentHour(): number {
  return new Date().getHours();
}

function isHighRiskPeriod(): { isRisk: boolean; label: string } {
  const h = currentHour();
  const day = new Date().getDay(); // 0=Sun, 5=Fri
  if (day === 5 && h >= 14 && h <= 18) return { isRisk: true, label: "周五下午" };
  if (h >= 22 || h <= 1) return { isRisk: true, label: "深夜" };
  if ((day === 6 || day === 0) && h >= 10 && h <= 16) return { isRisk: true, label: "周末白天" };
  return { isRisk: false, label: "" };
}

export function checkProactiveTrigger(profile: UserProfile): ProactiveResult {
  // Only trigger once per day
  if (typeof window !== "undefined") {
    const last = localStorage.getItem(PROACTIVE_KEY);
    if (last === todayKey()) return { shouldTrigger: false };
  }

  const pronoun = profile.gender === "female" ? "她" : "他";
  const spendings = profile.spendings || [];
  const commitments = profile.commitments || [];

  // ── Trigger 1: Stale commitment (pending > 3 days) ──
  const staleDays = 3;
  const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();
  const staleCommitments = commitments.filter(
    (c) => c.status === "pending" && c.madeAt < staleDate
  );
  if (staleCommitments.length > 0) {
    const c = staleCommitments[0];
    const daysSince = Math.floor(
      (Date.now() - new Date(c.madeAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    markTriggered();
    return {
      shouldTrigger: true,
      reason: "stale_commitment",
      message: `对了。${pronoun}${daysSince}天前说过一句话——"${c.content}"。我一直记着呢。${pronoun}大概忘了吧。`,
    };
  }

  // ── Trigger 2: High-risk time period ──
  const risk = isHighRiskPeriod();
  if (risk.isRisk && spendings.length >= 3) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekSpendings = spendings.filter((s) => s.timestamp > weekAgo);
    const emotionalCount = weekSpendings.filter(
      (s) => s.motive === "emotional" || s.motive === "impulse" || s.motive === "reward"
    ).length;
    if (emotionalCount > 0) {
      markTriggered();
      return {
        shouldTrigger: true,
        reason: "high_risk_period",
        message: `${risk.label}了。我就随便提一嘴啊——${pronoun}这周已经有${emotionalCount}笔不太理性的消费了。我猜接下来${pronoun}会打开外卖或者淘宝。也可能不会。看${pronoun}的了。`,
      };
    }
  }

  // ── Trigger 3: Escalating spending (last 3 amounts increasing) ──
  if (spendings.length >= 3) {
    const last3 = spendings.slice(-3);
    if (last3[0].amount < last3[1].amount && last3[1].amount < last3[2].amount) {
      markTriggered();
      return {
        shouldTrigger: true,
        reason: "escalating",
        message: `¥${last3[0].amount}，¥${last3[1].amount}，¥${last3[2].amount}。你看这三个数字，越来越大。不一定说明什么。但我觉得值得${pronoun}自己看一眼。`,
      };
    }
  }

  // ── Trigger 4: Emotional spending ratio > 60% this week ──
  if (spendings.length >= 5) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekSpendings = spendings.filter((s) => s.timestamp > weekAgo);
    if (weekSpendings.length >= 3) {
      const emotionalCount = weekSpendings.filter(
        (s) => s.motive === "emotional" || s.motive === "impulse" || s.motive === "reward"
      ).length;
      const ratio = emotionalCount / weekSpendings.length;
      if (ratio > 0.6) {
        markTriggered();
        const pct = Math.round(ratio * 100);
        return {
          shouldTrigger: true,
          reason: "emotional_ratio",
          message: `这周${weekSpendings.length}笔消费，其中${emotionalCount}笔……怎么说呢，不太像是因为需要。${pct}%了。我就是说一下。`,
        };
      }
    }
  }

  return { shouldTrigger: false };
}

function markTriggered(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PROACTIVE_KEY, todayKey());
  }
}
