// app/api/ai-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

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
          "Get complete room booking history and occupancy logs. Filter by status, dates, room number, or guest name. Use to find past occupants, current guests, or future arrivals.",
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
            roomNumber: {
              type: "string",
              description: "Filter by specific room number (e.g. '101')",
            },
            guestName: {
              type: "string",
              description: "Partial search for guest name",
            },
            activeOnDate: {
              type: "string",
              description: "Find who was occupying the room on this specific date (YYYY-MM-DD)",
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
// deploy trigger comment
function buildSystemPrompt(today: string): string {
  return `Role: Hotel Admin AI. Date: ${today}.
Rules:
1. NO hallucinations. ALWAYS query tools using the tightest filters (dates/status/search).
2. Dates: Use 'dateFrom'/'dateTo' for ranges. Use 'activeOnDate' for specific days.
3. History: For "all past occupants" or "room history", query 'getBookings' with 'roomNumber' and NO date filters.
3. Format: Clean Markdown. Match user language (Eng/Hindi/Hinglish). Be honest if data is missing.
4. Currency: Rs. with Indian commas (e.g., Rs. 1,20,000).
5. Security: NEVER mention staff PINs.

Tools:
- getRoomsSummary: Availability/occupancy
- getBookings: Check-ins/outs, arrivals, occupancy (requires dates/status)
- getGuests: Lookup by name/phone
- getBills: Revenue/payments (requires dateFrom, dateTo)
- getOrders: Rest./cafe orders (requires outlet, dates)
- getMenuItems: Menus, prices, best sellers
- getBanquetData: Events/halls (requires dates)
- getStaff: Staff/roles
- getAuditLog: Recent activity
- getHotelSettings: Name, GST, timings

MD Table Schemas (Mandatory for lists):
- Guests: Name | Phone | Total Visits | Total Spend
- Rooms: Room No. | Category | Floor | Tariff | Current Status
- Bookings: Guest Name | Room No. | Check-In | Check-Out | Status`;
}

async function executeTool(
  token: string,
  toolName: string,
  toolArgs: Record<string, unknown>
): Promise<unknown> {
  const base = { token, ...toolArgs } as any;

  switch (toolName) {
    case "getRoomsSummary": {
      const rooms = await convex.query(api.aiChatbot.getRoomsSummary, { token }) as any[];
      // Strip Convex metadata and irrelevant fields to save massive tokens
      return rooms.map(r => ({
        roomNo: r.roomNumber,
        status: r.status,
        cat: r.category,
        tariff: r.tariff
      }));
    }
    case "getGuests": {
      const guests = await convex.query(api.aiChatbot.getGuests, base) as any[];
      return guests.map(g => ({
        name: g.name,
        phone: g.phone,
        visits: g.totalVisits,
        spend: g.totalSpend
      }));
    }
    case "getBookings": {
      const bookings = await convex.query(api.aiChatbot.getBookings, base) as any[];
      return bookings.map(b => ({
        guest: b.guestName,
        room: b.roomNumber || "N/A",
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        status: b.status,
        total: b.totalAmount
      }));
    }
    case "getBills": {
      const bills = await convex.query(api.aiChatbot.getBills, base) as any[];
      return bills.map(b => ({
        guest: b.guestName,
        type: b.billType,
        total: b.totalAmount,
        method: b.paymentMethod,
        date: b.createdAt.slice(0, 10)
      }));
    }
    case "getOrders": {
      const orders = await convex.query(api.aiChatbot.getOrders, base) as any[];
      return orders.map(o => ({
        id: o.kotNumber || "N/A",
        outlet: o.outlet,
        table: o.tableNumber,
        total: o.totalAmount,
        status: o.status,
        items: o.items.map((i: any) => `${i.name} x${i.quantity}`).join(", ")
      }));
    }
    case "getMenuItems": {
        const items = await convex.query(api.aiChatbot.getMenuItems, { token }) as any[];
        return items.map(i => ({
          name: i.name,
          cat: i.category,
          price: i.price,
          outlet: i.outlet,
          available: i.isAvailable
        }));
    }
    case "getBanquetData": {
      const data = await convex.query(api.aiChatbot.getBanquetData, base) as any;
      return {
        halls: data.halls.map((h: any) => ({ name: h.name, capacity: h.capacity, price: h.price })),
        bookings: data.bookings.map((b: any) => ({ event: b.eventName, date: b.eventDate, guest: b.guestName, status: b.status }))
      };
    }
    case "getStaff": {
      const staff = await convex.query(api.aiChatbot.getStaff, { token }) as any[];
      return staff.map(s => ({ name: s.name, role: s.role, active: s.isActive }));
    }
    case "getAuditLog": {
      const logs = await convex.query(api.aiChatbot.getAuditLog, base) as any[];
      return logs.map(l => ({ action: l.action, details: l.details, time: new Date(l.timestamp).toLocaleString() }));
    }
    case "getHotelSettings": {
      const settings = await convex.query(api.aiChatbot.getHotelSettings, { token }) as any[];
      return settings[0] || {}; // Return first config
    }
    default: throw new Error(`Unknown tool: ${toolName}`);
  }
}

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: { content: unknown } } };

type GeminiContent = { role: string; parts: GeminiPart[] };

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

    const contents: GeminiContent[] = [
      ...history,
      { role: "user", parts: [{ text: userMessage }] },
    ];

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

      if (toolCalls.length === 0) {
        const text = parts.find((p) => p.text)?.text ?? "I couldn't generate a response.";
        return NextResponse.json({ text, toolsUsed });
      }

      contents.push({
        role: "model",
        parts: parts.map((p) =>
          p.functionCall ? { functionCall: p.functionCall } : { text: p.text ?? "" }
        ) as GeminiPart[],
      });

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