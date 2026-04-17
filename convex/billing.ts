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
      .withIndex("by_createdAt", (q: any) => q.eq("createdAt", args.date))
      .collect();
  },
});

// GET BILLS BY MONTH
export const getBillsByMonth = query({
  args: { month: v.string() },
  handler: async (ctx, args) => {
    // Prefix match using range query for best performance
    return await ctx.db
      .query("bills")
      .withIndex("by_createdAt", (q: any) =>
        q.gte("createdAt", args.month).lte("createdAt", args.month + "\uffff")
      )
      .collect();
  },
});

// GENERATE ROOM BILL
export const generateRoomBill = mutation({
  args: {
    bookingId: v.id("bookings"),
    isGstBill: v.boolean(),
    includeFoodGst: v.optional(v.boolean()),
    gstin: v.optional(v.string()),
    paymentMethod: v.string(),
    discountAmount: v.optional(v.number()),
    serviceCharge: v.optional(v.number()),
    housekeepingCharge: v.optional(v.number()),
    extraCharge: v.optional(v.number()),
    splitPayments: v.optional(v.array(v.object({
      method: v.string(),
      amount: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    // Recalculate actual nights stayed server-side
    const checkInDate = new Date(booking.checkIn);
    const today = new Date();
    let nights = Math.floor(
      (today.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (nights === 0) nights = 1;

    const roomTotal = booking.tariff * nights;
    const extraBedTotal = booking.extraBed ? (nights * 500) : 0;

    // Get linked restaurant/cafe orders
    const linkedOrders = await ctx.db
      .query("orders")
      .filter((q: any) =>
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

    let subtotal = roomTotal + extraBedTotal + orderTotal;

    // Apply additional charges
    const sc = args.serviceCharge || 0;
    const hc = args.housekeepingCharge || 0;
    const ec = args.extraCharge || 0;
    subtotal += sc + hc + ec;

    // Apply discount
    const discount = args.discountAmount || 0;
    subtotal = Math.max(0, subtotal - discount);

    // Fetch settings for GST rates
    const settings = await ctx.db.query("hotelSettings").first();
    const roomGstRate = (settings?.roomGst || 12) / 100;
    const foodGstRate = (settings?.foodGst || 5) / 100;

    // 1. Calculate Room-only GST
    // We apply room GST rate to (roomTotal + serviceCharge + housekeepingCharge + extraCharge - discount)
    // Note: Discount and extra charges are usually applied to the room portion in hospitality.
    let roomSubtotal = roomTotal + extraBedTotal + sc + hc + ec - discount;
    roomSubtotal = Math.max(0, roomSubtotal);
    
    let roomCgst = 0;
    let roomSgst = 0;
    if (args.isGstBill) {
      roomCgst = roomSubtotal * (roomGstRate / 2);
      roomSgst = roomSubtotal * (roomGstRate / 2);
    }

    // 2. Aggregate Food GST from linked orders
    // The orders already have gstAmount calculated at their specific rates (5% or 18%)
    const foodGstTotal = linkedOrders.reduce((sum, o) => sum + (o.gstAmount || 0), 0);
    const orderSubtotal = linkedOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    
    // Food GST is added ONLY if BOTH main GST toggle and specific Food GST toggle are on
    const includeFood = args.includeFoodGst !== false && args.isGstBill;
    const cgst = roomCgst + (includeFood ? (foodGstTotal / 2) : 0);
    const sgst = roomSgst + (includeFood ? (foodGstTotal / 2) : 0);

    const totalAmount = roomSubtotal + orderSubtotal + cgst + sgst;

    // Advance deduction
    const advance = booking.advance || 0;
    const amountDue = Math.max(0, totalAmount - advance);

    const billId = await ctx.db.insert("bills", {
      billType: "room",
      referenceId: args.bookingId,
      guestName: booking.guestName,
      isGstBill: args.isGstBill,
      gstin: args.gstin,
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: discount,
      serviceCharge: sc,
      housekeepingCharge: hc,
      extraCharge: ec,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      advancePaid: advance > 0 ? advance : undefined,
      amountDue: Math.round(amountDue * 100) / 100,
      paymentMethod: args.paymentMethod,
      splitPayments: args.splitPayments,
      status: "generated",
      createdAt: new Date().toISOString().split("T")[0],
    });

    // Mark linked orders as paid
    for (const order of linkedOrders) {
      await ctx.db.patch(order._id, { status: "paid" });
    }

    // AUDIT LOG
    await ctx.db.insert("auditLog", {
      staffId: (await ctx.db.query("staff").first())?._id!, // Placeholder: in real RBAC we'd have it in ctx
      action: "generate_room_bill",
      details: `Bill ${billId} generated for Room ${booking.roomId}. Total: ₹${totalAmount}`,
      timestamp: Date.now(),
    });

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

    await ctx.db.patch(args.banquetBookingId, { status: "completed" });
    return billId;
  },
});

// GENERATE TABLE BILL (Combines multiple orders)
export const generateTableBill = mutation({
  args: {
    outlet: v.string(),
    tableNumber: v.string(),
    isGstBill: v.boolean(),
    includeFoodGst: v.optional(v.boolean()),
    gstin: v.optional(v.string()),
    paymentMethod: v.string(),
    guestName: v.optional(v.string()),
    discountAmount: v.optional(v.number()),
    serviceCharge: v.optional(v.number()),
    housekeepingCharge: v.optional(v.number()),
    extraCharge: v.optional(v.number()),
    splitPayments: v.optional(v.array(v.object({
      method: v.string(),
      amount: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_outlet_table", (q: any) =>
        q.eq("outlet", args.outlet).eq("tableNumber", args.tableNumber)
      )
      .filter((q: any) =>
        q.and(
          q.eq(q.field("roomId"), undefined),
          q.neq(q.field("status"), "paid")
        )
      )
      .collect();

    if (orders.length === 0) {
      // Check if orders for this table were transferred to a room
      const transferredOrders = await ctx.db
        .query("orders")
        .withIndex("by_outlet_table", (q) =>
          q.eq("outlet", args.outlet).eq("tableNumber", args.tableNumber)
        )
        .filter((q) => q.neq(q.field("roomId"), undefined))
        .collect();

      if (transferredOrders.length > 0) {
        const roomIds = Array.from(new Set(transferredOrders.map(o => o.roomId)));
        const rooms = await Promise.all(roomIds.map(id => ctx.db.get(id!)));
        const roomNumbers = rooms.map(r => r?.roomNumber).filter(Boolean).join(", ");
        
        throw new Error(
          `This table's orders have been transferred to Room ${roomNumbers || "[Unknown]"}. ` +
          `Please settle the bill during Room Checkout.`
        );
      }

      throw new Error("No unbilled orders found for this table. Ensure the table is occupied and orders are active.");
    }

    let subtotal = orders.reduce((sum, order) => sum + order.subtotal, 0);

    const sc = args.serviceCharge || 0;
    const hc = args.housekeepingCharge || 0;
    const ec = args.extraCharge || 0;
    subtotal += sc + hc + ec;

    const discount = args.discountAmount || 0;
    subtotal = Math.max(0, subtotal - discount);

    // Fetch settings for GST rates
    const settings = await ctx.db.query("hotelSettings").first();
    const gstRate = (settings?.foodGst || 5) / 100; // Default to 5% if not set

    let cgst = 0;
    let sgst = 0;
    if (args.isGstBill && args.includeFoodGst !== false) {
      cgst = subtotal * (gstRate / 2);
      sgst = subtotal * (gstRate / 2);
    }

    const totalAmount = subtotal + cgst + sgst;

    const billId = await ctx.db.insert("bills", {
      billType: args.outlet,
      referenceId: `${args.outlet}-${args.tableNumber}-${Date.now()}`,
      guestName: args.guestName || `Table ${args.tableNumber}`,
      isGstBill: args.isGstBill,
      gstin: args.gstin,
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: discount,
      serviceCharge: sc,
      housekeepingCharge: hc,
      extraCharge: ec,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      paymentMethod: args.paymentMethod,
      splitPayments: args.splitPayments,
      status: "paid",
      createdAt: new Date().toISOString().split("T")[0],
    });

    for (const order of orders) {
      await ctx.db.patch(order._id, { status: "paid" });
    }

    // AUDIT LOG
    await ctx.db.insert("auditLog", {
      staffId: (await ctx.db.query("staff").first())?._id!,
      action: "generate_table_bill",
      details: `Table ${args.tableNumber} billed. Bill Id: ${billId}. Total: ₹${totalAmount}`,
      timestamp: Date.now(),
    });

    return billId;
  },
});

// DIRECT CHECKOUT ORDER (For fast walk-ins)
export const directCheckoutOrder = mutation({
  args: {
    outlet: v.string(),
    tableNumber: v.string(),
    items: v.array(
      v.object({
        menuItemId: v.union(v.id("banquetMenuItems"), v.id("menuItems")),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        category: v.string(),
        notes: v.optional(v.string()),
        course: v.optional(v.string()),
      })
    ),
    paymentMethod: v.string(),
    guestName: v.optional(v.string()),
    isGstBill: v.boolean(),
  },
  handler: async (ctx, args) => {
    let foodTotal = 0;
    let beverageTotal = 0;

    args.items.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      if (item.category === "Beverage") beverageTotal += itemTotal;
      else foodTotal += itemTotal;
    });

    const subtotal = foodTotal + beverageTotal;
    let gstAmount = 0;
    let cgst = 0;
    let sgst = 0;

    if (args.isGstBill) {
      gstAmount = foodTotal * 0.05 + beverageTotal * 0.18;
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
    }

    const totalAmount = subtotal + gstAmount;

    const orderId = await ctx.db.insert("orders", {
      outlet: args.outlet,
      tableNumber: args.tableNumber,
      items: args.items,
      subtotal: Math.round(subtotal * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: "paid",
      kotGenerated: true,
      createdAt: new Date().toISOString(),
    });

    const billId = await ctx.db.insert("bills", {
      billType: args.outlet,
      referenceId: orderId,
      guestName: args.guestName || args.tableNumber,
      isGstBill: args.isGstBill,
      subtotal: Math.round(subtotal * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      paymentMethod: args.paymentMethod,
      status: "paid",
      createdAt: new Date().toISOString().split("T")[0],
    });

    return { orderId, billId };
  },
});

// MARK BILL AS PAID
export const markBillPaid = mutation({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.billId, { status: "paid" });
  },
});