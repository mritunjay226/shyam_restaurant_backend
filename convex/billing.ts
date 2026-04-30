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
    splitPayments: v.optional(
      v.array(
        v.object({
          method: v.string(),
          amount: v.number(),
        })
      )
    ),
    amountPaid: v.optional(v.number()),
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

    const amountPaidToday = args.amountPaid ?? (totalAmount - booking.advance);
    const totalPaid = amountPaidToday + booking.advance;
    const amountDue = Math.max(0, totalAmount - totalPaid);
    const status = amountDue > 0 ? "due" : "paid";

    const initialSplit = args.splitPayments || [
      { method: args.paymentMethod, amount: amountPaidToday, timestamp: Date.now() },
    ];
    if (booking.advance > 0 && !args.splitPayments) {
      initialSplit.push({ method: "advance", amount: booking.advance, timestamp: Date.now() });
    }

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
      splitPayments: initialSplit,
      amountPaid: totalPaid,
      amountDue: amountDue,
      status: status,
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
    amountPaid: v.optional(v.number()),
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

    let amountPaid = 0;
    if (args.splitPayments && args.splitPayments.length > 0) {
      amountPaid = args.splitPayments.reduce((sum, p) => sum + p.amount, 0);
    } else if (args.amountPaid !== undefined) {
      amountPaid = args.amountPaid;
    } else {
      amountPaid = totalAmount; // Default to full payment if not specified
    }

    const amountDue = Math.max(0, totalAmount - amountPaid);
    const status = amountDue > 0 ? "due" : "paid";

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
      amountPaid: Math.round(amountPaid * 100) / 100,
      amountDue: Math.round(amountDue * 100) / 100,
      paymentMethod: args.paymentMethod,
      splitPayments: args.splitPayments,
      status: status,
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
    gstin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let foodTotal = 0;
    let beverageTotal = 0;

    args.items.forEach((item: { price: number; quantity: number; category: string }) => {
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

// GET BILL DETAILS
export const getBillDetails = query({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId);
    if (!bill) throw new Error("Bill not found");

    let roomCharges: any = null;
    let tableCharges: any = null;
    let banquetCharges: any = null;

    if (bill.billType === "room") {
      const booking = await ctx.db.get(bill.referenceId as any) as any;
      if (booking) {
        const room = await ctx.db.get(booking.roomId);
        
        // Calculate nights at the time of billing
        let nights = 1;
        try {
          const checkInDate = new Date(booking.checkIn);
          // If checkOut is populated use it, else use bill creation time
          const checkOutTime = booking.checkOut ? new Date(booking.checkOut).getTime() : bill._creationTime;
          nights = Math.floor((checkOutTime - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
          if (nights <= 0 || isNaN(nights)) nights = 1;
        } catch (e) {
          nights = 1;
        }

        const allOrders = await ctx.db
          .query("orders")
          .filter(q => q.and(
            q.eq(q.field("roomId"), booking.roomId),
            q.eq(q.field("status"), "paid")
          ))
          .collect();

        // Include orders paid around the same time as the bill (within 2 minutes)
        const linkedOrders = allOrders.filter(o => 
          o._creationTime <= bill._creationTime + 120000 &&
          o._creationTime >= new Date(booking.checkIn).getTime() - 86400000 // Since check-in (allow 1 day before in case of midnight issues)
        );

        roomCharges = {
          room,
          booking,
          nights,
          roomBaseTotal: booking.tariff * nights,
          extraBedTotal: booking.extraBed ? 500 * nights : 0,
          linkedOrders,
        };
      }
    } else if (bill.billType === "banquet") {
       // Just returning the banquet booking is enough as banquet receipts are not complex
       const booking = await ctx.db.get(bill.referenceId as any) as any;
       if (booking) {
         banquetCharges = booking; 
       }
    } else {
      // Restaurant / Cafe table bill
      if (bill.referenceId.includes("-")) {
        const [outlet, tableNumber] = bill.referenceId.split("-");
        const orders = await ctx.db
          .query("orders")
          .withIndex("by_outlet_table", q => q.eq("outlet", outlet).eq("tableNumber", tableNumber))
          .filter(q => q.eq(q.field("status"), "paid"))
          .collect();
          
        const linkedOrders = orders.filter(o => 
          o._creationTime <= bill._creationTime + 120000 &&
          o._creationTime >= bill._creationTime - (24 * 60 * 60 * 1000) // within 24h of bill creation
        );
        
        tableCharges = {
           outlet,
           tableNumber,
           count: linkedOrders.length,
           orders: linkedOrders,
        };
      } else {
        const order = await ctx.db.get(bill.referenceId as any) as any;
        if (order) {
           tableCharges = {
             outlet: order.outlet,
             tableNumber: order.tableNumber,
             count: 1,
             orders: [order],
           };
        }
      }
    }

    return {
      bill,
      roomCharges,
      tableCharges,
      banquetCharges
    };
  },
});

// GET DUE BILLS
export const getDueBills = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("bills")
      .withIndex("by_status", (q) => q.eq("status", "due"))
      .collect();
  },
});

// SETTLE DUE BILL
export const settleDueBill = mutation({
  args: {
    billId: v.id("bills"),
    amount: v.number(),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId);
    if (!bill) throw new Error("Bill not found");
    if (bill.status !== "due" || !bill.amountDue) {
      throw new Error("This bill does not have a pending due amount.");
    }

    const newAmountPaid = (bill.amountPaid || 0) + args.amount;
    const newAmountDue = Math.max(0, bill.totalAmount - newAmountPaid);
    const newStatus = newAmountDue <= 0 ? "paid" : "due";

    // Track payment history if splitPayments is present or create it
    const newSplitPayments = bill.splitPayments ? [...bill.splitPayments] : [];
    if (bill.paymentMethod && bill.paymentMethod !== "split" && newSplitPayments.length === 0) {
      // Convert initial single payment to split format to keep history
      newSplitPayments.push({
        method: bill.paymentMethod,
        amount: bill.amountPaid || 0,
      });
    }
    
    newSplitPayments.push({
      method: args.paymentMethod,
      amount: args.amount,
    });

    await ctx.db.patch(args.billId, {
      amountPaid: Math.round(newAmountPaid * 100) / 100,
      amountDue: Math.round(newAmountDue * 100) / 100,
      status: newStatus,
      paymentMethod: "split",
      splitPayments: newSplitPayments,
    });

    // AUDIT LOG
    await ctx.db.insert("auditLog", {
      staffId: (await ctx.db.query("staff").first())?._id!,
      action: "settle_due_bill",
      details: `Settled ₹${args.amount} for Bill ${args.billId} via ${args.paymentMethod}. Remaining Due: ₹${newAmountDue}`,
      timestamp: Date.now(),
    });

    return args.billId;
  },
});