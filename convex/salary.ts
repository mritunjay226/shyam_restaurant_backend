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

/** Set or Update staff financial information */
export const updateStaffSalaryInfo = mutation({
  args: {
    token: v.string(),
    staffId: v.id("staff"),
    baseSalary: v.optional(v.number()),
    joiningDate: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountNo: v.optional(v.string()),
    ifsc: v.optional(v.string()),
    upiId: v.optional(v.string()),
    paidLeavesPerMonth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);
    
    const updates: any = {};
    if (args.baseSalary !== undefined) updates.baseSalary = args.baseSalary;
    if (args.joiningDate !== undefined) updates.joiningDate = args.joiningDate;
    if (args.bankName !== undefined) updates.bankName = args.bankName;
    if (args.accountNo !== undefined) updates.accountNo = args.accountNo;
    if (args.ifsc !== undefined) updates.ifsc = args.ifsc;
    if (args.upiId !== undefined) updates.upiId = args.upiId;
    if (args.paidLeavesPerMonth !== undefined) updates.paidLeavesPerMonth = args.paidLeavesPerMonth;
    
    await ctx.db.patch(args.staffId, updates);
    return { success: true };
  },
});

/** Record a cash advance given to a staff member */
export const recordStaffAdvance = mutation({
  args: {
    token: v.string(),
    staffId: v.id("staff"),
    amount: v.number(),
    reason: v.optional(v.string()),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);
    return await ctx.db.insert("staffAdvances", {
      staffId: args.staffId,
      amount: args.amount,
      date: args.date,
      reason: args.reason,
      status: "pending",
    });
  },
});

/** Compute payroll details for a month */
export const getMonthlyPayrollSnapshot = query({
  args: { token: v.string(), month: v.string() }, // "YYYY-MM"
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);
    
    const staff = await ctx.db.query("staff").collect();
    const attendance = await ctx.db.query("attendance").collect();
    const advances = await ctx.db.query("staffAdvances").filter(q => q.eq(q.field("status"), "pending")).collect();
    const payments = await ctx.db.query("salaryPayments").filter(q => q.eq(q.field("month"), args.month)).collect();

    return staff.map(s => {
      // 1. Calculate Worked Days and Leaves
      const staffAttend = attendance.filter(a => a.staffId === s._id && a.date.startsWith(args.month));
      
      const presentDays = staffAttend.filter(a => a.status === "present").length;
      const halfDays = staffAttend.filter(a => a.status === "half_day").length;
      const paidLeavesTaken = staffAttend.filter(a => a.status === "paid_leave").length;
      const absentDaysRecorded = staffAttend.filter(a => a.status === "absent").length;

      const totalPaidLeavesAllowed = s.paidLeavesPerMonth ?? 2;
      const effectivePaidLeaves = Math.min(paidLeavesTaken, totalPaidLeavesAllowed);
      const excessLeavesAsUnpaid = Math.max(0, paidLeavesTaken - totalPaidLeavesAllowed);
      
      const workedDays = presentDays + (halfDays * 0.5) + effectivePaidLeaves;
      const unpaidDays = absentDaysRecorded + excessLeavesAsUnpaid;

      // 2. Base Calculation (Assume 30-day month)
      const base = s.baseSalary || 0;
      const dailyRate = Math.round(base / 30);
      const earnings = Math.round(dailyRate * workedDays);
      const unpaidDeductions = Math.round(dailyRate * unpaidDays);

      // 3. Advances
      const staffAdvances = advances.filter(a => a.staffId === s._id);
      const totalPendingAdvances = staffAdvances.reduce((sum, a) => sum + a.amount, 0);

      const payment = payments.find(p => p.staffId === s._id);

      return {
        staffId: s._id,
        name: s.name,
        role: s.role,
        baseSalary: base,
        dailyRate,
        workedDays,
        presentDays,
        halfDays,
        paidLeavesTaken,
        effectivePaidLeaves,
        unpaidDays,
        totalPaidLeavesAllowed,
        earnings,
        unpaidDeductions,
        pendingAdvances: totalPendingAdvances,
        netPay: Math.max(0, earnings - totalPendingAdvances),
        status: payment ? "paid" : "pending",
        paymentInfo: payment,
      };
    });
  },
});

/** Process and mark salary as paid */
export const processSalaryPayment = mutation({
  args: {
    token: v.string(),
    staffId: v.id("staff"),
    month: v.string(),
    baseSalary: v.number(),
    workedDays: v.number(),
    earnings: v.number(),
    deductions: v.number(), // manual deductions
    paymentMethod: v.string(),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);

    // 1. Get pending advances
    const pendingAdvances = await ctx.db
      .query("staffAdvances")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .filter(q => q.eq(q.field("status"), "pending"))
      .collect();

    let totalAdvanceToRecover = pendingAdvances.reduce((sum, a) => sum + a.amount, 0);
    const maxRecoverable = Math.max(0, args.earnings - args.deductions);
    
    // Recovery Logic
    let recoveredInThisPayment = 0;
    if (totalAdvanceToRecover > 0) {
      recoveredInThisPayment = Math.min(totalAdvanceToRecover, maxRecoverable);
      
      // Update individual advance records
      let remainingToDeduct = recoveredInThisPayment;
      for (const adv of pendingAdvances) {
        if (remainingToDeduct >= adv.amount) {
          await ctx.db.patch(adv._id, { status: "recovered" });
          remainingToDeduct -= adv.amount;
        } else if (remainingToDeduct > 0) {
          // Partially recover this advance? 
          // For simplicity, we split it: mark old as recovered, insert new with balance
          await ctx.db.patch(adv._id, { status: "recovered" });
          await ctx.db.insert("staffAdvances", {
            staffId: args.staffId,
            amount: adv.amount - remainingToDeduct,
            date: new Date().toISOString().split("T")[0],
            reason: `Balance carry-forward from ${adv.reason || "previous advance"}`,
            status: "pending",
          });
          remainingToDeduct = 0;
        }
      }
    }

    const netAmount = args.earnings - args.deductions - recoveredInThisPayment;

    // 2. Create Payment Record
    return await ctx.db.insert("salaryPayments", {
      staffId: args.staffId,
      month: args.month,
      baseSalary: args.baseSalary,
      workedDays: args.workedDays,
      earnings: args.earnings,
      deductions: args.deductions,
      advanceRecovered: recoveredInThisPayment,
      netAmount,
      paymentDate: new Date().toISOString().split("T")[0],
      status: "paid",
      paymentMethod: args.paymentMethod,
      reference: args.reference,
    });
  },
});

export const getStaffFinancialHistory = query({
  args: { token: v.string(), staffId: v.id("staff") },
  handler: async (ctx, args) => {
    await verifyAdminAuth(ctx, args.token);
    
    const payments = await ctx.db
      .query("salaryPayments")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();
      
    const advances = await ctx.db
      .query("staffAdvances")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();
      
    // Merge and sort by date descending
    const history = [
      ...payments.map(p => ({ ...p, type: 'payment' as const, date: p.paymentDate })),
      ...advances.map(a => ({ ...a, type: 'advance' as const }))
    ].sort((a, b) => b.date.localeCompare(a.date));
    
    return history;
  }
});
