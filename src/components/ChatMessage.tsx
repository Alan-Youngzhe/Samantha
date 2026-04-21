"use client";

import { AlertTriangle } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant" | "mirror" | "proactive";
  content: string;
  image?: string; // base64 data URL
  timestamp?: string;
  userName?: string;
}

export default function ChatMessage({
  role,
  content,
  image,
  timestamp,
  userName,
}: ChatMessageProps) {
  const isUser = role === "user";
  const isMirror = role === "mirror";
  const isProactive = role === "proactive";
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
            <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-red-400" />
            </div>
            <span className="text-[11px] text-red-400 font-medium">主动预警</span>
            <span className="text-[11px] text-neutral-500">{time}</span>
          </div>
          <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed bg-red-500/5 border border-red-500/10 text-neutral-300">
            {content}
          </div>
        </div>
      </div>
    );
  }

  if (isMirror) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[88%] sm:max-w-[80%]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-purple-500/10 flex items-center justify-center">
              <span className="text-[10px] text-purple-400 font-bold">?</span>
            </div>
            <span className="text-[11px] text-purple-400/70 italic">
              {userName ? `${userName}的内心` : "内心独白"}
            </span>
            <span className="text-[11px] text-neutral-500">{time}</span>
          </div>
          <div className="mirror-serif rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-7 text-neutral-400 bg-[var(--mirror-bg)] border border-[var(--mirror-border)]">
            {content}
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
          {!isUser && (
            <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-[10px] text-accent font-bold">N</span>
            </div>
          )}
          <span className="text-[11px] text-neutral-500">{time}</span>
        </div>

        {/* Image if present */}
        {image && (
          <div className="mb-2 rounded-xl overflow-hidden border border-neutral-800">
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
              ? "bg-neutral-900 text-neutral-200 rounded-tr-sm"
              : "bg-neutral-900/50 border border-neutral-800 text-neutral-300 rounded-tl-sm"
          }`}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
