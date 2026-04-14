"use client";

// ─────────────────────────────────────────────────────────────────
// AdminAIChatbot.tsx
// src/components/AdminAIChatbot.tsx
//
// .env.local:  NEXT_PUBLIC_GEMINI_KEY=your_key_here
// Usage:       <AdminAIChatbot token={authToken} staffRole={staff.role} />
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

interface Props {
  token: string;
  staffRole: string;
}

interface DBSnapshot {
  rooms: Array<Record<string, unknown>>;
  bookings: Array<Record<string, unknown>>;
  guests: Array<Record<string, unknown>>;
  menuItems: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  banquetHalls: Array<Record<string, unknown>>;
  banquetBookings: Array<Record<string, unknown>>;
  bills: Array<{ createdAt: string; totalAmount: number; billType: string; [key: string]: unknown }>;
  staff: Array<Record<string, unknown>>;
  hotelSettings: Array<Record<string, unknown>>;
  auditLog: Array<Record<string, unknown>>;
  fetchedAt: string;
}

// ─── Markdown parser ─────────────────────────────────────────────
// Lightweight renderer — no external dependency needed.

function renderMarkdown(text: string): string {
  return text
    // headings
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
    // bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    // horizontal rule
    .replace(/^---$/gm, '<hr class="md-hr" />')
    // unordered lists — group consecutive lines
    .replace(/^[-•] (.+)$/gm, '<li class="md-li">$1</li>')
    .replace(/(<li class="md-li">.*<\/li>\n?)+/g, (m) => `<ul class="md-ul">${m}</ul>`)
    // ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="md-oli">$1</li>')
    .replace(/(<li class="md-oli">.*<\/li>\n?)+/g, (m) => `<ol class="md-ol">${m}</ol>`)
    // blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="md-bq">$1</blockquote>')
    // paragraphs — double newline → <p>
    .replace(/\n{2,}/g, '</p><p class="md-p">')
    // single newline inside content
    .replace(/\n/g, '<br />')
    // wrap everything in a paragraph
    .replace(/^/, '<p class="md-p">')
    .replace(/$/, '</p>');
}

// ─── Gemini API ──────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  history: Message[],
  userMessage: string
): Promise<string> {
  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
      }),
    }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Gemini error ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I couldn't generate a response.";
}

// ─── System prompt ───────────────────────────────────────────────

function buildSystemPrompt(db: DBSnapshot | undefined): string {
  if (!db) return "You are a helpful hotel assistant. The database is still loading.";

  const today = new Date().toISOString().split("T")[0];
  const todayRevenue = db.bills
    .filter((b) => b.createdAt?.startsWith(today))
    .reduce((s, b) => s + b.totalAmount, 0);
  const totalRevenue = db.bills.reduce((s, b) => s + b.totalAmount, 0);
  const occupied = db.rooms.filter((r) => (r as { status: string }).status === "occupied").length;
  const available = db.rooms.filter(
    (r) => (r as { status: string; isActive: boolean }).status === "available" &&
            (r as { status: string; isActive: boolean }).isActive
  ).length;

  return `You are an intelligent hotel management AI assistant, accessible only to the main admin.
Today's date: ${today}

## LIVE DATABASE SNAPSHOT (fetched at ${db.fetchedAt})

### ROOMS (${db.rooms.length} total | ${occupied} occupied | ${available} available)
${JSON.stringify(db.rooms, null, 2)}

### ROOM BOOKINGS (${db.bookings.length} total)
${JSON.stringify(db.bookings, null, 2)}

### GUEST PROFILES (${db.guests.length} profiles)
${JSON.stringify(db.guests, null, 2)}

### MENU ITEMS (${db.menuItems.length} items)
${JSON.stringify(db.menuItems, null, 2)}

### RESTAURANT / CAFE ORDERS (${db.orders.length} total)
${JSON.stringify(db.orders, null, 2)}

### BANQUET HALLS (${db.banquetHalls.length})
${JSON.stringify(db.banquetHalls, null, 2)}

### BANQUET BOOKINGS (${db.banquetBookings.length})
${JSON.stringify(db.banquetBookings, null, 2)}

### BILLS (${db.bills.length} total | Today: ₹${todayRevenue.toFixed(2)} | All-time: ₹${totalRevenue.toFixed(2)})
${JSON.stringify(db.bills, null, 2)}

### STAFF (${db.staff.length} members — PINs stripped)
${JSON.stringify(db.staff, null, 2)}

### HOTEL SETTINGS
${JSON.stringify(db.hotelSettings, null, 2)}

### RECENT AUDIT LOG (last 200 actions)
${JSON.stringify(db.auditLog, null, 2)}

## YOUR CAPABILITIES
- Revenue analysis: daily, monthly, yearly, by outlet (room / restaurant / cafe / banquet)
- Guest lookup by name or phone — case-insensitive partial matching across bookings, guests, banquetBookings
- Room status, occupancy, upcoming arrivals and departures
- Order history, best-selling menu items, outlet performance
- Banquet events, upcoming bookings, balances due
- Staff activity from audit logs

## RULES
- Always respond in clean Markdown format. Use headings, bullet points, bold text, and tables where appropriate.
- Use ₹ for all currency. Format large numbers with Indian comma style (e.g. ₹1,20,000).
- When asked about a specific date, filter by that date string (YYYY-MM-DD format).
- If data doesn't exist for a query, say so honestly.
- If someone asks in hinglish reply them in hinglish, if english reply them in english and do the same for hindi.
- Never reveal staff PINs — already removed from data.`;
}

// ─── Suggestions ─────────────────────────────────────────────────

const SUGGESTIONS: string[] = [
  "What was today's total revenue?",
  // "Has any guest named Rahul ever visited?",
  "Which rooms are currently occupied?",
  "Revenue breakdown for this month",
  "Top selling menu items",
  "Any upcoming banquet bookings?",
];

// ─── Markdown message bubble ─────────────────────────────────────

function AssistantBubble({ content }: { content: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 16 }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
        background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: "#fff", fontWeight: 700,
      }}>
        ✦
      </div>
      {/* Bubble */}
      <div
        className="ai-md-bubble"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        style={{
          flex: 1,
          background: "#F0FDF4",
          border: "1px solid #BBF7D0",
          borderRadius: "0 14px 14px 14px",
          padding: "10px 14px",
          fontSize: 13.5,
          lineHeight: 1.65,
          color: "#14532D",
          maxWidth: "calc(100% - 36px)",
        }}
      />
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
      <div style={{
        background: "#16A34A",
        color: "#fff",
        borderRadius: "14px 14px 0 14px",
        padding: "10px 14px",
        fontSize: 13.5,
        lineHeight: 1.6,
        maxWidth: "78%",
        whiteSpace: "pre-wrap",
        boxShadow: "0 2px 8px rgba(22,163,74,0.2)",
      }}>
        {content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: "#16A34A", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 13, color: "#fff",
      }}>✦</div>
      <div style={{
        background: "#F0FDF4", border: "1px solid #BBF7D0",
        borderRadius: "0 14px 14px 14px", padding: "10px 14px",
        display: "flex", gap: 5,
      }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: "50%", background: "#16A34A",
            display: "inline-block",
            animation: `aiBounce 1.2s ease ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────

export default function AdminAIChatbot({ token, staffRole }: Props) {
  const geminiKey = process.env.NEXT_PUBLIC_GEMINI_KEY ?? "";

  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Namaste! I'm your hotel AI assistant. I have **live access** to all your data — rooms, bookings, guests, orders, bills, and banquet events.\n\nAsk me anything about your property.",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dbData = useQuery(
    api.aiChatbot.getAllDataForAI,
    staffRole === "admin" ? { token } : "skip"
  ) as DBSnapshot | undefined;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      if (!geminiKey) throw new Error("Add NEXT_PUBLIC_GEMINI_KEY to .env.local");
      const systemPrompt = buildSystemPrompt(dbData);
      const history = messages.slice(1).slice(-10);
      const reply = await callGemini(geminiKey, systemPrompt, history, text);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", content: `**Error:** ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, dbData, geminiKey]);

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
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }

        /* Markdown styles scoped to AI bubble */
        .ai-md-bubble p.md-p   { margin: 0 0 8px 0; }
        .ai-md-bubble p.md-p:last-child { margin-bottom: 0; }
        .ai-md-bubble h1.md-h1 { font-size: 15px; font-weight: 800; color: #14532D; margin: 10px 0 4px; }
        .ai-md-bubble h2.md-h2 { font-size: 14px; font-weight: 700; color: #166534; margin: 8px 0 4px; }
        .ai-md-bubble h3.md-h3 { font-size: 13px; font-weight: 700; color: #166534; margin: 6px 0 2px; }
        .ai-md-bubble strong   { font-weight: 700; color: #15803D; }
        .ai-md-bubble em       { font-style: italic; }
        .ai-md-bubble code.md-code {
          background: #DCFCE7; color: #166534; padding: 1px 5px;
          border-radius: 4px; font-size: 12px; font-family: monospace;
        }
        .ai-md-bubble ul.md-ul { margin: 4px 0 8px 0; padding-left: 18px; list-style: disc; }
        .ai-md-bubble ol.md-ol { margin: 4px 0 8px 0; padding-left: 18px; list-style: decimal; }
        .ai-md-bubble li.md-li,
        .ai-md-bubble li.md-oli { margin-bottom: 2px; }
        .ai-md-bubble blockquote.md-bq {
          border-left: 3px solid #16A34A; margin: 6px 0;
          padding: 4px 10px; background: #DCFCE7; border-radius: 0 6px 6px 0;
          color: #166534; font-style: italic;
        }
        .ai-md-bubble hr.md-hr {
          border: none; border-top: 1px solid #BBF7D0; margin: 8px 0;
        }

        .ai-chat-scroll::-webkit-scrollbar { width: 4px; }
        .ai-chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .ai-chat-scroll::-webkit-scrollbar-thumb { background: #BBF7D0; border-radius: 2px; }

        .ai-textarea:focus {
          outline: none;
          border-color: #16A34A !important;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.12);
        }
        .ai-textarea::placeholder { color: #9CA3AF; }

        .ai-chip {
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid #BBF7D0;
          background: #F0FDF4;
          color: #16A34A;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .ai-chip:hover {
          background: #DCFCE7;
          border-color: #16A34A;
        }

        .ai-send-btn {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: #16A34A;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
          box-shadow: 0 2px 8px rgba(22,163,74,0.3);
        }
        .ai-send-btn:hover:not(:disabled) { background: #15803D; transform: scale(1.05); }
        .ai-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column",
        height: "100%", background: "#fff",
        fontFamily: "'Segoe UI', sans-serif",
      }}>

        {/* ── Status bar ── */}
        <div style={{
          padding: "10px 16px",
          borderBottom: "1px solid #F0FDF4",
          background: "#FAFFFE",
          display: "flex", alignItems: "center", gap: 8,
          flexShrink: 0,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: dbData ? "#16A34A" : "#FCD34D",
            boxShadow: dbData ? "0 0 5px #16A34A" : "0 0 5px #FCD34D",
          }} />
          <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>
            {dbData
              ? `Live · ${dbData.bills.length} bills · ${dbData.bookings.length} bookings · ${dbData.guests.length} guests`
              : "Connecting to database…"}
          </span>
        </div>

        {/* ── Messages ── */}
        <div
          className="ai-chat-scroll"
          style={{ flex: 1, overflowY: "auto", padding: "16px 14px 8px" }}
        >
          {messages.map((msg, i) =>
            msg.role === "assistant" ? (
              <div key={i} style={{ animation: "aiFadeUp 0.2s ease" }}>
                <AssistantBubble content={msg.content} />
              </div>
            ) : (
              <div key={i} style={{ animation: "aiFadeUp 0.2s ease" }}>
                <UserBubble content={msg.content} />
              </div>
            )
          )}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* ── Suggestion chips ── */}
        {messages.length === 1 && (
          <div style={{
            padding: "0 14px 10px",
            display: "flex", flexWrap: "wrap", gap: 6,
          }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="ai-chip" onClick={() => void handleSend(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input ── */}
        <div style={{
          padding: "10px 14px 14px",
          borderTop: "1px solid #F3F4F6",
          background: "#FAFFFE",
          display: "flex", gap: 8, alignItems: "flex-end",
          flexShrink: 0,
        }}>
          <textarea
            ref={textareaRef}
            className="ai-textarea"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height =
                Math.min(e.currentTarget.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your hotel…"
            rows={1}
            style={{
              flex: 1,
              border: "1.5px solid #E5E7EB",
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 13.5,
              color: "#111827",
              resize: "none",
              lineHeight: 1.5,
              background: "#fff",
              transition: "border-color 0.15s, box-shadow 0.15s",
              fontFamily: "inherit",
              overflowY: "hidden",
            }}
          />
          <button
            className="ai-send-btn"
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}