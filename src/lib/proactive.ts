// 主动对话引擎 — Proactive Agent
// 不等用户开口，Samantha 主动聊天茬

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
      message: `对了，你之前说过“${c.content}”来着，都${daysSince}天了……你还记得吧？我就是帮你记着。`,
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
        message: `现在是${risk.label}……我想起来你这周有${emotionalCount}笔消费跟心情有关。你现在还好吗？`,
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
        message: `我数了下你最近的消费——¥${last3[0].amount}，¥${last3[1].amount}，¥${last3[2].amount}，越来越多了。不是说不好，就是想让你知道。`,
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
          message: `这周${weekSpendings.length}笔消费里，有${emotionalCount}笔好像都跟心情有关。我就是注意到了，提一嘴。`,
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
