"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, FileText, PanelLeftClose, PanelLeft, Plus } from "lucide-react";
import Link from "next/link";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import {
  getProfile,
  createProfile,
  addMemory,
  addCommitment,
  updateCommitmentStatus,
  addPattern,
  addUserTrait,
  addSpending,
  addTriggerChain,
  buildMemoryContext,
  type UserProfile,
} from "@/lib/memory";
import { loadDemoData } from "@/lib/demo-data";
import { checkMirrorTrigger, recordMirrorAppearance, buildMirrorPrompt } from "@/lib/mirror";
import { getLocationInfo, type LocationInfo } from "@/lib/location";
import { checkProactiveTrigger } from "@/lib/proactive";
import { registerSW, requestNotificationPermission, scheduleNickNotifications } from "@/lib/notifications";

interface Message {
  id: string;
  role: "user" | "assistant" | "mirror" | "proactive";
  content: string;
  image?: string;
  timestamp: string;
}

// Date key helper: "2025-04-21"
function toDateKey(ts: string): string {
  return new Date(ts).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");
}

function todayKey(): string {
  return toDateKey(new Date().toISOString());
}

function formatDateLabel(key: string): string {
  const today = todayKey();
  if (key === today) return "今天";
  const d = new Date(key);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === toDateKey(yesterday.toISOString())) return "昨天";
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" });
}

// Diary storage: { "2025-04-21": Message[] }
type Diary = Record<string, Message[]>;

function loadDiary(): Diary {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem("bz-diary");
  if (raw) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
  // Migrate old bz-messages format
  const old = localStorage.getItem("bz-messages");
  if (old) {
    try {
      const msgs: Message[] = JSON.parse(old);
      const diary: Diary = {};
      for (const m of msgs) {
        const dk = toDateKey(m.timestamp);
        if (!diary[dk]) diary[dk] = [];
        diary[dk].push(m);
      }
      localStorage.setItem("bz-diary", JSON.stringify(diary));
      localStorage.removeItem("bz-messages");
      return diary;
    } catch { /* ignore */ }
  }
  return {};
}

function saveDiary(diary: Diary): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("bz-diary", JSON.stringify(diary));
}

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [diary, setDiary] = useState<Diary>({});
  const [mounted, setMounted] = useState(false);
  const [activeDate, setActiveDate] = useState<string>(todayKey());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [genderInput, setGenderInput] = useState<"male" | "female" | "other">("male");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const messages = diary[activeDate] || [];
  const setMessages = useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    setDiary((prev) => {
      const current = prev[activeDate] || [];
      const next = typeof updater === "function" ? updater(current) : updater;
      const newDiary = { ...prev, [activeDate]: next };
      saveDiary(newDiary);
      return newDiary;
    });
  }, [activeDate]);

  // Sorted date keys (newest first)
  const dateKeys = Object.keys(diary).sort((a, b) => b.localeCompare(a));

  // Load profile + diary on mount (client only, avoids hydration mismatch)
  useEffect(() => {
    setDiary(loadDiary());
    setMounted(true);
    const p = getProfile();
    if (p) {
      setProfile(p);
    } else {
      setShowOnboard(true);
    }

    // PWA: register service worker + push notifications
    registerSW().then(() => {
      requestNotificationPermission().then((granted) => {
        if (granted) scheduleNickNotifications();
      });
    });

    // Share Target: 检查 URL 参数中是否有从系统分享过来的数据
    const params = new URLSearchParams(window.location.search);
    const sharedText = params.get("shared_text");
    const sharedImage = params.get("shared_image");
    if (sharedText || sharedImage) {
      // 清理 URL，避免刷新重复触发
      window.history.replaceState({}, "", "/");
      // 存到 sessionStorage，等 ChatInput 组件读取
      if (sharedText) sessionStorage.setItem("bz-shared-text", sharedText);
      if (sharedImage) sessionStorage.setItem("bz-shared-image", sharedImage);
    }
  }, []);

  // Auto-scroll on messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeDate]);

  // Proactive trigger on mount
  useEffect(() => {
    if (profile && profile.stats.totalInteractions >= 3 && activeDate === todayKey()) {
      const result = checkProactiveTrigger(profile);
      if (result.shouldTrigger && result.message) {
        const proactiveMsg: Message = {
          id: "proactive-" + Date.now(),
          role: "proactive",
          content: result.message,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => {
          if (prev.some((m) => m.role === "proactive")) return prev;
          return [...prev, proactiveMsg];
        });
      }
    }
  }, [profile]);

  // Welcome message for today if empty
  useEffect(() => {
    if (profile && messages.length === 0 && activeDate === todayKey()) {
      const isNew = profile.stats.totalInteractions === 0;
      const pronoun = profile.gender === "female" ? "她" : "他";
      const welcomeText = isNew
        ? `${profile.name}。好，记住了。\n\n所以——今天花钱了没？随便说说就行，或者拍张小票也行。`
        : `哦，${profile.name}。\n\n${pronoun}又来了。今天怎么了？`;

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: welcomeText,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [profile, activeDate]);

  const handleCreateProfile = () => {
    if (!nameInput.trim()) return;
    const p = createProfile(nameInput.trim(), genderInput);
    setProfile(p);
    setShowOnboard(false);
  };

  const handleSend = async (
    text: string,
    image?: { data: string; mediaType: string; preview: string }
  ) => {
    if (!profile) return;

    // Add user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      image: image?.preview,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const memoryContext = buildMemoryContext(profile);

      // Build conversation history for multi-turn context
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          memoryContext,
          image: image ? { data: image.data, mediaType: image.mediaType } : null,
          history,
          location: locationInfo?.name || null,
          lat: locationInfo?.lat ?? null,
          lng: locationInfo?.lng ?? null,
          trustContext: profile ? {
            totalConversations: messages.filter(m => m.role === "user").length,
            totalSpendings: profile.spendings?.length || 0,
            totalPatterns: profile.patterns?.length || 0,
            totalCommitments: profile.commitments?.length || 0,
            triggerChainCount: profile.triggerChains?.length || 0,
            accountAgeDays: Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86400000),
            hasMatchingSpending: (profile.spendings?.length || 0) > 0,
            hasLocationMatch: !!(locationInfo?.lat && locationInfo?.lng),
          } : null,
          conversationRound: messages.filter(m => m.role === "user").length,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Add AI message
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Save to memory
      let updatedProfile = addMemory(profile, {
        type: image ? "photo" : "text",
        userInput: text,
        aiResponse: data.text,
      });

      // Save commitment if detected
      if (data.commitment) {
        updatedProfile = addCommitment(updatedProfile, data.commitment);
      }

      // Update commitment status
      if (data.commitmentFulfilled) {
        updatedProfile = updateCommitmentStatus(updatedProfile, data.commitmentFulfilled, "fulfilled");
      }
      if (data.commitmentBroken) {
        updatedProfile = updateCommitmentStatus(updatedProfile, data.commitmentBroken, "broken");
      }

      // Save behavior pattern
      if (data.pattern) {
        updatedProfile = addPattern(updatedProfile, data.pattern.category, data.pattern.description);
      }

      // Save user trait for soul_user profile
      if (data.userTrait) {
        updatedProfile = addUserTrait(updatedProfile, data.userTrait.category, data.userTrait.description);
      }

      // Save spending record + anonymously report to heatmap
      if (data.spending) {
        updatedProfile = addSpending(updatedProfile, data.spending.amount, data.spending.category, data.spending.motive, locationInfo?.name, locationInfo?.lat, locationInfo?.lng);
        if (locationInfo?.lat != null && locationInfo?.lng != null) {
          fetch("/api/heatmap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: locationInfo.lat,
              lng: locationInfo.lng,
              category: data.spending.category,
              motive: data.spending.motive,
              amount: data.spending.amount,
              location: locationInfo.name,
            }),
          }).catch(() => {});
        }
      }

      // Save trigger chain
      if (data.triggerChain) {
        updatedProfile = addTriggerChain(updatedProfile, data.triggerChain.trigger, data.triggerChain.behavior);
      }

      setProfile(updatedProfile);

      // Check mirror trigger (five gates)
      const mirrorCheck = checkMirrorTrigger(
        updatedProfile,
        messages.length + 2, // current message count after adding user + assistant
        data.userTrait
      );
      if (mirrorCheck.shouldTrigger) {
        recordMirrorAppearance(messages.length + 2);
        try {
          const mirrorRes = await fetch("/api/mirror", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mirrorPrompt: buildMirrorPrompt(updatedProfile),
              nickMessage: data.text,
              userMessage: text,
            }),
          });
          if (mirrorRes.ok) {
            const mirrorData = await mirrorRes.json();
            if (mirrorData.text) {
              const mirrorMsg: Message = {
                id: crypto.randomUUID(),
                role: "mirror",
                content: mirrorData.text,
                timestamp: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, mirrorMsg]);
            }
          }
        } catch {
          // Mirror failure is silent — it's a bonus feature
        }
      }
    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "……连网络都装不稳。（API 调用失败）",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Onboarding screen
  if (showOnboard) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div
            className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-6 cursor-pointer select-none"
            onContextMenu={(e) => {
              e.preventDefault();
              const p = loadDemoData();
              setProfile(p);
              setShowOnboard(false);
            }}
          >
            <Eye className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-2 tracking-tight">别装</h1>
          <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
            你的钱包比你说的诚实。
            <br />
            <span className="text-neutral-600">
              一个看穿你每一笔消费真相的 AI
            </span>
          </p>

          <div className="space-y-3">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProfile()}
              placeholder="你叫什么名字？"
              className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-center text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
              autoFocus
            />
            <div className="flex gap-2 justify-center">
              {(["male", "female", "other"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGenderInput(g)}
                  className={`px-4 py-2 rounded-lg text-xs transition-colors ${
                    genderInput === g
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {g === "male" ? "他" : g === "female" ? "她" : "其他"}
                </button>
              ))}
            </div>
            <button
              onClick={handleCreateProfile}
              disabled={!nameInput.trim()}
              className="w-full rounded-xl bg-accent text-black font-semibold py-3 text-sm hover:bg-amber-400 transition-colors disabled:opacity-30"
            >
              开始被看穿
            </button>
          </div>

          <p className="text-neutral-600 text-xs mt-6 leading-relaxed">
            别装不会讨好你。它用第三人称视角
            <br />
            看穿你每一笔消费背后的真实动机。
          </p>
        </div>
      </div>
    );
  }

  const isToday = activeDate === todayKey();

  const handleNewDay = () => {
    setActiveDate(todayKey());
    setSidebarOpen(false);
  };

  // Main chat screen
  return (
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          w-64 lg:w-56
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"}
          bg-black border-r border-neutral-800
        `}
      >
        <div className="w-64 lg:w-56 h-full flex flex-col">
          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">对话记录</span>
            <button
              onClick={handleNewDay}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-accent transition-colors"
              title="今天"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Date list */}
          <div className="flex-1 overflow-y-auto py-1">
            {dateKeys.length === 0 && (
              <p className="text-xs text-neutral-700 text-center mt-8">还没有记录</p>
            )}
            {dateKeys.map((dk) => {
              const dayMsgs = diary[dk] || [];
              const msgCount = dayMsgs.filter((m) => m.role === "user").length;
              const preview = dayMsgs.find((m) => m.role === "user")?.content || "";
              return (
                <button
                  key={dk}
                  onClick={() => { setActiveDate(dk); setSidebarOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 transition-colors ${
                    dk === activeDate
                      ? "bg-neutral-900 border-r-2 border-accent"
                      : "hover:bg-neutral-900/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${dk === activeDate ? "text-accent" : "text-neutral-300"}`}>
                      {formatDateLabel(dk)}
                    </span>
                    {msgCount > 0 && (
                      <span className="text-[10px] text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded-full">
                        {msgCount}
                      </span>
                    )}
                  </div>
                  {preview && (
                    <p className="text-[11px] text-neutral-600 mt-0.5 truncate">
                      {preview.slice(0, 24)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar footer */}
          <div className="px-3 py-2.5 border-t border-neutral-800 space-y-0.5">
            <Link
              href="/report"
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-neutral-400 hover:text-accent hover:bg-neutral-900 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Nick 的笔记
            </Link>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900 transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight">别装</h1>
              <p className="text-[11px] text-neutral-500 truncate">
                {isToday ? `和 ${profile?.name} 聊聊` : formatDateLabel(activeDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-[11px] text-neutral-600">
              {profile?.stats.totalInteractions || 0} 次对话
            </span>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
          {/* Date divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-neutral-800" />
            <span className="text-[10px] text-neutral-600 font-medium">{formatDateLabel(activeDate)}</span>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              image={msg.image}
              timestamp={msg.timestamp}
              userName={profile?.name}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[85%]">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-[10px] text-accent font-bold">N</span>
                  </div>
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-neutral-900/50 border border-neutral-800 text-sm text-neutral-500">
                  <span className="cursor-blink">正在审视</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input — only enabled for today */}
        {isToday ? (
          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
            locationName={locationInfo?.name}
            locationLoading={locationLoading}
            onRequestLocation={async () => {
              if (locationInfo) {
                setLocationInfo(null);
                return;
              }
              setLocationLoading(true);
              try {
                const info = await getLocationInfo();
                setLocationInfo(info);
              } finally {
                setLocationLoading(false);
              }
            }}
          />
        ) : (
          <div className="px-4 py-3 border-t border-neutral-800 text-center">
            <button
              onClick={handleNewDay}
              className="text-xs text-neutral-500 hover:text-accent transition-colors"
            >
              ← 回到今天继续对话
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
