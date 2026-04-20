"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Sparkles, SendHorizontal, Zap, TrendingUp, BedDouble, UtensilsCrossed, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface GeminiTurn {
  role: string;
  parts: Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }>;
}

interface Props {
  token: string;
  staffRole: string;
}

async function sendMessage(
  token: string,
  history: GeminiTurn[],
  userMessage: string,
  onStatus: (msg: string) => void
): Promise<{ text: string; toolsUsed: string[] }> {
  onStatus("Thinking…");
  const res = await fetch("/api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, history, userMessage }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Server error ${res.status}`);
  }
  const data = await res.json() as { text?: string; error?: string; toolsUsed?: string[] };
  if (data.error) throw new Error(data.error);
  return { text: data.text ?? "No response.", toolsUsed: data.toolsUsed ?? [] };
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-[13px] font-bold text-violet-900 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[14px] font-black text-violet-900 mt-4 mb-1.5">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-[15px] font-black text-indigo-900 mt-4 mb-2">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold text-violet-700 italic">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-black text-gray-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-gray-500">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide border border-violet-100">$1</code>')
    .replace(/^---$/gm, '<hr class="border-t border-gray-100 my-4" />')
    .replace(/^[-•] (.+)$/gm, '<li class="mb-1.5 text-[13px] text-gray-700 leading-relaxed">$1</li>')
    .replace(/(<li class="mb-1.5 text-\[13px\] text-gray-700 leading-relaxed">.*<\/li>\n?)+/g, (m) => `<ul class="my-2 pl-4 list-disc marker:text-violet-400">${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li class="mb-1.5 text-[13px] text-gray-700 leading-relaxed">$1</li>')
    .replace(/(<li class="mb-1.5 text-\[13px\] text-gray-700 leading-relaxed">.*<\/li>\n?)+/g, (m) => `<ol class="my-2 pl-4 list-decimal">${m}</ol>`)
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-[3px] border-violet-400 my-3 pl-3 py-1 bg-violet-50/60 rounded-r-lg text-gray-600 italic">$1</blockquote>')
    .replace(/\n{2,}/g, '</p><p class="mb-2 last:mb-0">')
    .replace(/\n/g, "<br />")
    .replace(/^/, '<p class="mb-2 last:mb-0 text-[13px] text-gray-700 leading-relaxed">')
    .replace(/$/, "</p>");
}

const SUGGESTIONS = [
  { icon: TrendingUp,    text: "What was today's total revenue?" },
  { icon: BedDouble,     text: "Which rooms are currently occupied?" },
  { icon: UtensilsCrossed, text: "Top selling menu items today" },
  { icon: CalendarCheck, text: "Any upcoming banquet bookings?" },
];

// ── Bubbles ──────────────────────────────────────────────────────

function AssistantBubble({ content }: { content: string }) {
  return (
    <div className="flex items-end gap-2.5 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200">
        <Sparkles size={13} className="text-white" />
      </div>
      <div
        className="flex-1 bg-white rounded-[18px] rounded-bl-[4px] px-4 py-3 text-[13px] shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] border border-gray-100/80 max-w-[calc(100%-44px)] overflow-hidden"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white rounded-[18px] rounded-br-[4px] px-4 py-2.5 text-[14px] leading-relaxed max-w-[82%] font-medium whitespace-pre-wrap shadow-lg shadow-indigo-200/60">
        {content}
      </div>
    </div>
  );
}

function TypingIndicator({ status }: { status: string }) {
  return (
    <div className="flex items-end gap-2.5 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200">
        <Sparkles size={13} className="text-white" />
      </div>
      <div className="bg-white rounded-[18px] rounded-bl-[4px] px-4 py-3 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] border border-gray-100/80 flex items-center gap-2 min-w-[80px]">
        {status ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 animate-pulse">{status}</span>
        ) : (
          <div className="flex gap-1 py-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-gradient-to-b from-violet-400 to-indigo-500 inline-block animate-bounce"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────

export default function AdminAIChatbot({ token, staffRole }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Namaste! I'm your hotel AI assistant. I fetch **only the data I need** for each question.\n\nAsk me anything about your property.",
    },
  ]);

  const [geminiHistory, setGeminiHistory] = useState<GeminiTurn[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [fetchStatus, setFetchStatus] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);

  const stats = useQuery(
    api.aiChatbot.getStatsSummary,
    staffRole === "admin" ? { token } : "skip"
  );

  useEffect(() => {
    const onResize = () => {
      if (!window.visualViewport) return;
      const kb = Math.max(0, window.innerHeight - window.visualViewport.height - (window.visualViewport.offsetTop || 0));
      setKeyboardHeight(kb);
      if (kb > 0) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
    };
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    onResize();
    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [messages, loading]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setFetchStatus("Thinking…");
    try {
      const { text: reply } = await sendMessage(token, geminiHistory, text, setFetchStatus);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setGeminiHistory((prev) => [
        ...prev,
        { role: "user",  parts: [{ text }] },
        { role: "model", parts: [{ text: reply }] },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", content: `**System Error:** ${msg}` }]);
    } finally {
      setLoading(false);
      setFetchStatus("");
    }
  }, [input, loading, geminiHistory, token]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (staffRole !== "admin") return null;

  return (
    <div
      className="flex flex-col w-full h-full font-sans"
      style={{
        background: "linear-gradient(160deg, #faf8ff 0%, #f4f1ff 40%, #eef2ff 100%)",
        transform: `translateY(-${keyboardHeight}px)`,
        willChange: "transform",
      }}
    >
      {/* ── Header ── */}
      <div className="shrink-0 px-4 py-3.5 flex items-center justify-between border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* AI Avatar */}
          <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <Sparkles size={16} className="text-white" />
            {/* Live pulse */}
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
            </span>
          </div>
          <div>
            <p className="text-[13px] font-black text-gray-900 leading-none">ShyamOS</p>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
              <Zap size={9} className="fill-emerald-500" />
              {stats ? "Live · Real-time data" : "Connecting…"}
            </p>
          </div>
        </div>

        {stats && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-semibold">Today</p>
            <p className="text-[13px] font-black text-violet-700">₹{stats.revenue.today.toLocaleString("en-IN")}</p>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 px-4 pt-5 pb-3"
        style={{ overscrollBehaviorY: "contain" } as React.CSSProperties}
      >
        {messages.map((msg, i) =>
          msg.role === "assistant" ? (
            <AssistantBubble key={i} content={msg.content} />
          ) : (
            <UserBubble key={i} content={msg.content} />
          )
        )}
        {loading && <TypingIndicator status={fetchStatus} />}

        {/* Suggestions */}
        {messages.length === 1 && !loading && (
          <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mb-3">Quick actions</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => void handleSend(text)}
                  className="flex items-start gap-2 text-left px-3 py-2.5 rounded-2xl bg-white/80 border border-white shadow-sm hover:shadow-md hover:bg-violet-50/60 hover:border-violet-100 transition-all duration-200 active:scale-95 group"
                >
                  <div className="w-6 h-6 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-violet-200 transition-colors">
                    <Icon size={12} className="text-violet-600" />
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600 leading-tight group-hover:text-violet-700 transition-colors">{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-2" />
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 px-3 pt-2 pb-4 bg-white/70 backdrop-blur-xl border-t border-white/60">
        <div className={cn(
          "flex items-end gap-2 rounded-[22px] px-4 py-2 transition-all duration-200",
          "bg-white border border-gray-200 shadow-sm",
          "focus-within:border-violet-300 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]"
        )}>
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            placeholder="Ask anything about your hotel..."
            className="flex-1 max-h-[90px] bg-transparent resize-none border-none outline-none text-gray-800 placeholder:text-gray-400 py-2 leading-relaxed scrollbar-hide"
            style={{ fontSize: "16px" }}
            onChange={(e) => {
              setInput(e.target.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 90) + "px";
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            className={cn(
              "shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 mb-0.5",
              input.trim() && !loading
                ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-200 active:scale-90"
                : "bg-gray-100 text-gray-300"
            )}
          >
            <SendHorizontal size={16} className={cn(input.trim() && !loading && "translate-x-px")} />
          </button>
        </div>
        <p className="text-center text-[9px] font-bold text-gray-300/80 mt-2 uppercase tracking-widest">
          ShyamOS · Powered by Gemini
        </p>
      </div>
    </div>
  );
}