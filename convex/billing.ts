import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// GET ALL BILLS
export const getAllBills = query({
  handler: async (ctx) => {
    return await ctx.db.query("bills").collect();
  },
});

// GET BILLS BY DATE
export const getBillsByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bills")
      .filter((q) => q.eq(q.field("createdAt"), args.date))
      .collect();
  },
});

// GET BILLS BY MONTH
export const getBillsByMonth = query({
  args: { month: v.string() }, // "2024-11"
  handler: async (ctx, args) => {
    const allBills = await ctx.db.query("bills").collect();
    return allBills.filter((bill) =>
      bill.createdAt.startsWith(args.month)
    );
  },
});

// GENERATE ROOM BILL
export const generateRoomBill = mutation({
  args: {
    bookingId: v.id("bookings"),
    isGstBill: v.boolean(),
    gstin: v.optional(v.string()),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    // get linked restaurant/cafe orders
    const linkedOrders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("roomId"), booking.roomId),
          q.neq(q.field("status"), "paid")
        )
      )
      .collect();

    const orderTotal = linkedOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    const subtotal = booking.totalAmount + orderTotal;

    let cgst = 0;
    let sgst = 0;

    if (args.isGstBill) {
      // 6% CGST + 6% SGST = 12% GST on room
      cgst = booking.totalAmount * 0.06;
      sgst = booking.totalAmount * 0.06;
    }

    const totalAmount = subtotal + cgst + sgst;

    // create bill
    const billId = await ctx.db.insert("bills", {
      billType: "room",
      referenceId: args.bookingId,
      guestName: booking.guestName,
      isGstBill: args.isGstBill,
      gstin: args.gstin,
      subtotal: Math.round(subtotal * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      paymentMethod: args.paymentMethod,
      status: "generated",
      createdAt: new Date().toISOString().split("T")[0],
    });

    // mark linked orders as paid
    for (const order of linkedOrders) {
      await ctx.db.patch(order._id, { status: "paid" });
    }

    return billId;
  },
});

// GENERATE RESTAURANT / CAFE BILL
export const generateOrderBill = mutation({
  args: {
    orderId: v.id("orders"),
    isGstBill: v.boolean(),
    paymentMethod: v.string(),
    gstin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    let cgst = 0;
    let sgst = 0;

    if (args.isGstBill) {
      // split gstAmount into CGST and SGST equally
      cgst = order.gstAmount / 2;
      sgst = order.gstAmount / 2;
    }

    const billId = await ctx.db.insert("bills", {
      billType: order.outlet,
      referenceId: args.orderId,
      guestName: `Table ${order.tableNumber}`,
      isGstBill: args.isGstBill,
      gstin: args.gstin,
      subtotal: order.subtotal,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      totalAmount: args.isGstBill
        ? order.subtotal + cgst + sgst
        : order.subtotal,
      paymentMethod: args.paymentMethod,
      status: "paid",
      createdAt: new Date().toISOString().split("T")[0],
    });

    // mark order as paid
    await ctx.db.patch(args.orderId, { status: "paid" });

    return billId;
  },
});

// GENERATE BANQUET BILL
export const generateBanquetBill = mutation({
  args: {
    banquetBookingId: v.id("banquetBookings"),
    isGstBill: v.boolean(),
    gstin: v.optional(v.string()),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.banquetBookingId);
    if (!booking) throw new Error("Banquet booking not found");

    let cgst = 0;
    let sgst = 0;

    if (args.isGstBill) {
      cgst = booking.totalAmount * 0.09;
      sgst = booking.totalAmount * 0.09;
    }

    const totalAmount = booking.totalAmount + cgst + sgst;

    const billId = await ctx.db.insert("bills", {
      billType: "banquet",
      referenceId: args.banquetBookingId,
      guestName: booking.guestName,
      isGstBill: args.isGstBill,
      gstin: args.gstin,
      subtotal: booking.totalAmount,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      paymentMethod: args.paymentMethod,
      status: "generated",
      createdAt: new Date().toISOString().split("T")[0],
    });

    // mark banquet booking as completed
    await ctx.db.patch(args.banquetBookingId, { status: "completed" });

    return billId;
  },
});

// MARK BILL AS PAID
export const markBillPaid = mutation({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.billId, { status: "paid" });
  },
});