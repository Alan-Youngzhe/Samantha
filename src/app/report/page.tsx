"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Eye, Target, TrendingUp, Link2, Shield, BookOpen } from "lucide-react";
import Link from "next/link";
import { getProfile, type SpendingRecord } from "@/lib/memory";
import dynamic from "next/dynamic";

const EmotionBubble = dynamic(() => import("@/components/SpendingCharts"), { ssr: false });
import { generateReport, type ReportData } from "@/lib/report";

export default function ReportPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [spendings, setSpendings] = useState<SpendingRecord[]>([]);

  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      setReport(generateReport(profile));
      setSpendings(profile.spendings || []);
    }
  }, []);

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-neutral-400 text-sm">还没有数据。先去和 Nick 聊聊。</p>
          <Link href="/" className="text-accent text-sm mt-2 inline-block hover:underline">
            返回对话
          </Link>
        </div>
      </div>
    );
  }

  const pronoun = report.gender === "female" ? "她" : "他";

  return (
    <div className="flex-1 flex flex-col h-screen h-[100dvh] max-w-2xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
        <Link href="/" className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Nick 的笔记</h1>
          <p className="text-[11px] text-neutral-500">关于 {report.name} 的观察</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">

        {/* Nick's Narrative — the hero card */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{report.name}</h2>
              <p className="text-xs text-accent">{report.spendingPersona}</p>
            </div>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {report.nickNarrative}
          </p>
          <div className="flex gap-4 mt-4 text-[11px] text-neutral-600">
            <span>观察 {report.daysActive} 天</span>
            <span>{report.totalInteractions} 次对话</span>
          </div>
        </div>

        {/* Trigger Chains — emotional spending chains */}
        {report.triggerChains.length > 0 && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold">情绪消费链</h3>
            </div>
            <p className="text-[11px] text-neutral-600 mb-3">
              Nick 发现的「触发 → 消费」模式
            </p>
            <div className="space-y-2.5">
              {report.triggerChains.map((tc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 bg-neutral-800 px-2.5 py-1 rounded-lg shrink-0">
                    {tc.trigger}
                  </span>
                  <span className="text-neutral-600 text-xs">→</span>
                  <span className="text-xs text-accent bg-accent/10 px-2.5 py-1 rounded-lg shrink-0">
                    {tc.behavior}
                  </span>
                  <span className="text-[11px] text-neutral-700 ml-auto tabular-nums shrink-0">
                    {tc.count}次
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Self-Deception Archive — excuses & contradictions */}
        {(report.excuses.length > 0 || report.contradictions.length > 0) && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold">自我欺骗档案</h3>
            </div>
            {report.excuses.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] text-neutral-600 mb-2">常用借口</p>
                <div className="space-y-2">
                  {report.excuses.map((e, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-neutral-600 text-xs mt-0.5">"</span>
                      <p className="text-xs text-neutral-400 leading-relaxed flex-1">{e.description}</p>
                      <span className="text-[11px] text-neutral-700 tabular-nums shrink-0">×{e.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {report.contradictions.length > 0 && (
              <div>
                <p className="text-[11px] text-neutral-600 mb-2">言行矛盾</p>
                <div className="space-y-2">
                  {report.contradictions.map((c, i) => (
                    <div key={i} className="border-l-2 border-red-500/30 pl-3">
                      <p className="text-xs text-neutral-400 leading-relaxed">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emotion Bubble Chart — the one chart we keep */}
        <EmotionBubble spendings={spendings} />

        {/* Commitment Card */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">承诺追踪</h3>
          </div>
          {report.commitments.total === 0 ? (
            <p className="text-xs text-neutral-500">{pronoun}还没有做出任何承诺。也许是怕被打脸。</p>
          ) : (
            <>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-3xl font-bold text-accent tabular-nums">{report.commitments.fulfillRate}%</span>
                <span className="text-xs text-neutral-500 mb-1">兑现率</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-3">
                <div className="h-full flex">
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: `${report.commitments.total > 0 ? (report.commitments.fulfilled / report.commitments.total) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-red-500 h-full"
                    style={{ width: `${report.commitments.total > 0 ? (report.commitments.broken / report.commitments.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-green-400">✓ 兑现 {report.commitments.fulfilled}</span>
                <span className="text-red-400">✗ 打脸 {report.commitments.broken}</span>
                <span className="text-neutral-500">… 待定 {report.commitments.pending}</span>
              </div>
            </>
          )}
        </div>

        {/* Patterns Card */}
        {report.topPatterns.length > 0 && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold">行为模式</h3>
            </div>
            <div className="space-y-3">
              {report.topPatterns.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-neutral-300">{p.pattern}</div>
                    <div className="text-[11px] text-neutral-600">{p.category} · {p.count} 次</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nick's Notebook */}
        {report.recentHighlights.length > 0 && (
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold">Nick 的笔记本</h3>
            </div>
            <div className="space-y-3">
              {report.recentHighlights.map((h, i) => (
                <div key={i} className="border-l-2 border-accent/20 pl-3">
                  <div className="text-[11px] text-neutral-600 mb-1">{h.date}</div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{h.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-neutral-700 italic">
            Nick 还在观察。数据越多，{pronoun}越藏不住。
          </p>
        </div>
      </div>
    </div>
  );
}
