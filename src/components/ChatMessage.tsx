"use client";

import { Camera } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant" | "mirror";
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
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (isMirror) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[85%]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <span className="text-xs text-purple-400 font-bold">?</span>
            </div>
            <span className="text-xs text-purple-400/60 italic">
              {userName ? `${userName}的内心` : "内心独白"}
            </span>
            <span className="text-xs text-muted">{time}</span>
          </div>
          <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed italic bg-purple-500/5 border border-purple-500/15 text-purple-200/80 rounded-tl-sm">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] ${
          isUser ? "order-2" : "order-1"
        }`}
      >
        {/* Avatar + Name */}
        <div
          className={`flex items-center gap-2 mb-1 ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          {!isUser && (
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-xs text-accent font-bold">N</span>
            </div>
          )}
          <span className="text-xs text-muted">{time}</span>
        </div>

        {/* Image if present */}
        {image && (
          <div className="mb-2 rounded-lg overflow-hidden border border-card-border">
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
              ? "bg-accent/15 text-foreground rounded-tr-sm"
              : "bg-card border border-card-border text-foreground/90 rounded-tl-sm"
          }`}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
