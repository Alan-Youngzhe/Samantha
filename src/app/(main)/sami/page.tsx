"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatSidebar from "@/components/ChatSidebar";
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
import { getLocationInfo, reverseGeocode, type LocationInfo } from "@/lib/location";
import { checkProactiveTrigger } from "@/lib/proactive";
import { registerSW, requestNotificationPermission, scheduleSamNotifications } from "@/lib/notifications";

type AgentExecutionMode = "tool_use" | "fallback";

type AgentTraceEvent = {
  type: "status" | "tool_use" | "tool_result" | "mode";
  message: string;
  toolName?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
};

type AgentMeta = {
  mode: AgentExecutionMode;
  toolCalls: number;
  traces: AgentTraceEvent[];
};

type ChatApiResponse = {
  text: string;
  commitment: string | null;
  commitmentFulfilled: string | null;
  commitmentBroken: string | null;
  pattern: { category: string; description: string } | null;
  userTrait: { category: string; description: string } | null;
  spending: { amount: number; category: string; motive: string } | null;
  triggerChain: { trigger: string; behavior: string } | null;
  review: { storeName: string; productName: string; price: number; sentiment: string; motiveConfidence: string; comment: string } | null;
  verify: { storeName: string; productName: string; newSentiment: string } | null;
  agent?: AgentMeta;
  error?: string;
};

interface Message {
  id: string;
  role: "user" | "assistant" | "proactive";
  content: string;
  image?: string;
  timestamp: string;
  agent?: AgentMeta;
}

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

function getOpeningCopy(profile: UserProfile | null): { welcome: string; hint: string; suggestions: string[] } {
  const hour = new Date().getHours();
  const name = profile?.name ? `${profile.name}，` : "";
  const isFirstTime = (profile?.stats.totalInteractions || 0) === 0;

  if (hour < 6) {
    return {
      welcome: isFirstTime
        ? `这么晚还醒着呀。\n如果今天有点乱，我们就慢慢说。`
        : `${name}这么晚还没睡呀。\n先靠近我一点，再告诉我今天发生了什么。`,
      hint: "你可以先从一句很轻的话开始，比如“我今天有点累”。",
      suggestions: ["我今天有点累", "想找个能缓一下的地方", "附近有什么不容易踩雷的？"],
    };
  }

  if (hour < 12) {
    return {
      welcome: isFirstTime
        ? `早呀，终于见到你了。\n今天想从心情开始，还是从早餐开始？`
        : `${name}早呀。\n今天醒来之后，你最先想到的是什么？`,
      hint: "如果你还没完全清醒，我们可以先聊今天想吃什么。",
      suggestions: ["今天早上吃什么好？", "附近有什么咖啡店？", "我今天状态一般"],
    };
  }

  if (hour < 18) {
    return {
      welcome: isFirstTime
        ? `嗨，见到你了。\n今天过得怎么样？有没有什么想让我陪你一起消化一下？`
        : `${name}下午好。\n今天到现在为止，最让你有感觉的一件小事是什么？`,
      hint: "想吃什么、心情怎么样、或者只是随便跟我说一句，也都可以。",
      suggestions: ["附近有什么好吃的吗？", "我刚刚有点烦", "推荐一家咖啡店"],
    };
  }

  return {
    welcome: isFirstTime
      ? `晚上好呀。\n今天已经走到这里了，想不想把这一天轻轻放下来？`
      : `${name}晚上好呀。\n今天辛苦了，先让我听听你现在最想说的那一句。`,
    hint: "不想组织语言也没关系，你丢给我一句碎碎念就好。",
    suggestions: ["今天有点想吃点好的", "我想找个不吵的地方", "今天花了点不该花的钱"],
  };
}

function getFriendlyErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error || "");

  if (text.includes("INVALID_MODEL_ID") || text.includes("Invalid model")) {
    return "我刚刚想开口的时候，发现模型通道没对上。不是你说错了，是我这边的连接出了点小问题。等我换好路，再试一次好吗？";
  }

  if (text.includes("暂无可用资源") || text.includes("internal_error") || text.includes("稍后重试")) {
    return "我刚刚去找答案的时候，那边有点拥挤。不是你这句有问题，是我暂时没挤进去。过一会儿再叫我一次，我应该就能接住你了。";
  }

  if (text.includes("Failed to fetch") || text.toLowerCase().includes("network") || text.includes("网络")) {
    return "我刚刚像是断了一下线。你先别急，再发一次给我，我大概率就能接上。";
  }

  if (text.includes("Empty chat response")) {
    return "我刚刚有点走神，话到嘴边却没发出来。你再戳我一下，我这次认真接住。";
  }

  return "抱歉，我刚刚没有顺利接住这句话。你再试一次，我在。";
}

type Diary = Record<string, Message[]>;

function loadDiary(): Diary {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem("bz-diary");
  if (raw) {
    try { return JSON.parse(raw); } catch { /* ignore */ }
  }
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

export default function SamiPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [diary, setDiary] = useState<Diary>({});
  const [mounted, setMounted] = useState(false);
  const [activeDate, setActiveDate] = useState<string>(todayKey());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [cityInput, setCityInput] = useState("上海");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [agentProgress, setAgentProgress] = useState<AgentTraceEvent[]>([]);

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

  const dateKeys = Object.keys(diary).sort((a, b) => b.localeCompare(a));

  // One-time cleanup: purge stale Nick-era cached messages
  useEffect(() => {
    const purged = localStorage.getItem("_nick_purged");
    if (!purged) {
      localStorage.removeItem("bz-diary");
      localStorage.removeItem("bz-proactive-last");
      localStorage.setItem("_nick_purged", "1");
    }
  }, []);

  useEffect(() => {
    setDiary(loadDiary());
    setMounted(true);
    const p = getProfile();
    if (p) {
      setProfile(p);
    } else {
      setShowOnboard(true);
    }

    registerSW().then(() => {
      requestNotificationPermission().then((granted) => {
        if (granted) scheduleSamNotifications();
      });
    });

    const params = new URLSearchParams(window.location.search);
    const sharedText = params.get("shared_text");
    const sharedImage = params.get("shared_image");
    if (sharedText || sharedImage) {
      window.history.replaceState({}, "", "/sami");
      if (sharedText) sessionStorage.setItem("bz-shared-text", sharedText);
      if (sharedImage) sessionStorage.setItem("bz-shared-image", sharedImage);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeDate, agentProgress, isLoading]);

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

  // Handle prefill from explore page (drag-to-Samantha / long-press)
  const prefillHandled = useRef(false);
  useEffect(() => {
    if (!profile || !mounted || prefillHandled.current) return;
    const bootstrapPrefill = async () => {
      const prefill = sessionStorage.getItem("samantha_prefill");
      const prefillLocation = sessionStorage.getItem("samantha_prefill_location");
      let locationOverride: LocationInfo | null = null;

      if (prefillLocation) {
        sessionStorage.removeItem("samantha_prefill_location");
        try {
          const parsed = JSON.parse(prefillLocation) as { lng?: number; lat?: number };
          if (typeof parsed.lng === "number" && typeof parsed.lat === "number") {
            const name = await reverseGeocode(parsed.lat, parsed.lng);
            locationOverride = {
              lng: parsed.lng,
              lat: parsed.lat,
              name,
            };
            setLocationInfo(locationOverride);
          }
        } catch {
        }
      }

      if (prefill) {
        sessionStorage.removeItem("samantha_prefill");
        prefillHandled.current = true;
        setTimeout(() => handleSend(prefill, undefined, locationOverride), 300);
      }
    };

    void bootstrapPrefill();
  }, [profile, mounted]);

  useEffect(() => {
    if (profile && messages.length === 0 && activeDate === todayKey()) {
      const welcomeText = getOpeningCopy(profile).welcome;

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
    const p = createProfile(nameInput.trim(), "other");
    // Store city preference in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("sanxing_city", cityInput);
    }
    setProfile(p);
    setShowOnboard(false);
  };

  const handleSend = async (
    text: string,
    image?: { data: string; mediaType: string; preview: string },
    locationOverride?: LocationInfo | null
  ) => {
    if (!profile) return;
    const effectiveLocation = locationOverride ?? locationInfo;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      image: image?.preview,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setAgentProgress([]);

    try {
      const memoryContext = buildMemoryContext(profile);
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          memoryContext,
          image: image ? { data: image.data, mediaType: image.mediaType } : null,
          history,
          location: effectiveLocation?.name || null,
          lat: effectiveLocation?.lat ?? null,
          lng: effectiveLocation?.lng ?? null,
          trustContext: profile ? {
            totalConversations: messages.filter(m => m.role === "user").length,
            totalSpendings: profile.spendings?.length || 0,
            totalPatterns: profile.patterns?.length || 0,
            totalCommitments: profile.commitments?.length || 0,
            triggerChainCount: profile.triggerChains?.length || 0,
            accountAgeDays: Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86400000),
            hasMatchingSpending: (profile.spendings?.length || 0) > 0,
            hasLocationMatch: !!(effectiveLocation?.lat && effectiveLocation?.lng),
          } : null,
          conversationRound: messages.filter(m => m.role === "user").length,
          stream: true,
        }),
      });

      let data: ChatApiResponse | null = null;

      if (res.body && res.headers.get("content-type")?.includes("application/x-ndjson")) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const processLine = (line: string) => {
          if (!line.trim()) return;
          const chunk = JSON.parse(line) as
            | { type: "progress"; event: AgentTraceEvent }
            | { type: "final"; data: ChatApiResponse }
            | { type: "error"; error: string };

          if (chunk.type === "progress") {
            setAgentProgress((prev) => [...prev, chunk.event]);
            return;
          }

          if (chunk.type === "final") {
            data = chunk.data;
            return;
          }

          throw new Error(chunk.error || "Failed to get response");
        };

        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex >= 0) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            processLine(line);
            newlineIndex = buffer.indexOf("\n");
          }

          if (done) break;
        }

        if (buffer.trim()) {
          processLine(buffer);
        }
      } else {
        data = await res.json() as ChatApiResponse;
      }

      if (!data) throw new Error("Empty chat response");
      if (data.error) throw new Error(data.error);

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.text,
        timestamp: new Date().toISOString(),
        agent: data.agent,
      };
      setMessages((prev) => [...prev, aiMsg]);

      let updatedProfile = addMemory(profile, {
        type: image ? "photo" : "text",
        userInput: text,
        aiResponse: data.text,
      });

      if (data.commitment) updatedProfile = addCommitment(updatedProfile, data.commitment);
      if (data.commitmentFulfilled) updatedProfile = updateCommitmentStatus(updatedProfile, data.commitmentFulfilled, "fulfilled");
      if (data.commitmentBroken) updatedProfile = updateCommitmentStatus(updatedProfile, data.commitmentBroken, "broken");
      if (data.pattern) updatedProfile = addPattern(updatedProfile, data.pattern.category, data.pattern.description);
      if (data.userTrait) updatedProfile = addUserTrait(updatedProfile, data.userTrait.category, data.userTrait.description);
      if (data.spending) updatedProfile = addSpending(updatedProfile, data.spending.amount, data.spending.category, data.spending.motive, effectiveLocation?.name, effectiveLocation?.lat, effectiveLocation?.lng);
      if (data.triggerChain) updatedProfile = addTriggerChain(updatedProfile, data.triggerChain.trigger, data.triggerChain.behavior);

      setProfile(updatedProfile);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: getFriendlyErrorMessage(err),
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setAgentProgress([]);
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  // Onboarding
  if (showOnboard) {
    const cities = ["上海", "北京", "深圳", "其他"] as const;
    return (
      <div className="flex-1 flex items-center justify-center px-8 h-full">
        <div
          className="max-w-sm w-full"
          onContextMenu={(e) => {
            e.preventDefault();
            const p = loadDemoData();
            setProfile(p);
            setShowOnboard(false);
          }}
        >
          {/* Welcome */}
          <div className="text-center mb-7">
            <h1 className="text-[22px] font-semibold text-foreground mb-2.5">嗨，我是 Samantha</h1>
            <p className="text-xs text-text-secondary">告诉 Samantha 一点关于你的事。</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-[13px] font-medium text-text-warm mb-2 block">
                你想让 Samantha 叫你什么？
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProfile()}
                placeholder="输入一个昵称"
                className="w-full rounded-[10px] bg-white border border-card-border h-11 px-3.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/30 transition-colors"
                autoFocus
              />
            </div>

            {/* City */}
            <div>
              <label className="text-[13px] font-medium text-text-warm mb-2 block">
                你在哪座城市？
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {cities.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCityInput(c)}
                    className={`h-10 rounded-[10px] text-[13px] transition-colors ${
                      cityInput === c
                        ? "bg-card font-semibold text-[#FF8C42] border border-[#F0D0C0]"
                        : "bg-white border border-card-border text-text-secondary hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Start button */}
            <button
              onClick={handleCreateProfile}
              disabled={!nameInput.trim()}
              className="w-full rounded-[10px] bg-accent-dim text-white font-medium h-11 text-sm hover:bg-accent transition-colors disabled:opacity-30"
            >
              开始聊天
            </button>
          </div>

          <p className="text-muted text-[10px] mt-7 text-center leading-relaxed">
            Samantha 对你的生活充满好奇。
            <br />
            她会通过你的消费，感受这座城市。
          </p>
        </div>
      </div>
    );
  }

  const isToday = activeDate === todayKey() || activeDate.startsWith(todayKey() + "_");

  const handleNewChat = () => {
    // Create a new conversation slot — use today's key with a timestamp suffix if today already exists
    const today = todayKey();
    if (!diary[today] || diary[today].length === 0) {
      setActiveDate(today);
    } else {
      // Generate unique key for a new conversation today
      const newKey = `${today}_${Date.now()}`;
      setDiary((prev) => {
        const next = { ...prev, [newKey]: [] };
        saveDiary(next);
        return next;
      });
      setActiveDate(newKey);
    }
  };

  const handleDeleteDate = (dateKey: string) => {
    setDiary((prev) => {
      const next = { ...prev };
      delete next[dateKey];
      saveDiary(next);
      return next;
    });
    // If we deleted the active conversation, switch to today
    if (activeDate === dateKey) {
      setActiveDate(todayKey());
    }
  };

  const openingCopy = getOpeningCopy(profile);
  const suggestions = openingCopy.suggestions;

  const userMsgCount = messages.filter(m => m.role === "user").length;
  const showSuggestions = isToday && userMsgCount === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar */}
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        dateKeys={dateKeys}
        activeDate={activeDate}
        onSelectDate={setActiveDate}
        onNewChat={handleNewChat}
        onDeleteDate={handleDeleteDate}
        diary={diary}
      />

      {/* Chat content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pt-8">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-text-secondary text-lg hover:text-foreground transition-colors"
          >
            ☰
          </button>
        </div>

        {/* Samantha avatar */}
        <div className="w-10 h-10 rounded-[12px] overflow-hidden shadow-sm ring-1 ring-black/5 opacity-90 mb-4">
          <img src="/logo.svg" alt="Samantha" className="w-full h-full object-cover" />
        </div>

        {/* Welcome greeting when empty */}
        {showSuggestions && (
          <p className="text-sm text-text-warm leading-[1.7] mb-4">
            {openingCopy.hint}
          </p>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            image={msg.image}
            timestamp={msg.timestamp}
            userName={profile?.name}
            agent={msg.agent}
          />
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[85%]">
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-background border border-card-border text-sm text-muted min-w-[220px]">
                <div className="flex items-center gap-2 text-foreground mb-2">
                  <span className="cursor-blink">Samantha 在处理这条消息</span>
                </div>
                {agentProgress.length > 0 ? (
                  <div className="space-y-1.5">
                    {agentProgress.slice(-4).map((event, index) => (
                      <div key={`${event.timestamp}-${index}`} className="flex items-start gap-2 text-xs leading-5 text-muted">
                        <span className={`mt-1 inline-block w-1.5 h-1.5 rounded-full ${event.type === "tool_result" ? "bg-success" : event.type === "tool_use" ? "bg-accent" : "bg-warm-gold"}`} />
                        <span>{event.message}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs">我先想想要不要查点额外信息。</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Suggestion bubbles */}
        {showSuggestions && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted mb-2 pl-1">试试问 Samantha</p>
            <div className="flex flex-col gap-2.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-sm text-text-warm bg-white rounded-[20px] border border-card-border px-4 py-2.5 hover:bg-card transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {isToday ? (
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          locationName={locationInfo?.name}
          locationLoading={locationLoading}
          onRequestLocation={async () => {
            if (locationInfo) { setLocationInfo(null); return; }
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
        <div className="px-4 py-3 text-center">
          <button
            onClick={handleNewChat}
            className="text-xs text-muted hover:text-accent transition-colors"
          >
            ← 回到今天继续对话
          </button>
        </div>
      )}
    </div>
  );
}
