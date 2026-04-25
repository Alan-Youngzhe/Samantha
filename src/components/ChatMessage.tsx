"use client";

import { AlertTriangle } from "lucide-react";

type AgentMeta = {
  mode: "tool_use" | "fallback";
  toolCalls: number;
};

interface ChatMessageProps {
  role: "user" | "assistant" | "proactive";
  content: string;
  image?: string; // base64 data URL
  timestamp?: string;
  userName?: string;
  agent?: AgentMeta;
}

 function sanitizeVisibleContent(text: string): string {
   return text
     .replace(/\s*\[[A-Z][A-Z0-9_]{2,}\]/g, "")
     .replace(/[ \t]+([，。！？；：,.!?;:])/g, "$1")
     .replace(/\n{3,}/g, "\n\n")
     .trim();
 }

export default function ChatMessage({
  role,
  content,
  image,
  timestamp,
  userName,
  agent,
}: ChatMessageProps) {
  const isUser = role === "user";
  const isProactive = role === "proactive";
  const displayContent = isUser ? content : sanitizeVisibleContent(content);
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (isProactive) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[88%] sm:max-w-[80%]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-accent" />
            </div>
            <span className="text-[11px] text-accent font-medium">Samantha 提醒</span>
            <span className="text-[11px] text-muted">{time}</span>
          </div>
          <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed bg-accent/5 border border-accent/10 text-foreground">
            {displayContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[88%] sm:max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
        {/* Avatar + Time */}
        <div className={`flex items-center gap-2 mb-1.5 ${isUser ? "justify-end" : "justify-start"}`}>
          <span className="text-[11px] text-muted">{time}</span>
        </div>

        {/* Image if present */}
        {image && (
          <div className="mb-2 rounded-xl overflow-hidden border border-card-border">
            <img
              src={image}
              alt="用户分享的照片"
              className="max-w-full max-h-64 object-cover"
            />
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-card text-foreground rounded-tr-sm"
              : "bg-background border border-card-border text-foreground rounded-tl-sm"
          }`}
        >
          {displayContent}
        </div>
        {!isUser && agent && (
          <div className="mt-1.5 px-1 text-[11px] text-muted">
            {agent.mode === "tool_use" ? "已执行工具调用" : "已切换后端编排"}
            {agent.toolCalls > 0 ? ` · ${agent.toolCalls} 次` : ""}
          </div>
        )}
      </div>
    </div>
  );
}
