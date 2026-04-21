"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Eye, Target, TrendingUp, Camera, MessageCircle, Calendar } from "lucide-react";
import Link from "next/link";
import { getProfile } from "@/lib/memory";
import { generateReport, type ReportData } from "@/lib/report";

export default function ReportPage() {
  const [report, setReport] = useState<ReportData | null>(null);

  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      setReport(generateReport(profile));
    }
  }, []);

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-muted text-sm">还没有数据，先去和三省聊聊吧</p>
          <Link href="/" className="text-accent text-sm mt-2 inline-block">
            返回对话
          </Link>
        </div>
      </div>
    );
  }

  const pronoun = report.gender === "female" ? "她" : "他";

  return (
    <div className="flex-1 flex flex-col h-screen max-w-2xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-card-border">
        <Link href="/" className="p-1 text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-sm font-semibold">镜我</h1>
          <p className="text-xs text-muted">{report.name} 的生活审计报告</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Overview Card */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{report.name}</h2>
              <p className="text-xs text-muted">被审视了 {report.daysActive} 天</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-background">
              <MessageCircle className="w-4 h-4 text-accent mx-auto mb-1" />
              <div className="text-lg font-bold">{report.totalInteractions}</div>
              <div className="text-xs text-muted">对话</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-background">
              <Camera className="w-4 h-4 text-accent mx-auto mb-1" />
              <div className="text-lg font-bold">{report.photosShared}</div>
              <div className="text-xs text-muted">照片</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-background">
              <Calendar className="w-4 h-4 text-accent mx-auto mb-1" />
              <div className="text-lg font-bold">{report.daysActive}</div>
              <div className="text-xs text-muted">天</div>
            </div>
          </div>
        </div>

        {/* Commitment Card */}
        <div className="bg-card border border-card-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">承诺追踪</h3>
          </div>
          {report.commitments.total === 0 ? (
            <p className="text-xs text-muted">{pronoun}还没有做出任何承诺。连画饼都不愿意，也是一种态度。</p>
          ) : (
            <>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-3xl font-bold text-accent">{report.commitments.fulfillRate}%</span>
                <span className="text-xs text-muted mb-1">兑现率</span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 bg-background rounded-full overflow-hidden mb-3">
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
                <span className="text-muted">… 待定 {report.commitments.pending}</span>
              </div>
            </>
          )}
        </div>

        {/* Patterns Card */}
        {report.topPatterns.length > 0 && (
          <div className="bg-card border border-card-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold">行为模式</h3>
            </div>
            <div className="space-y-3">
              {report.topPatterns.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{p.pattern}</div>
                    <div className="text-xs text-muted">{p.category} · 出现 {p.count} 次</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Highlights */}
        {report.recentHighlights.length > 0 && (
          <div className="bg-card border border-card-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">最近的审视</h3>
            <div className="space-y-3">
              {report.recentHighlights.map((h, i) => (
                <div key={i} className="border-l-2 border-accent/30 pl-3">
                  <div className="text-xs text-muted mb-1">{h.date}</div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{h.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer quote */}
        <div className="text-center py-4">
          <p className="text-xs text-muted/50 italic">
            "真正的改变不需要宣言，需要沉默的执行。"
          </p>
        </div>
      </div>
    </div>
  );
}
