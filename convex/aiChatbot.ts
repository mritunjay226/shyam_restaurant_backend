import { query } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// AUTH HELPER — only "admin" role can use the AI chatbot
// ─────────────────────────────────────────────────────────────────
async function verifyAdmin(ctx: any, token: string) {
  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || Date.now() > session.expiresAt) {
    throw new Error("Unauthorized");
  }

  const staff = await ctx.db.get(session.staffId);
  if (!staff || !staff.isActive) throw new Error("Unauthorized");
  if (staff.role !== "admin") {
    throw new Error("AI Chatbot is restricted to the main admin.");
  }

  return staff;
}

// ─────────────────────────────────────────────────────────────────
// STATS SUMMARY
// Lightweight — just counts + today's revenue for the status bar.
// No raw rows sent to the client on every render.
// ─────────────────────────────────────────────────────────────────
export const getStatsSummary = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);

    const today = new Date().toISOString().split("T")[0];

    const [rooms, bills] = await Promise.all([
      ctx.db.query("rooms").collect(),
      ctx.db.query("bills").order("desc").collect(),
    ]);

    const occupied  = rooms.filter((r: any) => r.status === "occupied").length;
    const available = rooms.filter((r: any) => r.status === "available" && r.isActive).length;

    const todayRevenue = bills
      .filter((b: any) => b.createdAt?.startsWith(today))
      .reduce((s: number, b: any) => s + b.totalAmount, 0);

    return {
      today,
      rooms:   { total: rooms.length, occupied, available },
      revenue: { today: todayRevenue },
    };
  },
});

// ─────────────────────────────────────────────────────────────────
// TARGETED QUERIES
// The API route calls these on-demand based on what Gemini asks for.
// Each query only fetches the table(s) it needs, with filters applied
// server-side so the payload stays small.
// ─────────────────────────────────────────────────────────────────

export const getRoomsSummary = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);
    return ctx.db.query("rooms").collect();
  },
});

export const getBookings = query({
  args: {
    token:    v.string(),
    status:   v.optional(v.string()),  // "confirmed" | "checked_in" | "checked_out" | "cancelled"
    dateFrom: v.optional(v.string()),  // YYYY-MM-DD  (filters on checkIn)
    dateTo:   v.optional(v.string()),
    limit:    v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);
    let results = await ctx.db.query("bookings").order("desc").collect();

    if (args.status)   results = results.filter((b: any) => b.status === args.status);
    if (args.dateFrom) results = results.filter((b: any) => b.checkIn >= args.dateFrom!);
    if (args.dateTo)   results = results.filter((b: any) => b.checkIn <= args.dateTo!);

    return results.slice(0, args.limit ?? 50);
  },
});

export const getGuests = query({
  args: {
    token:  v.string(),
    search: v.optional(v.string()),  // partial name or phone
    limit:  v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);
    let guests = await ctx.db.query("guests").order("desc").collect();

    if (args.search) {
      const s = args.search.toLowerCase();
      guests = guests.filter(
        (g: any) => g.name.toLowerCase().includes(s) || g.phone.includes(s)
      );
    }

    return guests.slice(0, args.limit ?? 30);
  },
});

export const getBills = query({
  args: {
    token:    v.string(),
    dateFrom: v.optional(v.string()),  // YYYY-MM-DD
    dateTo:   v.optional(v.string()),
    billType: v.optional(v.string()),  // "room" | "restaurant" | "cafe" | "banquet"
    limit:    v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);
    let bills = await ctx.db.query("bills").order("desc").collect();

    if (args.billType) bills = bills.filter((b: any) => b.billType === args.billType);
    if (args.dateFrom) bills = bills.filter((b: any) => b.createdAt >= args.dateFrom!);
    if (args.dateTo)   bills = bills.filter((b: any) => b.createdAt.slice(0, 10) <= args.dateTo!);

    return bills.slice(0, args.limit ?? 100);
  },
});

export const getOrders = query({
  args: {
    token:    v.string(),
    outlet:   v.optional(v.string()),  // "restaurant" | "cafe"
    dateFrom: v.optional(v.string()),
    dateTo:   v.optional(v.string()),
    limit:    v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);
    let orders = await ctx.db
      .query("orders")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    if (args.outlet)   orders = orders.filter((o: any) => o.outlet === args.outlet);
    if (args.dateFrom) orders = orders.filter((o: any) => o.createdAt >= args.dateFrom!);
    if (args.dateTo)   orders = orders.filter((o: any) => o.createdAt.slice(0, 10) <= args.dateTo!);

    return orders.slice(0, args.limit ?? 50);
  },
});

export const getMenuItems = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);
    return ctx.db.query("menuItems").collect();
  },
});

export const getBanquetData = query({
  args: {
    token:    v.string(),
    dateFrom: v.optional(v.string()),
    dateTo:   v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);
    const halls = await ctx.db.query("banquetHalls").collect();
    let bookings = await ctx.db.query("banquetBookings").order("desc").collect();

    if (args.dateFrom) bookings = bookings.filter((b: any) => b.eventDate >= args.dateFrom!);
    if (args.dateTo)   bookings = bookings.filter((b: any) => b.eventDate <= args.dateTo!);

    return { halls, bookings };
  },
});

export const getStaff = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);
    const all = await ctx.db.query("staff").collect();
    return all.map(({ pin: _pin, ...rest }: any) => rest);  // strip PINs
  },
});

export const getAuditLog = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);
    return ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const getHotelSettings = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);
    return ctx.db.query("hotelSettings").collect();
  },
});