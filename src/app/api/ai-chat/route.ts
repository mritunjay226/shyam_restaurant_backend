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
          "Get all hotel rooms with their current status (available / occupied / pending_checkout), category, tariff, floor, and amenities. " +
          "Use for: room availability queries, occupancy rate calculations, room-type breakdowns, floor-wise summaries, tariff comparisons. " +
          "Always call this first when the user asks anything about rooms, occupancy, or availability.",
      },
      {
        name: "getBookings",
        description:
          "Get booking records filtered by status, date range, room number, or guest name. " +
          "Use for: finding current guests (status=checked_in), upcoming arrivals (status=confirmed), past stays (status=checked_out), " +
          "room history (roomNumber only, no date filter), who was in a room on a specific day (activeOnDate), or cancellations. " +
          "IMPORTANT: For revenue from bookings, also call getBills with billType=room. " +
          "Chain with getGuests if you need guest profile details after finding a booking.",
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["confirmed", "checked_in", "checked_out", "cancelled"],
              description: "Filter by booking status. Omit to get all statuses.",
            },
            dateFrom: {
              type: "string",
              description: "Start of check-in date range in YYYY-MM-DD format.",
            },
            dateTo: {
              type: "string",
              description: "End of check-in date range in YYYY-MM-DD format.",
            },
            roomNumber: {
              type: "string",
              description: "Filter by specific room number e.g. '101'. Use alone (no dates) for full room history.",
            },
            guestName: {
              type: "string",
              description: "Partial search for guest name.",
            },
            activeOnDate: {
              type: "string",
              description:
                "Return only bookings that were active (checked in) on this specific date (YYYY-MM-DD). " +
                "Use for 'who was in room X on date Y' or 'occupancy on a specific date'.",
            },
            limit: {
              type: "number",
              description: "Max records to return. Default 50. Use 200+ for monthly reports.",
            },
          },
        },
      },
      {
        name: "getGuests",
        description:
          "Search guest profiles by name or phone number. Returns visit count and total lifetime spend. " +
          "Use for: guest lookup, VIP identification (high spend/visits), finding a guest's contact details, " +
          "or verifying a guest exists before looking up their bookings. " +
          "Chain with getBookings (guestName filter) if you need their stay history.",
        parameters: {
          type: "object",
          properties: {
            search: {
              type: "string",
              description: "Partial guest name or phone number. Leave empty to get all guests.",
            },
            limit: {
              type: "number",
              description: "Max records to return. Default 30.",
            },
          },
        },
      },
      {
        name: "getBills",
        description:
          "Get finalized bills by date range and/or outlet type. " +
          "Use for: daily/weekly/monthly revenue, payment method breakdown (cash vs card vs UPI), " +
          "outlet-wise revenue split, GST reports, and total collections. " +
          "IMPORTANT: Always provide both dateFrom and dateTo for any revenue/financial question. " +
          "To get total hotel revenue, call this FOUR times: billType=room, restaurant, cafe, banquet — or once without billType to get all. " +
          "Chain with getOrders for itemised food & beverage breakdown.",
        parameters: {
          type: "object",
          properties: {
            dateFrom: {
              type: "string",
              description: "Start date in YYYY-MM-DD format (inclusive).",
            },
            dateTo: {
              type: "string",
              description: "End date in YYYY-MM-DD format (inclusive).",
            },
            billType: {
              type: "string",
              enum: ["room", "restaurant", "cafe", "banquet"],
              description: "Filter bills by outlet. Omit to get all outlets combined.",
            },
            limit: {
              type: "number",
              description: "Max records. Default 100. Use 500+ for monthly reports.",
            },
          },
        },
      },
      {
        name: "getOrders",
        description:
          "Get restaurant or cafe KOTs/orders filtered by outlet and date range. " +
          "Use for: order history, table-wise analysis, popular items (chain with getMenuItems), " +
          "F&B revenue breakdown, and pending/open orders. " +
          "IMPORTANT: Always specify outlet (restaurant or cafe). For best-sellers, call getMenuItems in parallel.",
        parameters: {
          type: "object",
          properties: {
            outlet: {
              type: "string",
              enum: ["restaurant", "cafe"],
              description: "Which outlet to query. Always specify this.",
            },
            dateFrom: {
              type: "string",
              description: "Start date in YYYY-MM-DD format.",
            },
            dateTo: {
              type: "string",
              description: "End date in YYYY-MM-DD format.",
            },
            limit: {
              type: "number",
              description: "Max records. Default 50.",
            },
          },
        },
      },
      {
        name: "getMenuItems",
        description:
          "Get all menu items with name, category, outlet, price, and availability status. " +
          "Use for: menu display, price lookup, item availability, and best-seller analysis when combined with getOrders. " +
          "To find top sellers: call both getMenuItems and getOrders, then aggregate item quantities from orders.",
      },
      {
        name: "getBanquetData",
        description:
          "Get banquet halls (capacity, pricing) and their event bookings filtered by event date range. " +
          "Use for: upcoming events, hall availability on a date, banquet revenue, event guest lists. " +
          "Always provide dateFrom/dateTo unless asking about hall configurations only.",
        parameters: {
          type: "object",
          properties: {
            dateFrom: {
              type: "string",
              description: "Start event date in YYYY-MM-DD format.",
            },
            dateTo: {
              type: "string",
              description: "End event date in YYYY-MM-DD format.",
            },
          },
        },
      },
      {
        name: "getStaff",
        description:
          "Get all staff members with name, role, and active/inactive status. PINs are stripped. " +
          "Use for: staff directory, role-based queries (e.g. 'who are the receptionists'), headcount, active vs inactive staff.",
      },
      {
        name: "getAuditLog",
        description:
          "Get recent staff activity log: logins, logouts, check-ins, check-outs, order creation, bill generation, etc. " +
          "Use for: tracking who performed an action, recent hotel activity, shift summaries.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of most recent entries (default 50, max 200).",
            },
          },
        },
      },
      {
        name: "getHotelSettings",
        description:
          "Get hotel configuration: name, address, phone, GST rates (CGST/SGST), check-in time, check-out time, and other system settings. " +
          "Use when the user asks about hotel details, GST rates, or official timings.",
      },
    ],
  },
];

function buildSystemPrompt(today: string): string {
  const d = new Date(today);
  const fmt = (dt: Date) => dt.toISOString().split("T")[0];
  const yesterday = fmt(new Date(d.getTime() - 86400000));
  const last7 = fmt(new Date(d.getTime() - 6 * 86400000));
  const last30 = fmt(new Date(d.getTime() - 29 * 86400000));
  const monthStart = `${today.slice(0, 8)}01`;
  const prevMonthEnd = fmt(new Date(d.getFullYear(), d.getMonth(), 0));
  const prevMonthStart = fmt(new Date(d.getFullYear(), d.getMonth() - 1, 1));

  return `You are SarovarOs, an elite executive AI assistant for Sarovar Palace. You have real-time access to the entire hotel PMS and POS database.
Today's Date: ${today}.

# TEMPORAL CONTEXT
- Today: ${today}
- Yesterday: ${yesterday}
- This Month: ${monthStart} to ${today}
- Last 7 Days: ${last7} to ${today}
- Last Month: ${prevMonthStart} to ${prevMonthEnd}

# CORE BEHAVIOR & RULES
1. **Absolute Accuracy**: NEVER hallucinate or guess metrics. If a query returns no data, explicitly state "No records found" and suggest an alternate search (e.g., widening the date range).
2. **Proactive Intelligence**: Go beyond basic retrieval. If asked for today's revenue, provide the breakdown (Cash vs UPI vs Card) and casually note any anomaly (e.g., "Banquet sales drove a significant spike"). If looking up a guest, mention if they are a VIP based on total spend or visits.
3. **Advanced Tool Chaining**: Combine tools seamlessly to answer complex human queries:
   - *Example: "Phone number of guest in 101?"* -> Call \`getBookings\`(roomNumber: "101", status: "checked_in"), extract guest name, then call \`getGuests\`(search: guestName) to get the phone number.
   - *Example: "Top selling food today?"* -> Call \`getOrders\`(outlet: "restaurant", dates) AND \`getMenuItems\`(), correlate the data, and summarize the best sellers.
   - *Example: "Hotel Total Revenue"* -> Call \`getBills\`(dateFrom, dateTo) without passing a billType to fetch global collections.
4. **Data Integrity**: Staff PINs, database IDs, and raw system keys are strictly confidential. NEVER reveal them under any circumstance.
5. **Language Flexibility**: Fluently match the user's language (English, pure Hindi, or casual Hinglish) while maintaining a deeply professional tone.

# FORMATTING & DESIGN
- **Boardroom-Ready Format**: Use beautiful, elegant Markdown. Lead your response with the most critical answer or key figure immediately.
- **Emphasis**: Use **bolding** heavily for key metrics (e.g., **₹45,500**, **82% Occupancy**, **Room 101**).
- **Tabular Data**: Use extremely clean Markdown tables anytime you are listing 3 or more items, guests, or bills.
- **Currency**: Always format money strictly as Indian Rupees using commas (e.g., ₹ X,XX,XXX).
- **Graceful Failures**: If a specific tool fails or times out, gracefully present the insightful data you *did* manage to gather, and lightly note what couldn't be retrieved.

Anticipate the hotel manager's needs. Deliver concise, razor-sharp, and boardroom-ready insights.`;
}

async function executeTool(
  token: string,
  toolName: string,
  toolArgs: Record<string, unknown>
): Promise<unknown> {
  const base = { token, ...toolArgs } as Record<string, unknown>;

  switch (toolName) {
    case "getRoomsSummary": {
      const rooms = (await convex.query(api.aiChatbot.getRoomsSummary, { token })) as Array<{
        roomNumber: string;
        status: string;
        category: string;
        tariff: number;
        floor?: number | string;
        amenities?: string[];
      }>;
      return rooms.map((r) => ({
        roomNo: r.roomNumber,
        status: r.status,
        category: r.category,
        tariff: r.tariff,
        floor: r.floor ?? null,
      }));
    }

    case "getGuests": {
      const guests = (await convex.query(api.aiChatbot.getGuests, base as { limit?: number; search?: string; token: string })) as Array<{
        name: string;
        phone: string;
        totalVisits: number;
        totalSpend: number;
        email?: string;
      }>;
      return guests.map((g) => ({
        name: g.name,
        phone: g.phone,
        email: g.email ?? null,
        visits: g.totalVisits,
        spend: g.totalSpend,
      }));
    }

    case "getBookings": {
      const bookings = (await convex.query(api.aiChatbot.getBookings, base as { status?: string; limit?: number; dateFrom?: string; roomNumber?: string; guestName?: string; dateTo?: string; activeOnDate?: string; token: string })) as Array<{
        guestName: string;
        roomNumber?: string;
        checkIn: string;
        checkOut: string;
        status: string;
        totalAmount: number;
        adults?: number;
        children?: number;
        paymentMethod?: string;
      }>;
      return bookings.map((b) => ({
        guest: b.guestName,
        room: b.roomNumber ?? "N/A",
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        status: b.status,
        total: b.totalAmount,
        guests: [b.adults ?? 1, b.children ?? 0].join("A+") + "C",
        payment: b.paymentMethod ?? null,
      }));
    }

    case "getBills": {
      const bills = (await convex.query(api.aiChatbot.getBills, base as { limit?: number; dateFrom?: string; billType?: string; dateTo?: string; token: string })) as Array<{
        guestName: string;
        billType: string;
        totalAmount: number;
        paymentMethod: string;
        createdAt: string;
        gstAmount?: number;
      }>;
      return bills.map((b) => ({
        guest: b.guestName,
        type: b.billType,
        total: b.totalAmount,
        gst: b.gstAmount ?? null,
        method: b.paymentMethod,
        date: b.createdAt.slice(0, 10),
      }));
    }

    case "getOrders": {
      const orders = (await convex.query(api.aiChatbot.getOrders, base as { limit?: number; dateFrom?: string; outlet?: string; dateTo?: string; token: string })) as Array<{
        kotNumber?: string;
        outlet: string;
        tableNumber?: string;
        totalAmount: number;
        status: string;
        items: Array<{ name: string; quantity: number; price?: number }>;
        createdAt?: string;
      }>;
      return orders.map((o) => ({
        kot: o.kotNumber ?? "N/A",
        outlet: o.outlet,
        table: o.tableNumber ?? null,
        total: o.totalAmount,
        status: o.status,
        date: o.createdAt?.slice(0, 10) ?? null,
        items: o.items.map((i) => ({
          name: i.name,
          qty: i.quantity,
          price: i.price ?? null,
        })),
      }));
    }

    case "getMenuItems": {
      const items = (await convex.query(api.aiChatbot.getMenuItems, { token })) as Array<{
        name: string;
        category: string;
        price: number;
        outlet: string;
        isAvailable: boolean;
        description?: string;
      }>;
      return items.map((i) => ({
        name: i.name,
        category: i.category,
        price: i.price,
        outlet: i.outlet,
        available: i.isAvailable,
      }));
    }

    case "getBanquetData": {
      const data = (await convex.query(api.aiChatbot.getBanquetData, base as { dateFrom?: string; dateTo?: string; token: string })) as {
        halls: Array<{ name: string; capacity: number; price: number; amenities?: string[] }>;
        bookings: Array<{
          eventName: string;
          eventDate: string;
          guestName: string;
          status: string;
          amount?: number;
          attendees?: number;
        }>;
      };
      return {
        halls: data.halls.map((h) => ({
          name: h.name,
          capacity: h.capacity,
          price: h.price,
        })),
        bookings: data.bookings.map((b) => ({
          event: b.eventName,
          date: b.eventDate,
          guest: b.guestName,
          status: b.status,
          amount: b.amount ?? null,
          attendees: b.attendees ?? null,
        })),
      };
    }

    case "getStaff": {
      const staff = (await convex.query(api.aiChatbot.getStaff, { token })) as Array<{
        name: string;
        role: string;
        isActive: boolean;
      }>;
      return staff.map((s) => ({
        name: s.name,
        role: s.role,
        active: s.isActive,
      }));
    }

    case "getAuditLog": {
      const logs = (await convex.query(api.aiChatbot.getAuditLog, base as { limit?: number; token: string })) as Array<{
        action: string;
        details?: string;
        staffName?: string;
        timestamp: number;
      }>;
      return logs.map((l) => ({
        action: l.action,
        staff: l.staffName ?? null,
        details: l.details ?? null,
        time: new Date(l.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      }));
    }

    case "getHotelSettings": {
      const settings = (await convex.query(api.aiChatbot.getHotelSettings, { token })) as Array<
        Record<string, unknown>
      >;
      return settings[0] ?? {};
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
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
      history: GeminiContent[];
      userMessage: string;
    };

    const apiKey = process.env.GEMINI_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_KEY not set on server" }, { status: 500 });
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const systemPrompt = buildSystemPrompt(today);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

    const contents: GeminiContent[] = [
      ...history,
      { role: "user", parts: [{ text: userMessage }] },
    ];

    const toolsUsed: string[] = [];

    for (let round = 0; round < 8; round++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          tools: HOTEL_TOOLS,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2500,
          },
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        return NextResponse.json(
          { error: err?.error?.message ?? `Gemini error ${res.status}` },
          { status: 500 }
        );
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            role?: string;
            parts?: Array<{
              text?: string;
              functionCall?: { name: string; args: Record<string, unknown> };
            }>;
          };
          finishReason?: string;
        }>;
      };

      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const toolCalls = parts.filter((p) => p.functionCall);

      if (toolCalls.length === 0) {
        const text =
          parts.find((p) => p.text)?.text?.trim() ??
          "I was unable to generate a response. Please try rephrasing your question.";
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

      const toolResults = await Promise.allSettled(
        toolCalls.map(async (p) => {
          const { name, args } = p.functionCall!;
          const result = await executeTool(token, name, args);
          return { name, result };
        })
      );

      contents.push({
        role: "user",
        parts: toolResults.map((settled, i) => {
          const name = toolCalls[i].functionCall!.name;
          const result =
            settled.status === "fulfilled"
              ? settled.value.result
              : { error: `Tool failed: ${(settled.reason as Error)?.message ?? "unknown error"}` };
          return {
            functionResponse: {
              name,
              response: { content: result },
            },
          };
        }),
      });
    }

    return NextResponse.json(
      { error: "The query required too many data lookups. Please try a more specific question." },
      { status: 500 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}