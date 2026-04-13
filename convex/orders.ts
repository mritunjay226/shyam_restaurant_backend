import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// COUNTER HELPER — atomically increments and returns the next value
// ─────────────────────────────────────────────────────────────────
async function nextCounter(ctx: any, name: string): Promise<number> {
  const existing = await ctx.db
    .query("counters")
    .withIndex("by_name", (q: any) => q.eq("name", name))
    .first();

  if (existing) {
    const next = existing.value + 1;
    await ctx.db.patch(existing._id, { value: next });
    return next;
  } else {
    await ctx.db.insert("counters", { name, value: 1 });
    return 1;
  }
}

function kotLabel(n: number): string {
  const year = new Date().getFullYear();
  return `KOT-${year}-${String(n).padStart(4, "0")}`;
}

// GST calculation helper
function calcGST(items: { price: number; quantity: number; category: string }[]) {
  let foodTotal = 0, bevTotal = 0;
  for (const item of items) {
    const t = item.price * item.quantity;
    if (item.category === "Beverage") bevTotal += t; else foodTotal += t;
  }
  const subtotal = foodTotal + bevTotal;
  const gstAmount = Math.round((foodTotal * 0.05 + bevTotal * 0.18) * 100) / 100;
  const totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, gstAmount, totalAmount };
}

// ─────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────

export const getAllOrders = query({
  handler: async (ctx) =>
    ctx.db.query("orders").withIndex("by_created_at").order("desc").collect(),
});

export const getOrdersByOutlet = query({
  args: { outlet: v.string() },
  handler: async (ctx, args) =>
    ctx.db.query("orders").withIndex("by_outlet_table", (q) => q.eq("outlet", args.outlet)).collect(),
});

export const getActiveOrdersByTable = query({
  args: { outlet: v.string(), tableNumber: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("orders")
      .withIndex("by_outlet_table", (q) =>
        q.eq("outlet", args.outlet).eq("tableNumber", args.tableNumber)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "kot_generated"),
          q.eq(q.field("status"), "preparing"),
          q.eq(q.field("status"), "ready")
        )
      )
      .collect(),
});

export const getActiveOrdersByOutlet = query({
  args: { outlet: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("orders")
      .withIndex("by_outlet_table", (q) => q.eq("outlet", args.outlet))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "kot_generated"),
          q.eq(q.field("status"), "preparing"),
          q.eq(q.field("status"), "ready")
        )
      )
      .collect(),
});

export const getOrdersByTable = query({
  args: { outlet: v.string(), tableNumber: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("orders")
      .withIndex("by_outlet_table", (q) =>
        q.eq("outlet", args.outlet).eq("tableNumber", args.tableNumber)
      )
      .filter((q) => q.eq(q.field("status"), "kot_generated"))
      .collect(),
});

export const getOrdersByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) =>
    ctx.db
      .query("orders")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.neq(q.field("status"), "paid"))
      .collect(),
});

export const getTodayOrders = query({
  args: { today: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("orders")
      .withIndex("by_created_at", (q) =>
        q.gte("createdAt", args.today).lte("createdAt", args.today + "\ufff0")
      )
      .collect(),
});

export const getUnbilledTableOrders = query({
  handler: async (ctx) =>
    ctx.db
      .query("orders")
      .filter((q) =>
        q.and(q.eq(q.field("roomId"), undefined), q.neq(q.field("status"), "paid"))
      )
      .collect(),
});

// ─────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────

export const createOrder = mutation({
  args: {
    outlet: v.string(),
    tableNumber: v.string(),
    roomId: v.optional(v.id("rooms")),
    takenById: v.optional(v.id("staff")),   // who is placing the order
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        category: v.string(),
        notes: v.optional(v.string()),
        course: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { subtotal, gstAmount, totalAmount } = calcGST(args.items);

    // Atomically assign next KOT number
    const n = await nextCounter(ctx, "kot");
    const kotNumber = kotLabel(n);

    const orderId = await ctx.db.insert("orders", {
      outlet: args.outlet,
      tableNumber: args.tableNumber,
      roomId: args.roomId,
      takenById: args.takenById,
      kotNumber,
      items: args.items,
      subtotal,
      gstAmount,
      totalAmount,
      status: "kot_generated",
      kotGenerated: true,
      createdAt: new Date().toISOString(),
    });

    // Audit
    if (args.takenById) {
      await ctx.db.insert("auditLog", {
        staffId: args.takenById,
        action: "create_order",
        details: `${kotNumber} — Table ${args.tableNumber} — ₹${totalAmount}`,
        timestamp: Date.now(),
      });
    }

    return orderId;
  },
});

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
        notes: v.optional(v.string()),
        course: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const updatedItems = [...order.items, ...args.newItems];
    const { subtotal, gstAmount, totalAmount } = calcGST(updatedItems);
    return ctx.db.patch(args.orderId, { items: updatedItems, subtotal, gstAmount, totalAmount });
  },
});

export const updateOrderStatus = mutation({
  args: { orderId: v.id("orders"), status: v.string() },
  handler: async (ctx, args) => ctx.db.patch(args.orderId, { status: args.status }),
});

export const markOrderBilled = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => ctx.db.patch(args.orderId, { status: "billed" }),
});

export const markOrderPaid = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => ctx.db.patch(args.orderId, { status: "paid" }),
});

export const transferTable = mutation({
  args: { outlet: v.string(), fromTableNumber: v.string(), toTableNumber: v.string() },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_outlet_table", (q) =>
        q.eq("outlet", args.outlet).eq("tableNumber", args.fromTableNumber)
      )
      .filter((q) =>
        q.and(q.eq(q.field("roomId"), undefined), q.neq(q.field("status"), "paid"))
      )
      .collect();
    for (const o of orders) await ctx.db.patch(o._id, { tableNumber: args.toTableNumber });
    return orders.length;
  },
});