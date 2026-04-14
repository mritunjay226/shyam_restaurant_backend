// app/api/ai-chat/route.ts
//
// Server-side route — Gemini key never reaches the browser.
//
// .env.local:
//   GEMINI_KEY=your_key_here          ← no NEXT_PUBLIC_ prefix
//   CONVEX_URL=https://xxx.convex.cloud
//
// Called by adminAiChatbot.tsx with:
//   POST /api/ai-chat
//   body: { token, history, userMessage }

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

// ─── Convex HTTP client (server-side only) ────────────────────────
const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

// ─── Gemini tool definitions ──────────────────────────────────────
// Gemini reads these and decides which tool(s) to call.

const HOTEL_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "getRoomsSummary",
        description:
          "Get all hotel rooms with their current status (available / occupied / pending_checkout), category, tariff, floor, and amenities. Use for room availability, occupancy rate, and room-specific questions.",
      },
      {
        name: "getBookings",
        description:
          "Get room bookings. Filter by booking status and/or check-in date range. Use for check-in/check-out queries, arrival/departure lists, and booking history.",
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["confirmed", "checked_in", "checked_out", "cancelled"],
              description: "Filter by booking status",
            },
            dateFrom: {
              type: "string",
              description: "Start of check-in date range in YYYY-MM-DD format",
            },
            dateTo: {
              type: "string",
              description: "End of check-in date range in YYYY-MM-DD format",
            },
            limit: {
              type: "number",
              description: "Max records to return (default 50)",
            },
          },
        },
      },
      {
        name: "getGuests",
        description:
          "Search guest profiles by name or phone number. Use for guest lookup, visit history, and total spend analysis.",
        parameters: {
          type: "object",
          properties: {
            search: {
              type: "string",
              description: "Partial guest name or phone number to search",
            },
            limit: {
              type: "number",
              description: "Max records to return (default 30)",
            },
          },
        },
      },
      {
        name: "getBills",
        description:
          "Get finalized bills. Filter by date range and/or bill type (outlet). Use for revenue analysis, payment method breakdown, and financial summaries.",
        parameters: {
          type: "object",
          properties: {
            dateFrom: {
              type: "string",
              description: "Start date in YYYY-MM-DD format",
            },
            dateTo: {
              type: "string",
              description: "End date in YYYY-MM-DD format (inclusive)",
            },
            billType: {
              type: "string",
              enum: ["room", "restaurant", "cafe", "banquet"],
              description: "Filter bills by outlet type",
            },
            limit: {
              type: "number",
              description: "Max records to return (default 100)",
            },
          },
        },
      },
      {
        name: "getOrders",
        description:
          "Get restaurant or cafe orders. Filter by outlet and/or date range. Use for order history, KOT queries, and food & beverage revenue.",
        parameters: {
          type: "object",
          properties: {
            outlet: {
              type: "string",
              enum: ["restaurant", "cafe"],
              description: "Filter by outlet",
            },
            dateFrom: {
              type: "string",
              description: "Start date in YYYY-MM-DD format",
            },
            dateTo: {
              type: "string",
              description: "End date in YYYY-MM-DD format",
            },
            limit: {
              type: "number",
              description: "Max records to return (default 50)",
            },
          },
        },
      },
      {
        name: "getMenuItems",
        description:
          "Get all menu items with their name, category, outlet, price, and availability. Use for menu queries, item lookup, and best-seller analysis when combined with orders.",
      },
      {
        name: "getBanquetData",
        description:
          "Get banquet halls and their bookings. Filter bookings by event date range. Use for upcoming events, hall availability, and banquet revenue.",
        parameters: {
          type: "object",
          properties: {
            dateFrom: {
              type: "string",
              description: "Start event date in YYYY-MM-DD format",
            },
            dateTo: {
              type: "string",
              description: "End event date in YYYY-MM-DD format",
            },
          },
        },
      },
      {
        name: "getStaff",
        description:
          "Get all staff members with their name, role, and active status. PINs are already stripped. Use for staff queries and role-based questions.",
      },
      {
        name: "getAuditLog",
        description:
          "Get recent audit log entries showing staff actions (login, logout, create_order, checkin, checkout, etc.). Use for activity tracking.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of most recent entries to return (default 50)",
            },
          },
        },
      },
      {
        name: "getHotelSettings",
        description:
          "Get hotel configuration: hotel name, address, phone, GST rates, check-in/check-out times, and other system settings.",
      },
    ],
  },
];

// ─── System prompt ────────────────────────────────────────────────
// Sent on every request. Contains zero DB data — all data comes
// through tool calls so the model only loads what it needs.

function buildSystemPrompt(today: string): string {
  return `You are an intelligent hotel management AI assistant, accessible only to the main admin.
Today's date: ${today}

## HOW YOU WORK
You have tools that query the hotel database. Before answering any question that requires live data, call the relevant tool(s) with the tightest filters possible — do NOT fetch everything when you only need a date range or a specific status.

## TOOL SELECTION GUIDE
- Room availability / occupancy                → getRoomsSummary
- Check-ins, check-outs, arrival list          → getBookings  (pass status and/or date filters)
- Guest lookup by name or phone                → getGuests    (pass search parameter)
- Revenue, bills, payment methods              → getBills     (pass dateFrom + dateTo)
- Restaurant / cafe orders                     → getOrders    (pass outlet + date filters)
- Menu, item prices, best sellers              → getMenuItems
- Banquet events, hall availability            → getBanquetData (pass date filters)
- Staff members, roles                         → getStaff
- Who did what, recent activity                → getAuditLog
- Hotel name, GST rates, timings               → getHotelSettings

## RULES
- Always call the right tool before answering. Never guess or make up data.
- When a question covers a date range, always pass dateFrom and dateTo filters — do not fetch all bills or all orders.
- Respond in clean Markdown: use headings, bullet points, bold text, and tables where appropriate and don't make the responses too short or long if asked for details give details don't take shortcuts.
- Use ₹ for currency. Format with Indian comma style (₹1,20,000).
- If someone asks in Hinglish → reply in Hinglish. Hindi → Hindi. English → English.
- If data is not found for a query, say so honestly.
- Never reveal or mention staff PINs (they are already stripped from all data).
`;

}

// ─── Execute tool call against Convex ────────────────────────────

async function executeTool(
  token: string,
  toolName: string,
  toolArgs: Record<string, unknown>
): Promise<unknown> {
  const base = { token, ...toolArgs } as any;

  switch (toolName) {
    case "getRoomsSummary":  return convex.query(api.aiChatbot.getRoomsSummary,  { token });
    case "getBookings":      return convex.query(api.aiChatbot.getBookings,      base);
    case "getGuests":        return convex.query(api.aiChatbot.getGuests,        base);
    case "getBills":         return convex.query(api.aiChatbot.getBills,         base);
    case "getOrders":        return convex.query(api.aiChatbot.getOrders,        base);
    case "getMenuItems":     return convex.query(api.aiChatbot.getMenuItems,     { token });
    case "getBanquetData":   return convex.query(api.aiChatbot.getBanquetData,   base);
    case "getStaff":         return convex.query(api.aiChatbot.getStaff,         { token });
    case "getAuditLog":      return convex.query(api.aiChatbot.getAuditLog,      base);
    case "getHotelSettings": return convex.query(api.aiChatbot.getHotelSettings, { token });
    default: throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ─── Types ────────────────────────────────────────────────────────

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: { content: unknown } } };

type GeminiContent = { role: string; parts: GeminiPart[] };

// ─── POST handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { token, history, userMessage } = (await req.json()) as {
      token: string;
      history: { role: string; parts: GeminiPart[] }[];
      userMessage: string;
    };

    const apiKey = process.env.GEMINI_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_KEY not set on server" }, { status: 500 });
    }

    const today = new Date().toISOString().split("T")[0];
    const systemPrompt = buildSystemPrompt(today);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Build conversation contents
    const contents: GeminiContent[] = [
      ...history,
      { role: "user", parts: [{ text: userMessage }] },
    ];

    // Agentic loop — keep going until Gemini returns plain text (no more tool calls)
    const toolsUsed: string[] = [];

    for (let round = 0; round < 6; round++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          tools: HOTEL_TOOLS,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        return NextResponse.json(
          { error: err?.error?.message ?? `Gemini error ${res.status}` },
          { status: 500 }
        );
      }

      const data = await res.json() as {
        candidates?: Array<{
          content?: { role?: string; parts?: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> };
          finishReason?: string;
        }>;
      };

      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const toolCalls = parts.filter((p) => p.functionCall);

      // No more tool calls → return final text answer to client
      if (toolCalls.length === 0) {
        const text = parts.find((p) => p.text)?.text ?? "I couldn't generate a response.";
        return NextResponse.json({ text, toolsUsed });
      }

      // Append the model's tool-call turn to the conversation
      contents.push({
        role: "model",
        parts: parts.map((p) =>
          p.functionCall ? { functionCall: p.functionCall } : { text: p.text ?? "" }
        ) as GeminiPart[],
      });

      // Execute all requested tools in parallel
      const names = toolCalls.map((p) => p.functionCall!.name);
      toolsUsed.push(...names);

      const toolResults = await Promise.all(
        toolCalls.map(async (p) => {
          const { name, args } = p.functionCall!;
          try {
            const result = await executeTool(token, name, args);
            return { name, result };
          } catch (err) {
            return { name, result: { error: String(err) } };
          }
        })
      );

      // Feed tool results back into conversation
      contents.push({
        role: "user",
        parts: toolResults.map(({ name, result }) => ({
          functionResponse: { name, response: { content: result } },
        })),
      });
    }

    return NextResponse.json({ error: "Too many tool rounds without a final answer." }, { status: 500 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}