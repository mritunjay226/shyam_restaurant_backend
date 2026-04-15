"use client";

// ─────────────────────────────────────────────────────────────────
// AdminAIChatbot.tsx
// src/components/AdminAIChatbot.tsx
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

// ─── Main component ──────────────────────────────────────────────

export default function AdminAIChatbot({ token, staffRole }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Namaste! I'm your hotel AI assistant. I fetch **only the data I need** for each question.\n\nAsk me anything about your property.",
    },
  ]);

  const [geminiHistory, setGeminiHistory] = useState<GeminiTurn[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [fetchStatus, setFetchStatus] = useState("");

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);

  const stats = useQuery(
    api.aiChatbot.getStatsSummary,
    staffRole === "admin" ? { token } : "skip"
  );

  // Scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    // Small timeout ensures the DOM has painted the new bubble first
    const t = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(t);
  }, [messages, loading]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || loading) return;

      setInput("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
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

        /*
         * THE KEY FIX — professional chat layout:
         *
         * The outer wrapper uses 100dvh (dynamic viewport height).
         * dvh automatically shrinks when the software keyboard appears,
         * so the whole shell shrinks to fit the visible area.
         * No JS resize listeners, no visualViewport hacks needed.
         *
         * The input bar uses padding-bottom: env(safe-area-inset-bottom)
         * to respect iPhone home indicator and notch insets.
         *
         * The message area is flex-1 + overflow-y-auto — it fills whatever
         * space is left between the status bar and the input bar.
         * When the keyboard appears, dvh shrinks, flex-1 shrinks, scroll works.
         */
        .ai-chat-shell {
          display: flex;
          flex-direction: column;
          /* dvh = dynamic viewport height — shrinks when keyboard opens */
          height: 100dvh;
          /* Fallback for browsers that don't support dvh */
          height: 100vh;
          height: 100dvh;
          width: 100%;
          background: white;
          font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
          position: relative;
          overflow: hidden;
        }

        .ai-status-bar {
          flex-shrink: 0;
          z-index: 10;
        }

        .ai-messages-area {
          flex: 1;
          overflow-y: auto;
          /* Prevents rubber-band from causing content to go behind input */
          overscroll-behavior-y: contain;
          /* Scrollbar styling */
          scrollbar-width: thin;
          scrollbar-color: #bbf7d0 transparent;
        }
        .ai-messages-area::-webkit-scrollbar { width: 4px; }
        .ai-messages-area::-webkit-scrollbar-track { background: transparent; }
        .ai-messages-area::-webkit-scrollbar-thumb { background: #bbf7d0; border-radius: 9999px; }

        .ai-input-bar {
          flex-shrink: 0;
          /* Critical: safe-area padding for iPhone notch/home indicator */
          padding-bottom: max(12px, env(safe-area-inset-bottom));
          border-top: 1px solid #f3f4f6;
          background: #FAFFFE;
          /* Prevent input bar from being pushed up awkwardly */
          position: relative;
        }

        .ai-textarea {
          flex: 1;
          border: 1.5px solid #e5e7eb;
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 14px;
          line-height: 1.5;
          font-family: inherit;
          color: #111827;
          resize: none;
          background: white;
          transition: border-color 0.15s, box-shadow 0.15s;
          overflow: hidden;
          max-height: 120px;
          /* Prevent iOS zoom on focus (font-size must be ≥16px OR explicitly set) */
          font-size: max(16px, 14px);
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .ai-textarea:focus {
          outline: none;
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .ai-textarea::placeholder { color: #9ca3af; }

        .ai-send-btn {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: #16a34a;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 4px 12px rgba(22,163,74,0.25);
        }
        .ai-send-btn:hover:not(:disabled) {
          background: #15803d;
          box-shadow: 0 4px 16px rgba(22,163,74,0.35);
          transform: translateY(-1px);
        }
        .ai-send-btn:active:not(:disabled) { transform: translateY(0); }
        .ai-send-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .ai-chip {
          padding: 6px 14px;
          border-radius: 9999px;
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #15803d;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s, transform 0.1s;
          white-space: nowrap;
          font-family: inherit;
        }
        .ai-chip:hover { background: #dcfce7; border-color: #4ade80; }
        .ai-chip:active { transform: scale(0.96); }

        @media (min-width: 640px) {
          .ai-chat-shell {
            max-width: 768px;
            margin: 0 auto;
            border-left: 1px solid #f3f4f6;
            border-right: 1px solid #f3f4f6;
            box-shadow: 0 0 0 1px #f3f4f6;
          }
        }
      `}</style>

      <div className="ai-chat-shell">

        {/* ── Status bar ── */}
        <div className="ai-status-bar px-4 py-2.5 border-b border-green-50/70 bg-[#FAFFFE] flex items-center gap-2.5 shadow-sm">
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
        <div ref={scrollRef} className="ai-messages-area px-4 pt-5 pb-3">
          {messages.map((msg, i) =>
            msg.role === "assistant" ? (
              <AssistantBubble key={i} content={msg.content} />
            ) : (
              <UserBubble key={i} content={msg.content} />
            )
          )}
          {loading && <TypingIndicator status={fetchStatus} />}
          {/* This div is scrolled into view after each new message */}
          <div ref={bottomRef} className="h-1" />
        </div>

        {/* ── Suggestion chips (shown only on first load) ── */}
        {messages.length === 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2 shrink-0 animate-[aiFadeUp_0.4s_ease-out_forwards]">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="ai-chip"
                onClick={() => void handleSend(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input bar ── */}
        <div className="ai-input-bar px-3 sm:px-4 pt-3 flex gap-2.5 items-end">
          <textarea
            ref={textareaRef}
            className="ai-textarea"
            value={input}
            rows={1}
            placeholder="Ask anything about your hotel…"
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-grow
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            className="ai-send-btn"
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 2, marginTop: 2 }}>
              <path d="M22 2L11 13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

      </div>
    </>
  );
}