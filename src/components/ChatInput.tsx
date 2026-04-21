"use client";

import { useState, useRef } from "react";
import { Send, Camera, X, ImageIcon } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, image?: { data: string; mediaType: string; preview: string }) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<{
    data: string;
    mediaType: string;
    preview: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<{ data: string; mediaType: string; preview: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const [header, data] = dataUrl.split(",");
        const mediaType = header.match(/data:(.*);/)?.[1] || "image/jpeg";
        resolve({ data, mediaType, preview: dataUrl });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setImage(compressed);
    // Reset so the same file can be selected again
    e.target.value = "";
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !image) return;

    onSend(trimmed || "（发送了一张照片）", image || undefined);
    setText("");
    setImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-card-border bg-background p-3">
      {/* Image preview */}
      {image && (
        <div className="mb-2 relative inline-block">
          <img
            src={image.preview}
            alt="待发送"
            className="h-20 rounded-lg border border-card-border"
          />
          <button
            onClick={() => setImage(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-danger rounded-full flex items-center justify-center"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Camera button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2.5 rounded-xl bg-card border border-card-border text-muted hover:text-accent hover:border-accent/50 transition-colors disabled:opacity-40"
        >
          <Camera className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="说点什么，或者拍张照..."
            rows={1}
            className="w-full resize-none rounded-xl bg-card border border-card-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 disabled:opacity-40"
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !image)}
          className="p-2.5 rounded-xl bg-accent text-black hover:bg-accent/80 transition-colors disabled:opacity-40 disabled:hover:bg-accent"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
