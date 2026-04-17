import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// COUNTER HELPER
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

function receiptLabel(n: number): string {
  const year = new Date().getFullYear();
  return `GRC-${year}-${String(n).padStart(5, "0")}`;
}

// ─────────────────────────────────────────────────────────────────
// GROCERY PRODUCT QUERIES
// ─────────────────────────────────────────────────────────────────

export const getAllGroceryProducts = query({
  handler: async (ctx) =>
    ctx.db.query("groceryProducts").collect(),
});

export const getGroceryProductsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("groceryProducts")
      .withIndex("by_category", (q: any) => q.eq("category", args.category))
      .collect(),
});

export const getGroceryProductById = query({
  args: { productId: v.id("groceryProducts") },
  handler: async (ctx, args) => ctx.db.get(args.productId),
});

export const getLowStockProducts = query({
  handler: async (ctx) => {
    const products = await ctx.db.query("groceryProducts").collect();
    return products.filter((p) => p.stockQuantity <= p.lowStockThreshold);
  },
});

export const searchGroceryProducts = query({
  args: { term: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("groceryProducts").collect();
    const lower = args.term.toLowerCase();
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower) ||
        (p.barcode && p.barcode.includes(args.term))
    );
  },
});

// ─────────────────────────────────────────────────────────────────
// GROCERY PRODUCT MUTATIONS
// ─────────────────────────────────────────────────────────────────

export const addGroceryProduct = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    subCategory: v.optional(v.string()),
    barcode: v.optional(v.string()),
    unit: v.string(),             // "kg", "litre", "piece", "packet", etc.
    sellingPrice: v.number(),
    costPrice: v.optional(v.number()),
    gstRate: v.optional(v.number()), // percentage e.g. 5, 12, 18
    stockQuantity: v.number(),
    lowStockThreshold: v.number(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("groceryProducts", args);
  },
});

export const updateGroceryProduct = mutation({
  args: {
    productId: v.id("groceryProducts"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    subCategory: v.optional(v.string()),
    barcode: v.optional(v.string()),
    unit: v.optional(v.string()),
    sellingPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    gstRate: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { productId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(productId, filtered);
    return productId;
  },
});

export const adjustGroceryStock = mutation({
  args: {
    productId: v.id("groceryProducts"),
    quantityChange: v.number(),  // positive = add stock, negative = remove
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    const newQty = product.stockQuantity + args.quantityChange;
    if (newQty < 0) throw new Error("Insufficient stock");
    await ctx.db.patch(args.productId, { stockQuantity: newQty });

    // Log stock movement
    await ctx.db.insert("groceryStockMovements", {
      productId: args.productId,
      quantityChange: args.quantityChange,
      reason: args.reason ?? "manual_adjustment",
      stockAfter: newQty,
      createdAt: new Date().toISOString(),
    });
    return newQty;
  },
});

export const deleteGroceryProduct = mutation({
  args: { productId: v.id("groceryProducts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, { isActive: false });
  },
});

// ─────────────────────────────────────────────────────────────────
// GROCERY SALE QUERIES
// ─────────────────────────────────────────────────────────────────

export const getAllGrocerySales = query({
  handler: async (ctx) =>
    ctx.db.query("grocerySales").withIndex("by_createdAt").order("desc").collect(),
});

export const getGrocerySalesByDate = query({
  args: { date: v.string() }, // "YYYY-MM-DD"
  handler: async (ctx, args) =>
    ctx.db
      .query("grocerySales")
      .withIndex("by_createdAt", (q: any) =>
        q.gte("createdAt", args.date).lte("createdAt", args.date + "\uffff")
      )
      .collect(),
});

export const getGrocerySalesByMonth = query({
  args: { month: v.string() }, // "YYYY-MM"
  handler: async (ctx, args) =>
    ctx.db
      .query("grocerySales")
      .withIndex("by_createdAt", (q: any) =>
        q.gte("createdAt", args.month).lte("createdAt", args.month + "\uffff")
      )
      .collect(),
});

export const getGrocerySaleById = query({
  args: { saleId: v.id("grocerySales") },
  handler: async (ctx, args) => ctx.db.get(args.saleId),
});

// ─────────────────────────────────────────────────────────────────
// GROCERY SALE MUTATIONS
// ─────────────────────────────────────────────────────────────────

export const createGrocerySale = mutation({
  args: {
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("groceryProducts"),
        name: v.string(),
        unit: v.string(),
        quantity: v.number(),
        sellingPrice: v.number(),
        gstRate: v.number(),
      })
    ),
    paymentMethod: v.string(),     // "cash", "upi", "card", "credit"
    discountAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    isGstBill: v.optional(v.boolean()),
    gstin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Validate stock and compute totals
    let subtotal = 0;
    let gstTotal = 0;

    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.stockQuantity < item.quantity)
        throw new Error(`Insufficient stock for ${product.name}`);

      const lineTotal = item.quantity * item.sellingPrice;
      const lineGst = Math.round(lineTotal * (item.gstRate / 100) * 100) / 100;
      subtotal += lineTotal;
      gstTotal += lineGst;
    }

    const discount = args.discountAmount ?? 0;
    const totalAmount = Math.round((subtotal + gstTotal - discount) * 100) / 100;

    // 2. Generate receipt number
    const receiptNum = await nextCounter(ctx, "grocery_receipt");
    const receiptNumber = receiptLabel(receiptNum);

    // 3. Insert sale record
    const saleId = await ctx.db.insert("grocerySales", {
      receiptNumber,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      items: args.items,
      subtotal: Math.round(subtotal * 100) / 100,
      gstAmount: Math.round(gstTotal * 100) / 100,
      discountAmount: discount,
      totalAmount,
      paymentMethod: args.paymentMethod,
      isGstBill: args.isGstBill ?? false,
      gstin: args.gstin,
      notes: args.notes,
      status: "completed",
      createdAt: new Date().toISOString(),
    });

    // 4. Deduct stock for each item
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;
      const newQty = product.stockQuantity - item.quantity;
      await ctx.db.patch(item.productId, { stockQuantity: newQty });
      await ctx.db.insert("groceryStockMovements", {
        productId: item.productId,
        quantityChange: -item.quantity,
        reason: `sale:${receiptNumber}`,
        stockAfter: newQty,
        createdAt: new Date().toISOString(),
      });
    }

    return { saleId, receiptNumber, totalAmount };
  },
});

export const voidGrocerySale = mutation({
  args: {
    saleId: v.id("grocerySales"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale) throw new Error("Sale not found");
    if (sale.status === "voided") throw new Error("Sale is already voided");

    // Restore stock
    for (const item of sale.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;
      const newQty = product.stockQuantity + item.quantity;
      await ctx.db.patch(item.productId, { stockQuantity: newQty });
      await ctx.db.insert("groceryStockMovements", {
        productId: item.productId,
        quantityChange: item.quantity,
        reason: `void:${sale.receiptNumber}`,
        stockAfter: newQty,
        createdAt: new Date().toISOString(),
      });
    }

    await ctx.db.patch(args.saleId, { status: "voided" });
    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// STOCK MOVEMENT LOG
// ─────────────────────────────────────────────────────────────────

export const getStockMovements = query({
  args: { productId: v.optional(v.id("groceryProducts")) },
  handler: async (ctx, args) => {
    if (args.productId) {
      return ctx.db
        .query("groceryStockMovements")
        .withIndex("by_product", (q: any) => q.eq("productId", args.productId))
        .order("desc")
        .collect();
    }
    return ctx.db.query("groceryStockMovements").order("desc").collect();
  },
});

// ─────────────────────────────────────────────────────────────────
// PURCHASE / STOCK-IN (receiving inventory from supplier)
// ─────────────────────────────────────────────────────────────────

export const recordGroceryPurchase = mutation({
  args: {
    supplierName: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("groceryProducts"),
        quantity: v.number(),
        costPrice: v.number(),
      })
    ),
    totalCost: v.number(),
    paymentMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
    purchaseDate: v.string(),   // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const purchaseId = await ctx.db.insert("groceryPurchases", {
      ...args,
      status: "received",
      createdAt: new Date().toISOString(),
    });

    // Add stock for each purchased item
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;
      const newQty = product.stockQuantity + item.quantity;
      await ctx.db.patch(item.productId, { stockQuantity: newQty, costPrice: item.costPrice });
      await ctx.db.insert("groceryStockMovements", {
        productId: item.productId,
        quantityChange: item.quantity,
        reason: `purchase:${args.invoiceNumber ?? purchaseId}`,
        stockAfter: newQty,
        createdAt: new Date().toISOString(),
      });
    }

    return purchaseId;
  },
});

export const getAllGroceryPurchases = query({
  handler: async (ctx) =>
    ctx.db.query("groceryPurchases").order("desc").collect(),
});

// ─────────────────────────────────────────────────────────────────
// GROCERY REPORTS
// ─────────────────────────────────────────────────────────────────

export const getGroceryDailyReport = query({
  args: { date: v.string() }, // "YYYY-MM-DD"
  handler: async (ctx, args) => {
    const sales = await ctx.db
      .query("grocerySales")
      .withIndex("by_createdAt", (q: any) =>
        q.gte("createdAt", args.date).lte("createdAt", args.date + "\uffff")
      )
      .collect();

    const completed = sales.filter((s) => s.status === "completed");
    const totalRevenue = completed.reduce((a, s) => a + s.totalAmount, 0);
    const totalGst = completed.reduce((a, s) => a + s.gstAmount, 0);
    const totalDiscount = completed.reduce((a, s) => a + (s.discountAmount ?? 0), 0);

    // Payment method breakdown
    const byMethod: Record<string, number> = {};
    for (const s of completed) {
      byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] ?? 0) + s.totalAmount;
    }

    return {
      date: args.date,
      transactionCount: completed.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      byPaymentMethod: byMethod,
    };
  },
});

export const getGroceryMonthlyReport = query({
  args: { month: v.string() }, // "YYYY-MM"
  handler: async (ctx, args) => {
    const sales = await ctx.db
      .query("grocerySales")
      .withIndex("by_createdAt", (q: any) =>
        q.gte("createdAt", args.month).lte("createdAt", args.month + "\uffff")
      )
      .collect();

    const completed = sales.filter((s) => s.status === "completed");
    const totalRevenue = completed.reduce((a, s) => a + s.totalAmount, 0);
    const totalGst = completed.reduce((a, s) => a + s.gstAmount, 0);

    // Top selling products by quantity
    const productQty: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const sale of completed) {
      for (const item of sale.items) {
        const key = String(item.productId);
        if (!productQty[key]) productQty[key] = { name: item.name, qty: 0, revenue: 0 };
        productQty[key].qty += item.quantity;
        productQty[key].revenue += item.quantity * item.sellingPrice;
      }
    }
    const topProducts = Object.values(productQty)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      month: args.month,
      transactionCount: completed.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      topProducts,
    };
  },
});
