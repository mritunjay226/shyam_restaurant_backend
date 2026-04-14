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
// MASTER DATA DUMP
// Returns a full snapshot of all tables so the AI can answer any
// question about revenue, guests, bookings, orders, banquets, etc.
// ─────────────────────────────────────────────────────────────────
export const getAllDataForAI = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx, args.token);

    const [
      rooms,
      bookings,
      guests,
      menuItems,
      orders,
      banquetHalls,
      banquetBookings,
      bills,
      allStaff,
      hotelSettings,
      auditLog,
    ] = await Promise.all([
      ctx.db.query("rooms").collect(),
      ctx.db.query("bookings").order("desc").collect(),
      ctx.db.query("guests").order("desc").collect(),
      ctx.db.query("menuItems").collect(),
      ctx.db.query("orders").withIndex("by_created_at").order("desc").collect(),
      ctx.db.query("banquetHalls").collect(),
      ctx.db.query("banquetBookings").order("desc").collect(),
      ctx.db.query("bills").order("desc").collect(),
      ctx.db.query("staff").collect(),
      ctx.db.query("hotelSettings").collect(),
      ctx.db
        .query("auditLog")
        .withIndex("by_timestamp")
        .order("desc")
        .take(200),
    ]);

    // Strip hashed PINs before returning to client
    const staff = allStaff.map(({ pin: _pin, ...rest }: any) => rest);

    return {
      rooms,
      bookings,
      guests,
      menuItems,
      orders,
      banquetHalls,
      banquetBookings,
      bills,
      staff,
      hotelSettings,
      auditLog,
      fetchedAt: new Date().toISOString(),
    };
  },
});