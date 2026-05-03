import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function verifyAdminAuth(ctx: any, token: string) {
  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session || Date.now() > session.expiresAt) throw new Error("Unauthorized");
  const staff = await ctx.db.get(session.staffId);
  if (!staff || !staff.isActive) throw new Error("Unauthorized");
  if (staff.role !== "admin" && staff.role !== "manager") {
    throw new Error("Requires admin/manager access");
  }
  return staff;
}

/** Mark attendance for multiple staff members for a specific date */
export const markDailyAttendance = mutation({
  args: {
    token: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    records: v.array(v.object({
      staffId: v.id("staff"),
      status: v.string(), // "present", "absent", "half_day", "paid_leave"
      notes: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);

    for (const record of args.records) {
      // Check if entry already exists
      const existing = await ctx.db
        .query("attendance")
        .withIndex("by_staff_date", (q) => 
          q.eq("staffId", record.staffId).eq("date", args.date)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { 
          status: record.status, 
          notes: record.notes 
        });
      } else {
        await ctx.db.insert("attendance", {
          staffId: record.staffId,
          date: args.date,
          status: record.status,
          notes: record.notes,
        });
      }
    }
    return { success: true };
  },
});

/** Get attendance for all staff on a specific date */
export const getDateAttendance = query({
  args: { token: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);
    return await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
  },
});

/** Get monthly summary for all staff */
export const getMonthlyAttendance = query({
  args: { token: v.string(), month: v.string() }, // "YYYY-MM"
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);
    const allRecords = await ctx.db
      .query("attendance")
      .collect(); // In production with many years of data, we'd filter by range
    
    return allRecords.filter(r => r.date.startsWith(args.month));
  },
});
