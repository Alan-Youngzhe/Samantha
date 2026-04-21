"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Camera, X, MapPin, Loader2, Mic, MicOff } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, image?: { data: string; mediaType: string; preview: string }) => void;
  disabled?: boolean;
  locationName?: string | null;
  onRequestLocation?: () => void;
  locationLoading?: boolean;
}

export default function ChatInput({ onSend, disabled, locationName, onRequestLocation, locationLoading }: ChatInputProps) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<{
    data: string;
    mediaType: string;
    preview: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      setSpeechSupported(true);
      const recognition = new SR();
      recognition.lang = "zh-CN";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (e) => {
        let transcript = "";
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        setText(transcript);
      };
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }

    // Share Target: 读取从系统分享过来的数据
    const sharedText = sessionStorage.getItem("bz-shared-text");
    const sharedImage = sessionStorage.getItem("bz-shared-image");
    if (sharedText) {
      setText(sharedText);
      sessionStorage.removeItem("bz-shared-text");
    }
    if (sharedImage) {
      const mediaType = sharedImage.match(/data:(.*?);/)?.[1] || "image/png";
      const base64 = sharedImage.split(",")[1] || "";
      setImage({ data: base64, mediaType, preview: sharedImage });
      sessionStorage.removeItem("bz-shared-image");
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

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
    <div className="border-t border-neutral-800 bg-black p-3 safe-bottom">
      {/* Location tag */}
      {locationName && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-accent">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{locationName}</span>
        </div>
      )}

      {/* Image preview */}
      {image && (
        <div className="mb-2 relative inline-block">
          <img
            src={image.preview}
            alt="待发送"
            className="h-20 rounded-xl border border-neutral-800"
          />
          <button
            onClick={() => setImage(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        {/* Tool buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-300 active:bg-neutral-800 transition-colors disabled:opacity-30"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button
            onClick={onRequestLocation}
            disabled={disabled || locationLoading}
            className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
              locationName ? "text-accent" : "text-neutral-500 hover:text-neutral-300 active:bg-neutral-800"
            }`}
            title={locationName || "获取位置"}
          >
            {locationLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
          </button>
          {speechSupported && (
            <button
              onClick={toggleRecording}
              disabled={disabled}
              className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
                isRecording
                  ? "text-red-400 bg-red-500/10"
                  : "text-neutral-500 hover:text-neutral-300 active:bg-neutral-800"
              }`}
              title={isRecording ? "停止录音" : "语音输入"}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
        </div>

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
            placeholder="今天花了什么钱？"
            rows={1}
            className="w-full resize-none rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 disabled:opacity-30 transition-colors"
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !image)}
          className="p-2.5 rounded-xl bg-accent text-black font-medium hover:bg-accent/90 transition-colors disabled:opacity-30"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
