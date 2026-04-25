"use client";

import { useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";

interface ChatSidebarProps {
  open: boolean;
  onClose: () => void;
  dateKeys: string[];
  activeDate: string;
  onSelectDate: (date: string) => void;
  onNewChat: () => void;
  onDeleteDate: (dateKey: string) => void;
  diary: Record<string, { role: string; content: string }[]>;
}

function baseKey(key: string): string {
  // Strip _timestamp suffix: "2026-04-24_1714000000000" → "2026-04-24"
  return key.includes("_") ? key.split("_")[0] : key;
}

function formatDateLabel(key: string): string {
  const base = baseKey(key);
  const now = new Date();
  const today = now.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
  const isExtra = key.includes("_");
  if (base === today) return isExtra ? "新对话" : "今天";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
  if (base === yKey) return "昨天";
  const d = new Date(base);
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" });
}

function groupByPeriod(keys: string[]): { label: string; keys: string[] }[] {
  const now = new Date();
  const today = now.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { label: string; keys: string[] }[] = [];
  const todayGroup: string[] = [];
  const yesterdayGroup: string[] = [];
  const weekGroup: string[] = [];
  const olderGroup: string[] = [];

  for (const k of keys) {
    const bk = baseKey(k);
    if (bk === today) todayGroup.push(k);
    else if (bk === yKey) yesterdayGroup.push(k);
    else if (new Date(bk) >= weekAgo) weekGroup.push(k);
    else olderGroup.push(k);
  }

  if (todayGroup.length) groups.push({ label: "今天", keys: todayGroup });
  if (yesterdayGroup.length) groups.push({ label: "昨天", keys: yesterdayGroup });
  if (weekGroup.length) groups.push({ label: "本周", keys: weekGroup });
  if (olderGroup.length) groups.push({ label: "更早", keys: olderGroup });

  return groups;
}

export default function ChatSidebar({
  open,
  onClose,
  dateKeys,
  activeDate,
  onSelectDate,
  onNewChat,
  onDeleteDate,
  diary,
}: ChatSidebarProps) {
  const groups = groupByPeriod(dateKeys);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-[#1A1210]/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          w-72 bg-[#2C1810] transform transition-transform duration-200 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold text-[#F5E6DA]">Samantha</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A08868] hover:text-[#F5E6DA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-[#3D2B1F]" />

        {/* Section title + new chat */}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-xs font-semibold text-[#A08868] tracking-wider">对话记录</span>
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="p-1 rounded-lg text-[#A08868] hover:text-[#E8564A] transition-colors"
            title="新对话"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Date list */}
        <div className="flex-1 overflow-y-auto px-3">
          {groups.length === 0 && (
            <p className="text-xs text-[#7A6245] text-center mt-8">还没有记录</p>
          )}
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="px-2 py-1.5">
                <span className="text-[10px] font-medium text-[#7A6245] uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              {group.keys.map((dk) => {
                const dayMsgs = diary[dk] || [];
                const userMsgs = dayMsgs.filter((m) => m.role === "user");
                const firstMsg = userMsgs[0]?.content || "";
                const active = dk === activeDate;
                const isConfirming = confirmDelete === dk;
                return (
                  <div key={dk} className="relative group mb-0.5">
                    <button
                      onClick={() => {
                        if (isConfirming) { setConfirmDelete(null); return; }
                        onSelectDate(dk);
                        onClose();
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                        active
                          ? "bg-[#E8564A]/15"
                          : "hover:bg-[#3D2B1F]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${active ? "text-[#E8564A]" : "text-[#F5E6DA]"}`}>
                          {formatDateLabel(dk)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {userMsgs.length > 0 && !isConfirming && (
                            <span className="text-[10px] text-[#7A6245] bg-[#3D2B1F] px-1.5 py-0.5 rounded-full">
                              {userMsgs.length}
                            </span>
                          )}
                        </div>
                      </div>
                      {firstMsg && !isConfirming && (
                        <p className="text-[11px] text-[#A08868] mt-0.5 truncate">
                          {firstMsg.slice(0, 28)}
                        </p>
                      )}
                    </button>

                    {/* Delete button — appears on hover, hides badge */}
                    {!isConfirming && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(dk); }}
                        className="absolute right-2 top-2 p-1.5 rounded-lg text-[#7A6245] opacity-0 group-hover:opacity-100 hover:text-[#E8564A] hover:bg-[#3D2B1F] transition-all z-10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Confirm delete */}
                    {isConfirming && (
                      <div className="flex items-center gap-2 px-3 py-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDate(dk);
                            setConfirmDelete(null);
                          }}
                          className="text-[11px] text-[#E8564A] hover:text-[#ff6b5e] transition-colors"
                        >
                          删除
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                          className="text-[11px] text-[#7A6245] hover:text-[#A08868] transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
