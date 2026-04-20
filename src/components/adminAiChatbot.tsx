"use client";

// ─────────────────────────────────────────────────────────────────
// AdminAIChatbot.tsx
// Redesigned: Premium iMessage/WhatsApp feel with strict keyboard tolerance
// ─────────────────────────────────────────────────────────────────

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Sparkles, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────

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

// ─── API call ────────────────────────────────────────────────────

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

// ─── Markdown renderer ────────────────────────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-[13px] font-bold text-violet-900 mt-2 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[14px] font-black text-violet-900 mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-[15px] font-black text-indigo-900 mt-4 mb-2">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold text-violet-700 italic">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-black text-gray-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-gray-600">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest">$1</code>')
    .replace(/^---$/gm, '<hr class="border-t border-gray-100 my-4" />')
    .replace(/^[-•] (.+)$/gm, '<li class="mb-1 text-gray-700 leading-relaxed">$1</li>')
    .replace(/(<li class="mb-1 text-gray-700 leading-relaxed">.*<\/li>\n?)+/g, (m) => `<ul class="my-2 pl-4 list-disc text-[13px] marker:text-violet-400">${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li class="mb-1 text-gray-700 leading-relaxed">$1</li>')
    .replace(/(<li class="mb-1 text-gray-700 leading-relaxed">.*<\/li>\n?)+/g, (m) => `<ol class="my-2 pl-4 list-decimal text-[13px] font-medium">${m}</ol>`)
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-[3px] border-violet-500 my-3 pl-3 py-1 text-gray-600 italic font-medium">$1</blockquote>')
    .replace(/\n{2,}/g, '</p><p class="mb-3 last:mb-0">')
    .replace(/\n/g, "<br />")
    .replace(/^/, '<p class="mb-3 last:mb-0 text-gray-700 leading-relaxed">')
    .replace(/$/, "</p>");
}

// ─── Suggestions ─────────────────────────────────────────────────

const SUGGESTIONS: string[] = [
  "What was today's total revenue?",
  "Which rooms are currently occupied?",
  "Revenue breakdown for this month",
  "Top selling menu items"
];

// ─── Subcomponents ────────────────────────────────────────────────

function AssistantBubble({ content }: { content: string }) {
  return (
    <div className="flex items-end gap-2 mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center bg-violet-100 text-violet-600 border border-violet-200 shadow-[0_2px_8px_-2px_rgba(139,92,246,0.2)]">
        <Sparkles size={12} className="fill-violet-600" />
      </div>
      <div
        className="flex-1 bg-white border border-gray-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] rounded-[20px] rounded-bl-sm px-4 py-3 text-[13px] max-w-[calc(100%-32px)] overflow-hidden"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-linear-to-br from-indigo-600 to-violet-600 text-white rounded-[20px] rounded-br-sm px-4 py-2.5 text-[14px] leading-snug max-w-[85%] font-medium whitespace-pre-wrap shadow-[0_4px_16px_-4px_rgba(99,102,241,0.4)]">
        {content}
      </div>
    </div>
  );
}

function TypingIndicator({ status }: { status: string }) {
  return (
    <div className="flex items-end gap-2 mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center bg-violet-100 text-violet-600 border border-violet-200">
        <Sparkles size={12} />
      </div>
      <div className="bg-white border border-gray-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] rounded-[20px] rounded-bl-sm px-4 py-3 min-h-[44px] flex items-center gap-2">
        {status ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 animate-pulse">{status}</span>
        ) : (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────

export default function AdminAIChatbot({ token, staffRole }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your interactive AI agent. I can access live data securely and assist you with anything regarding the hotel.",
    },
  ]);

  const [geminiHistory, setGeminiHistory] = useState<GeminiTurn[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [fetchStatus, setFetchStatus] = useState("");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);

  const stats = useQuery(
    api.aiChatbot.getStatsSummary,
    staffRole === "admin" ? { token } : "skip"
  );

  // Track keyboard state only — don't touch container height (parent panel owns that)
  useEffect(() => {
    if (!window.visualViewport) return;
    
    const onResize = () => {
      const vh = window.visualViewport?.height || window.innerHeight;
      setIsKeyboardOpen(vh < window.innerHeight - 80);
      
      if (document.activeElement === textareaRef.current) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 100);
      }
    };

    window.visualViewport.addEventListener("resize", onResize);
    window.visualViewport.addEventListener("scroll", onResize);
    onResize();

    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
    };
  }, []);

  // Scroll to bottom effect
  useEffect(() => {
    const t = setTimeout(() => {
      if (scrollRef.current && bottomRef.current) {
        scrollRef.current.scrollTo({
           top: scrollRef.current.scrollHeight,
           behavior: "smooth"
        });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [messages, loading]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
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
        const { text: reply, toolsUsed } = await sendMessage(
          token,
          geminiHistory,
          text,
          (status) => setFetchStatus(status)
        );

        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setGeminiHistory((prev) => [
          ...prev,
          { role: "user",  parts: [{ text }] },
          { role: "model", parts: [{ text: reply }] },
        ]);

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `**System Error:** ${msg}` },
        ]);
      } finally {
        setLoading(false);
        setFetchStatus("");
      }
    },
    [input, loading, geminiHistory, token]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent newline
      // Only send if native submit triggered from enter outside mobile dictation
      if (!e.nativeEvent.isComposing) {
         void handleSend();
      }
    }
  };

  if (staffRole !== "admin") return null;

  return (
    <div 
      className="flex flex-col w-full h-full bg-[#fcfcff] font-sans"
    >
      {/* ── Status bar ── */}
      <div className="shrink-0 px-5 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between z-10 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", stats ? "bg-emerald-500" : "bg-amber-400")} />
            <span className={cn("relative inline-flex rounded-full h-2 w-2", stats ? "bg-emerald-600" : "bg-amber-500")} />
          </div>
          <span className="text-[10px] text-gray-500 font-extrabold tracking-widest uppercase">
            {stats ? 'Online · Live Sync' : 'Reconnecting...'}
          </span>
        </div>
        
        {stats && (
           <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
             ₹{stats.revenue.today.toLocaleString()} Today
           </div>
        )}
      </div>

      {/* ── Messages (fills remaining space, scrollable) ── */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-4 sm:px-6 pt-6 pb-2 scroll-smooth min-h-0"
        style={{ overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {messages.map((msg, i) =>
          msg.role === "assistant" ? (
            <AssistantBubble key={i} content={msg.content} />
          ) : (
            <UserBubble key={i} content={msg.content} />
          )
        )}
        {loading && <TypingIndicator status={fetchStatus} />}
        
        {/* Suggestion chips (shown only on first load) */}
        {messages.length === 1 && (
          <div className="flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void handleSend(s)}
                className="self-start text-[12px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-100/50 rounded-xl px-4 py-2.5 transition-colors active:scale-95 origin-left"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* ── Input bar — always pinned at bottom ── */}
      <div 
        className="shrink-0 bg-white border-t border-gray-100 pt-3 px-3 sm:px-4"
        style={{
          paddingBottom: isKeyboardOpen
            ? "max(12px, env(safe-area-inset-bottom))"
            : "max(16px, env(safe-area-inset-bottom))",
          transition: "padding-bottom 0.15s ease-out"
        }}
      >
        <div className="relative flex items-end gap-2 bg-gray-50/50 border border-gray-200 rounded-[24px] p-1.5 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500/30 transition-all shadow-inner">
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            placeholder="Ask anything about your hotel..."
            className="flex-1 max-h-[120px] bg-transparent resize-none border-none outline-none text-gray-900 placeholder:text-gray-400 py-2.5 px-4 scrollbar-hide"
            style={{ fontSize: '16px' }}
            onChange={(e) => {
              setInput(e.target.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            className={cn(
              "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
              input.trim() && !loading
                ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95"
                : "bg-gray-100 text-gray-400"
            )}
          >
            <SendHorizontal size={18} className={cn(input.trim() && !loading && "translate-x-px translate-y-px")} />
          </button>
        </div>
        <p className="text-center text-[9px] font-bold text-gray-300 mt-2 uppercase tracking-widest">Powered by Antigravity Agentic Models</p>
      </div>
    </div>
  );
}