import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Hash helper — duplicated here so staff.ts has no circular import from auth.ts
async function hashPin(pin: string): Promise<string> {
  const buf = new TextEncoder().encode(pin + ":shyam_hotel_2025");
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

export const getAllStaff = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);
    const staff = await ctx.db.query("staff").collect();
    // Strip the hashed pin from the response
    return staff.map(({ pin, ...rest }) => rest);
  },
});

export const createStaff = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    pin: v.string(),
    role: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);

    const hashed = await hashPin(args.pin);

    // Ensure PIN hash is unique
    const existing = await ctx.db
      .query("staff")
      .withIndex("by_pin", (q: any) => q.eq("pin", hashed))
      .first();
    if (existing) throw new Error("This PIN is already in use by another staff member.");

    return await ctx.db.insert("staff", {
      name: args.name,
      pin: hashed,
      role: args.role,
      isActive: args.isActive,
      failedAttempts: 0,
    });
  },
});

export const updateStaff = mutation({
  args: {
    token: v.string(),
    staffId: v.id("staff"),
    name: v.optional(v.string()),
    pin: v.optional(v.string()),       // plain PIN — will be hashed here
    role: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);

    const updates: Record<string, any> = {};
    if (args.name !== undefined)     updates.name = args.name;
    if (args.role !== undefined)     updates.role = args.role;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    if (args.pin) {
      const hashed = await hashPin(args.pin);
      // Ensure uniqueness
      const existing = await ctx.db
        .query("staff")
        .withIndex("by_pin", (q: any) => q.eq("pin", hashed))
        .first();
      if (existing && existing._id !== args.staffId) {
        throw new Error("This PIN is already in use by another staff member.");
      }
      updates.pin = hashed;
    }

    await ctx.db.patch(args.staffId, updates);
  },
});

/** Admin can manually unlock a locked staff account */
export const unlockStaff = mutation({
  args: { token: v.string(), staffId: v.id("staff") },
  handler: async (ctx, args) => {
    const admin = await verifyAdminAuth(ctx, args.token);
    if (admin.role !== "admin") throw new Error("Only admins can unlock accounts.");
    await ctx.db.patch(args.staffId, { failedAttempts: 0, lockedUntil: undefined });
  },
});

/** Soft-delete: deactivate so historical records don't break */
export const deleteStaff = mutation({
  args: { token: v.string(), staffId: v.id("staff") },
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);
    await ctx.db.patch(args.staffId, { isActive: false });
  },
});
