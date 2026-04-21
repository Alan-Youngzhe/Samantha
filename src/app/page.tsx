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
  buildMemoryContext,
  type UserProfile,
} from "@/lib/memory";
import { loadDemoData } from "@/lib/demo-data";
import { checkMirrorTrigger, recordMirrorAppearance, buildMirrorPrompt } from "@/lib/mirror";

interface Message {
  id: string;
  role: "user" | "assistant" | "mirror";
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
  const [diary, setDiary] = useState<Diary>(loadDiary);
  const [activeDate, setActiveDate] = useState<string>(todayKey());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [genderInput, setGenderInput] = useState<"male" | "female" | "other">("male");
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Load profile on mount
  useEffect(() => {
    const p = getProfile();
    if (p) {
      setProfile(p);
    } else {
      setShowOnboard(true);
    }
  }, []);

  // Auto-scroll on messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeDate]);

  // Welcome message for today if empty
  useEffect(() => {
    if (profile && messages.length === 0 && activeDate === todayKey()) {
      const isNew = profile.stats.totalInteractions === 0;
      const pronoun = profile.gender === "female" ? "她" : "他";
      const welcomeText = isNew
        ? `又一个想要"改变自己"的人来了。${pronoun}叫${profile.name}，凌晨注册了一个叫"别装"的 App。大概率不是因为自律，是因为又一个失眠的夜晚需要找点事做。让我们看看${pronoun}能装多久。\n\n说吧，今天干了什么？或者拍张照。我看看你不敢发朋友圈的那些。`
        : `${pronoun}回来了。${profile.name}。距离上次对话已经过了一段时间。让我们看看这段时间${pronoun}有没有兑现之前的承诺——还是照旧在装。\n\n说吧。`;

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
            className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6 cursor-pointer select-none"
            onContextMenu={(e) => {
              e.preventDefault();
              const p = loadDemoData();
              setProfile(p);
              setShowOnboard(false);
            }}
          >
            <Eye className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-2">别装</h1>
          <p className="text-muted text-sm mb-8">
            别装了。我都看见了。
            <br />
            <span className="text-muted/60">
              一个见过你所有狼狈的 AI
            </span>
          </p>

          <div className="space-y-3">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateProfile()}
              placeholder="你叫什么名字？"
              className="w-full rounded-xl bg-card border border-card-border px-4 py-3 text-sm text-center text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50"
              autoFocus
            />
            <div className="flex gap-2 justify-center">
              {(["male", "female", "other"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGenderInput(g)}
                  className={`px-4 py-2 rounded-lg text-xs transition-colors ${
                    genderInput === g
                      ? "bg-accent/20 text-accent border border-accent/50"
                      : "bg-card border border-card-border text-muted hover:text-foreground"
                  }`}
                >
                  {g === "male" ? "他" : g === "female" ? "她" : "其他"}
                </button>
              ))}
            </div>
            <button
              onClick={handleCreateProfile}
              disabled={!nameInput.trim()}
              className="w-full rounded-xl bg-accent text-black font-medium py-3 text-sm hover:bg-accent/80 transition-colors disabled:opacity-40"
            >
              开始被审视
            </button>
          </div>

          <p className="text-muted/40 text-xs mt-6">
            警告：别装不会讨好你。它用第三人称视角
            <br />
            看穿你所有的伪装。
          </p>
        </div>
      </div>
    );
  }

  const isToday = activeDate === todayKey();

  const handleNewDay = () => {
    setActiveDate(todayKey());
  };

  // Main chat screen
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-56" : "w-0"
        } transition-all duration-200 flex-shrink-0 border-r border-card-border bg-card/50 overflow-hidden`}
      >
        <div className="w-56 h-full flex flex-col">
          {/* Sidebar header */}
          <div className="px-3 py-3 border-b border-card-border flex items-center justify-between">
            <span className="text-xs font-semibold text-muted tracking-wider uppercase">对话日记</span>
            <button
              onClick={handleNewDay}
              className="p-1 rounded hover:bg-accent/10 text-muted hover:text-accent transition-colors"
              title="今天"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Date list */}
          <div className="flex-1 overflow-y-auto py-1">
            {dateKeys.length === 0 && (
              <p className="text-xs text-muted/40 text-center mt-8">还没有记录</p>
            )}
            {dateKeys.map((dk) => {
              const dayMsgs = diary[dk] || [];
              const msgCount = dayMsgs.filter((m) => m.role === "user").length;
              const preview = dayMsgs.find((m) => m.role === "user")?.content || "";
              return (
                <button
                  key={dk}
                  onClick={() => setActiveDate(dk)}
                  className={`w-full text-left px-3 py-2.5 transition-colors ${
                    dk === activeDate
                      ? "bg-accent/10 border-r-2 border-accent"
                      : "hover:bg-card-border/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${dk === activeDate ? "text-accent" : "text-foreground/80"}`}>
                      {formatDateLabel(dk)}
                    </span>
                    {msgCount > 0 && (
                      <span className="text-[10px] text-muted bg-card-border/50 px-1.5 rounded-full">
                        {msgCount}
                      </span>
                    )}
                  </div>
                  {preview && (
                    <p className="text-[11px] text-muted/60 mt-0.5 truncate">
                      {preview.slice(0, 20)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar footer */}
          <div className="px-3 py-2 border-t border-card-border">
            <Link
              href="/report"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted hover:text-accent hover:bg-accent/10 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              镜我
            </Link>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-card-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-card transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Eye className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">别装</h1>
              <p className="text-xs text-muted">
                {isToday ? `正在观察 ${profile?.name}` : formatDateLabel(activeDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              交互 {profile?.stats.totalInteractions || 0} 次
            </span>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {/* Date divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-card-border" />
            <span className="text-[10px] text-muted/40 font-medium">{formatDateLabel(activeDate)}</span>
            <div className="flex-1 h-px bg-card-border" />
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
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-xs text-accent font-bold">N</span>
                  </div>
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-card border border-card-border text-sm text-muted">
                  <span className="cursor-blink">正在审视</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input — only enabled for today */}
        {isToday ? (
          <ChatInput onSend={handleSend} disabled={isLoading} />
        ) : (
          <div className="px-4 py-3 border-t border-card-border text-center">
            <button
              onClick={handleNewDay}
              className="text-xs text-muted hover:text-accent transition-colors"
            >
              ← 回到今天继续对话
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
