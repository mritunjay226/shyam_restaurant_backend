"use client";

// ─────────────────────────────────────────────────────────────────
// AdminAIChatbot.tsx
// src/components/AdminAIChatbot.tsx
//
// .env.local:
//   GEMINI_KEY=your_key_here      ← server-side only, never NEXT_PUBLIC_
//   CONVEX_URL=https://xxx.convex.cloud
//
// Usage: <AdminAIChatbot token={authToken} staffRole={staff.role} />
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

// ─── Types ───────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Gemini conversation turn — stored in state so multi-turn context
// is preserved across messages without re-fetching anything.
interface GeminiTurn {
  role: string;
  parts: Array<{ text?: string; functionCall?: unknown; functionResponse?: unknown }>;
}

interface Props {
  token: string;
  staffRole: string;
}

// ─── Call our own API route (key never leaves the server) ─────────

async function sendMessage(
  token: string,
  history: GeminiTurn[],
  userMessage: string,
  onStatus: (msg: string) => void
): Promise<{ text: string; toolsUsed: string[] }> {
  // Stream status updates by polling — the fetch itself is a single
  // round-trip but we want to show "Thinking…" while waiting.
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
    .replace(/^### (.+)$/gm, '<h3 class="text-[13px] font-bold text-green-800 mt-2 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[14px] font-bold text-green-800 mt-2.5 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-[15px] font-extrabold text-green-900 mt-3 mb-1.5">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold text-green-700 italic">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-green-700">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-green-200/50 text-green-800 px-1.5 py-0.5 rounded-[4px] text-[12px] font-mono">$1</code>')
    .replace(/^---$/gm, '<hr class="border-t border-green-200 my-3" />')
    .replace(/^[-•] (.+)$/gm, '<li class="mb-0.5">$1</li>')
    .replace(/(<li class="mb-0.5">.*<\/li>\n?)+/g, (m) => `<ul class="my-1.5 pl-4 list-disc">${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li class="mb-0.5">$1</li>')
    .replace(/(<li class="mb-0.5">.*<\/li>\n?)+/g, (m) => `<ol class="my-1.5 pl-4 list-decimal">${m}</ol>`)
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-[3px] border-green-500 my-2 px-3 py-1.5 bg-green-100/50 rounded-r-md text-green-800 italic">$1</blockquote>')
    .replace(/\n{2,}/g, '</p><p class="mb-2.5 last:mb-0">')
    .replace(/\n/g, "<br />")
    .replace(/^/, '<p class="mb-2.5 last:mb-0">')
    .replace(/$/, "</p>");
}

// ─── Suggestions ─────────────────────────────────────────────────

const SUGGESTIONS: string[] = [
  "What was today's total revenue?",
  "Which rooms are currently occupied?",
  "Revenue breakdown for this month",
  "Top selling menu items",
  "Any upcoming banquet bookings?",
];

// ─── Subcomponents ────────────────────────────────────────────────

function AssistantBubble({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-2 mb-4 animate-[aiFadeUp_0.3s_ease-out_forwards]">
      <div className="w-7 h-7 rounded-full shrink-0 mt-0.5 bg-green-600 flex items-center justify-center text-[13px] text-white font-bold shadow-sm">
        ✦
      </div>
      <div
        className="flex-1 bg-green-50 border border-green-200/60 rounded-2xl rounded-tl-sm px-4 py-3 text-[13.5px] leading-relaxed text-green-950 max-w-[calc(100%-36px)]"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-4 animate-[aiFadeUp_0.3s_ease-out_forwards]">
      <div className="bg-green-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13.5px] leading-relaxed max-w-[85%] sm:max-w-[75%] whitespace-pre-wrap shadow-sm">
        {content}
      </div>
    </div>
  );
}

function TypingIndicator({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 animate-[aiFadeUp_0.3s_ease-out_forwards]">
      <div className="w-7 h-7 rounded-full shrink-0 bg-green-600 flex items-center justify-center text-[13px] text-white shadow-sm">
        ✦
      </div>
      <div className="bg-green-50 border border-green-200/60 rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-2 min-h-[34px]">
        {status ? (
          <span className="text-[12px] text-green-700 italic">{status}</span>
        ) : (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"
                style={{ animation: `aiBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Keyboard viewport hook ───────────────────────────────────────

function useKeyboardHandling() {
  const [viewportHeight, setViewportHeight] = useState("100%");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!window.visualViewport) return;
    
    const handleResize = () => {
      const v = window.visualViewport;
      if (v) {
        // Force the exact available visual height
        setViewportHeight(`${v.height}px`);
        // If the visual viewport is significantly smaller than the window, keyboard is likely open
        setIsKeyboardOpen(window.innerHeight - v.height > 150);
      }
    };

    window.visualViewport.addEventListener("resize", handleResize);
    window.visualViewport.addEventListener("scroll", handleResize);
    
    handleResize(); // Initialize immediately on mount

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, []);

  return { viewportHeight, isKeyboardOpen };
}

// ─── Main component ──────────────────────────────────────────────

export default function AdminAIChatbot({ token, staffRole }: Props) {
  // Visible chat messages (user + assistant bubbles)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Namaste! I'm your hotel AI assistant. I fetch **only the data I need** for each question.\n\nAsk me anything about your property.",
    },
  ]);

  // Full Gemini conversation history (includes tool turns, never shown to user)
  // Starts empty — the first user message seeds it.
  const [geminiHistory, setGeminiHistory] = useState<GeminiTurn[]>([]);

  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [fetchStatus, setFetchStatus] = useState("");

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // New hook integration
  const { viewportHeight, isKeyboardOpen } = useKeyboardHandling();

  // Lightweight status bar query — only counts + today's revenue
  const stats = useQuery(
    api.aiChatbot.getStatsSummary,
    staffRole === "admin" ? { token } : "skip"
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || loading) return;

      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      // Show user bubble immediately
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

        // Append assistant bubble
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

        // Update Gemini history with this full round-trip so context carries forward
        setGeminiHistory((prev) => [
          ...prev,
          { role: "user",  parts: [{ text }] },
          { role: "model", parts: [{ text: reply }] },
        ]);

        // Optional: log which tools were used (visible in dev console)
        if (toolsUsed.length > 0) {
          console.debug("[AI] tools used:", toolsUsed.join(", "));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `**Error:** ${msg}` },
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
      e.preventDefault();
      void handleSend();
    }
  };

  if (staffRole !== "admin") return null;

  return (
    <>
      <style>{`
        @keyframes aiFadeUp {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes aiBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%           { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>

      <div
        className="flex flex-col bg-white font-sans transition-[height] duration-150 ease-out sm:max-w-3xl sm:mx-auto sm:border-x sm:border-gray-100 sm:shadow-sm"
        style={{ height: viewportHeight }}
      >
        {/* ── Status bar ── */}
        <div className="px-4 py-2.5 border-b border-green-50/50 bg-[#FAFFFE] flex items-center gap-2.5 shrink-0 z-10 shadow-sm">
          <div className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stats ? "bg-green-500" : "bg-amber-400"}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${stats ? "bg-green-600" : "bg-amber-500"}`} />
          </div>
          <span className="text-[11.5px] text-gray-500 font-medium tracking-wide uppercase">
            {stats
              ? `Live · ${stats.rooms.occupied} Occupied · ₹${stats.revenue.today.toLocaleString("en-IN")} Today`
              : "Connecting…"}
          </span>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-green-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {messages.map((msg, i) =>
            msg.role === "assistant" ? (
              <AssistantBubble key={i} content={msg.content} />
            ) : (
              <UserBubble key={i} content={msg.content} />
            )
          )}
          {loading && <TypingIndicator status={fetchStatus} />}
          <div ref={bottomRef} className="h-1" />
        </div>

        {/* ── Suggestion chips ── */}
        {messages.length === 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2 animate-[aiFadeUp_0.4s_ease-out_forwards]">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void handleSend(s)}
                className="px-3.5 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 text-[12px] font-semibold cursor-pointer transition-all hover:bg-green-100 hover:border-green-400 hover:scale-[1.02] active:scale-95 whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input ── */}
        <div className="px-3 sm:px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-gray-100 bg-[#FAFFFE] flex gap-2.5 items-end shrink-0">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your hotel…"
            rows={1}
            className="flex-1 border-1.5 border-gray-200 rounded-[14px] px-3.5 py-3 text-[14px] text-gray-900 resize-none leading-relaxed bg-white transition-all focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 placeholder:text-gray-400 overflow-hidden shadow-sm"
          />
          <button
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            className="w-[44px] h-[44px] rounded-[14px] bg-green-600 border-none cursor-pointer flex items-center justify-center shrink-0 transition-all duration-200 shadow-[0_4px_12px_rgba(22,163,74,0.25)] hover:bg-green-700 hover:shadow-[0_4px_16px_rgba(22,163,74,0.35)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_12px_rgba(22,163,74,0.25)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="ml-0.5 mt-0.5">
              <path d="M22 2L11 13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* ── Mobile bottom nav spacer ── */}
        <div
          className="md:hidden shrink-0 transition-[height] duration-150 ease-out bg-[#FAFFFE]"
          style={{ height: isKeyboardOpen ? 0 : 64 }}
        />
      </div>
    </>
  );
}