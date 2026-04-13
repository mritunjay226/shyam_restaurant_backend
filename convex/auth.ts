import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// SECURITY HELPERS
// ─────────────────────────────────────────────────────────────────

/** SHA-256 hash of PIN + static salt. Runs in the Convex V8 runtime. */
async function hashPin(pin: string): Promise<string> {
  const buf = new TextEncoder().encode(pin + ":shyam_hotel_2025");
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Write a record to the audit log. Never throws — failures are silent. */
async function audit(ctx: any, staffId: any, action: string, details?: string) {
  try {
    await ctx.db.insert("auditLog", { staffId, action, details: details ?? "", timestamp: Date.now() });
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────
// ONE-TIME MIGRATION — hash all plain-text PINs
// Safe to call multiple times: skips records that are already hashed
// (SHA-256 hex digest is always exactly 64 chars; plain PINs are 4)
// ─────────────────────────────────────────────────────────────────

export const migrateHashAllPins = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("staff").collect();
    let migrated = 0;
    for (const staff of all) {
      // Already hashed → skip
      if (staff.pin.length === 64) continue;
      const hashed = await hashPin(staff.pin);
      await ctx.db.patch(staff._id, { pin: hashed, failedAttempts: 0 });
      migrated++;
    }
    return { migrated, total: all.length };
  },
});

// ─────────────────────────────────────────────────────────────────
// EMERGENCY PIN RESET  (remove after login is confirmed working)
// ─────────────────────────────────────────────────────────────────
export const emergencyResetPin = mutation({
  args: { staffName: v.string(), newPin: v.string() },
  handler: async (ctx, args) => {
    const staff = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("name"), args.staffName))
      .first();
    if (!staff) throw new Error(`Staff "${args.staffName}" not found`);
    const hashed = await hashPin(args.newPin);
    await ctx.db.patch(staff._id, { pin: hashed, failedAttempts: 0, lockedUntil: undefined });
    return { success: true, name: staff.name, role: staff.role };
  },
});

// ─────────────────────────────────────────────────────────────────
// INITIAL SETUP
// ─────────────────────────────────────────────────────────────────

export const setupInitialAdmin = mutation({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    const existingStaff = await ctx.db.query("staff").first();
    if (existingStaff) throw new Error("System already initialized.");
    const hashed = await hashPin(args.pin);
    await ctx.db.insert("staff", {
      name: "Super Admin",
      pin: hashed,
      role: "admin",
      isActive: true,
      failedAttempts: 0,
    });
    return true;
  },
});

// ─────────────────────────────────────────────────────────────────
// PUBLIC QUERIES
// ─────────────────────────────────────────────────────────────────

/** Returns active staff names/roles — strips PINs and security fields. */
export const getActiveStaffNames = query({
  args: {},
  handler: async (ctx) => {
    const staffList = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return staffList.map((s) => ({
      _id: s._id,
      name: s.name,
      role: s.role,
      isLocked: !!(s.lockedUntil && Date.now() < s.lockedUntil),
    }));
  },
});

/** Validates a session token and returns the staff document or null. */
export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || Date.now() > session.expiresAt) return null;
    const staff = await ctx.db.get(session.staffId);
    if (!staff || !staff.isActive) return null;
    return staff;
  },
});

// ─────────────────────────────────────────────────────────────────
// AUTH MUTATIONS
// ─────────────────────────────────────────────────────────────────

export const loginWithPin = mutation({
  args: { pin: v.string(), staffId: v.optional(v.id("staff")) },
  handler: async (ctx, args) => {
    if (!args.staffId) throw new ConvexError("Please select your name first.");

    const staff = await ctx.db.get(args.staffId);
    if (!staff || !staff.isActive) throw new ConvexError("Account not found or inactive.");

    // ── Brute-force lockout check ──
    if (staff.lockedUntil && Date.now() < staff.lockedUntil) {
      const remaining = Math.ceil((staff.lockedUntil - Date.now()) / 60000);
      throw new ConvexError(`Account locked. Try again in ${remaining} minute(s).`);
    }

    // ── PIN verification ──
    const hashedInput = await hashPin(args.pin);
    if (hashedInput !== staff.pin) {
      const attempts = (staff.failedAttempts ?? 0) + 1;
      const isNowLocked = attempts >= 5;
      await ctx.db.patch(staff._id, {
        failedAttempts: attempts,
        ...(isNowLocked ? { lockedUntil: Date.now() + 10 * 60 * 1000 } : {}),
      });
      await audit(ctx, staff._id, "login_failed", `Attempt ${attempts}/5`);
      if (isNowLocked) throw new ConvexError("Account locked for 10 minutes after 5 failed attempts.");
      throw new ConvexError(`Incorrect PIN. ${5 - attempts} attempt(s) remaining.`);
    }

    // ── Success: reset counters ──
    await ctx.db.patch(staff._id, { failedAttempts: 0, lockedUntil: undefined });

    // ── Single-device: kill existing sessions ──
    const existing = await ctx.db
      .query("authSessions")
      .withIndex("by_staff", (q) => q.eq("staffId", staff._id))
      .collect();
    for (const s of existing) await ctx.db.delete(s._id);

    // ── Create new 24h session ──
    const token = crypto.randomUUID();
    await ctx.db.insert("authSessions", {
      token,
      staffId: staff._id,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    await audit(ctx, staff._id, "login", `Role: ${staff.role}`);
    return { token, staff };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (session) {
      await audit(ctx, session.staffId, "logout");
      await ctx.db.delete(session._id);
    }
  },
});

// ─────────────────────────────────────────────────────────────────
// RBAC
// ─────────────────────────────────────────────────────────────────

export const getRolePermissions = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("roleConfig").collect();
    if (configs.length === 0) {
      return [
        { role: "admin",     allowedPaths: ["/", "/kitchen", "/restaurant", "/cafe", "/billing", "/rooms", "/banquet", "/reports", "/settings"] },
        { role: "manager",   allowedPaths: ["/", "/kitchen", "/restaurant", "/cafe", "/billing", "/rooms", "/banquet", "/reports"] },
        { role: "reception", allowedPaths: ["/cafe", "/billing", "/rooms"] },
        { role: "kitchen",   allowedPaths: ["/kitchen"] },
      ];
    }
    return configs;
  },
});

export const updateRolePermissions = mutation({
  args: { token: v.string(), role: v.string(), allowedPaths: v.array(v.string()) },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (!session || Date.now() > session.expiresAt) throw new Error("Unauthorized");
    const admin = await ctx.db.get(session.staffId);
    if (!admin || !admin.isActive || admin.role !== "admin") throw new Error("Requires Super Admin");

    const existing = await ctx.db
      .query("roleConfig")
      .withIndex("by_role", (q: any) => q.eq("role", args.role))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { allowedPaths: args.allowedPaths });
    } else {
      await ctx.db.insert("roleConfig", { role: args.role, allowedPaths: args.allowedPaths });
    }
  },
});

// ─────────────────────────────────────────────────────────────────
// AUDIT LOG (admin-only read)
// ─────────────────────────────────────────────────────────────────

export const getAuditLog = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!session || Date.now() > session.expiresAt) return [];
    const admin = await ctx.db.get(session.staffId);
    if (!admin || admin.role !== "admin") return [];

    const logs = await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .take(200);

    return await Promise.all(
      logs.map(async (log) => {
        const s = await ctx.db.get(log.staffId);
        return { ...log, staffName: s?.name ?? "Unknown" };
      })
    );
  },
});

// Export hashPin so other mutations can use it
export { hashPin };
