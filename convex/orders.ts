import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// GET ALL ORDERS
export const getAllOrders = query({
  handler: async (ctx) => {
    return await ctx.db.query("orders").collect();
  },
});

// GET ORDERS BY OUTLET
export const getOrdersByOutlet = query({
  args: { outlet: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("outlet"), args.outlet))
      .collect();
  },
});

// GET ORDERS BY TABLE
export const getOrdersByTable = query({
  args: {
    outlet: v.string(),
    tableNumber: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("outlet"), args.outlet),
          q.eq(q.field("tableNumber"), args.tableNumber),
          q.eq(q.field("status"), "kot_generated")
        )
      )
      .collect();
  },
});

// GET ORDERS BY ROOM (for room billing)
export const getOrdersByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.eq(q.field("roomId"), args.roomId),
          q.neq(q.field("status"), "paid")
        )
      )
      .collect();
  },
});

// GET TODAY'S ORDERS
export const getTodayOrders = query({
  args: { today: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("createdAt"), args.today))
      .collect();
  },
});

// CREATE ORDER & GENERATE KOT
export const createOrder = mutation({
  args: {
    outlet: v.string(),
    tableNumber: v.string(),
    roomId: v.optional(v.id("rooms")),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        category: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // calculate GST — 5% food, 18% beverages
    let foodTotal = 0;
    let beverageTotal = 0;

    args.items.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      if (item.category === "Beverage") {
        beverageTotal += itemTotal;
      } else {
        foodTotal += itemTotal;
      }
    });

    const subtotal = foodTotal + beverageTotal;
    const gstAmount =
      foodTotal * 0.05 + beverageTotal * 0.18;
    const totalAmount = subtotal + gstAmount;

    return await ctx.db.insert("orders", {
      outlet: args.outlet,
      tableNumber: args.tableNumber,
      roomId: args.roomId,
      items: args.items,
      subtotal: Math.round(subtotal * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: "kot_generated",
      kotGenerated: true,
      createdAt: new Date().toISOString().split("T")[0],
    });
  },
});

// ADD ITEMS TO EXISTING ORDER
export const addItemsToOrder = mutation({
  args: {
    orderId: v.id("orders"),
    newItems: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        category: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const updatedItems = [...order.items, ...args.newItems];

    let foodTotal = 0;
    let beverageTotal = 0;

    updatedItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      if (item.category === "Beverage") {
        beverageTotal += itemTotal;
      } else {
        foodTotal += itemTotal;
      }
    });

    const subtotal = foodTotal + beverageTotal;
    const gstAmount = foodTotal * 0.05 + beverageTotal * 0.18;
    const totalAmount = subtotal + gstAmount;

    return await ctx.db.patch(args.orderId, {
      items: updatedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    });
  },
});

// MARK ORDER AS BILLED
export const markOrderBilled = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.orderId, { status: "billed" });
  },
});

// MARK ORDER AS PAID
export const markOrderPaid = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.orderId, { status: "paid" });
  },
});