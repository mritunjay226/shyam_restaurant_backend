import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ROOMS
  rooms: defineTable({
    roomNumber: v.string(),
    category: v.string(),
    floor: v.number(),
    tariff: v.number(),
    status: v.string(),            // "available", "occupied", "pending_checkout"
    isActive: v.boolean(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),  // hero / primary image
    images: v.optional(v.array(v.string())), // gallery images
    amenities: v.optional(v.array(v.string())),
  }).index("by_roomNumber", ["roomNumber"]),

  // ROOM BOOKINGS
  bookings: defineTable({
    roomId: v.id("rooms"),
    guestId: v.optional(v.id("guests")),         // linked guest profile
    folioNumber: v.optional(v.string()),          // "FLO-20250412-00001"
    guestName: v.string(),
    guestPhone: v.string(),
    idType: v.optional(v.string()),
    idNumber: v.optional(v.string()),
    checkIn: v.string(),
    checkOut: v.string(),
    tariff: v.number(),
    advance: v.number(),
    balance: v.number(),
    totalAmount: v.number(),
    status: v.string(),            // "confirmed","checked_in","checked_out","cancelled","pending"
    gstBill: v.optional(v.boolean()),
    extraBed: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),              // "walk_in","phone","ota","website"
    razorpayOrderId: v.optional(v.string()),
    paymentId: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),       // "pending", "paid", "failed"
    trackingCode: v.optional(v.string()),
  })
    .index("by_room", ["roomId"])
    .index("by_checkIn", ["checkIn"])
    .index("by_checkOut", ["checkOut"])
    .index("by_trackingCode", ["trackingCode"])
    .index("by_razorpayOrderId", ["razorpayOrderId"]),

  // GUEST PROFILES (repeat guest history)
  guests: defineTable({
    name: v.string(),
    phone: v.string(),
    idType: v.optional(v.string()),
    idNumber: v.optional(v.string()),
    totalVisits: v.number(),
    totalSpend: v.number(),
  }).index("by_phone", ["phone"]),

  // MENU ITEMS
  menuItems: defineTable({
    name: v.string(),
    category: v.string(),
    subCategory: v.string(),
    price: v.number(),
    outlet: v.string(),
    isAvailable: v.boolean(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
  }),

  // RESTAURANT / CAFE ORDERS
  orders: defineTable({
    outlet: v.string(),
    tableNumber: v.string(),
    roomId: v.optional(v.id("rooms")),
    kotNumber: v.optional(v.string()),           // "KOT-2025-0001"
    takenById: v.optional(v.id("staff")),        // who created the order
    items: v.array(v.object({
      menuItemId: v.union(v.id("banquetMenuItems"), v.id("menuItems")),
      name: v.string(),
      price: v.number(),
      quantity: v.number(),
      category: v.string(),
      notes: v.optional(v.string()),
      course: v.optional(v.string()),
    })),
    subtotal: v.number(),
    gstAmount: v.number(),
    totalAmount: v.number(),
    status: v.string(),
    kotGenerated: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_outlet_table", ["outlet", "tableNumber"])
    .index("by_room", ["roomId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  banquetHalls: defineTable({
    name: v.string(),
    type: v.string(),
    capacity: v.number(),
    price: v.optional(v.number()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    isActive: v.boolean(),
  }),

  // BANQUET BOOKINGS
  banquetBookings: defineTable({
    hallId: v.id("banquetHalls"),
    eventName: v.string(),
    eventType: v.string(),
    eventDate: v.string(),
    timeSlot: v.optional(v.string()),            // "morning","evening","full_day"
    guestName: v.string(),
    guestPhone: v.string(),
    guestCount: v.number(),
    plateCost: v.optional(v.number()),
    menuPackage: v.optional(v.string()),
    totalAmount: v.number(),
    advance: v.number(),
    balance: v.number(),
    status: v.string(),
    notes: v.optional(v.string()),
    isFullPropertySellOut: v.optional(v.boolean()),
    includeRooms: v.optional(v.boolean()),
    roomDetails: v.optional(v.string()),
    blockedRoomIds: v.optional(v.array(v.id("rooms"))),
    includeCafe: v.optional(v.boolean()),
    cafeDetails: v.optional(v.string()),
    includeRestaurant: v.optional(v.boolean()),
    restaurantDetails: v.optional(v.string()),
    extraCharges: v.optional(
      v.array(
        v.object({
          description: v.string(),
          amount: v.number(),
        })
      )
    ),
  }).index("by_eventDate", ["eventDate"]),

  // FINAL BILLS
  bills: defineTable({
    billType: v.string(),
    referenceId: v.string(),
    guestName: v.string(),
    isGstBill: v.boolean(),
    gstin: v.optional(v.string()),
    subtotal: v.number(),
    discountAmount: v.optional(v.number()),
    serviceCharge: v.optional(v.number()),
    housekeepingCharge: v.optional(v.number()),
    extraCharge: v.optional(v.number()),
    cgst: v.number(),
    sgst: v.number(),
    totalAmount: v.number(),
    advancePaid: v.optional(v.number()),
    amountPaid: v.optional(v.number()),
    amountDue: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    splitPayments: v.optional(v.array(v.object({
      method: v.string(),
      amount: v.number(),
    }))),
    status: v.string(),
    createdAt: v.string(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_status", ["status"])
    .index("by_billType_date", ["billType", "createdAt"]),

  // HOTEL SETTINGS
  hotelSettings: defineTable({
    hotelName: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    gstin: v.string(),
    checkInTime: v.string(),
    checkOutTime: v.string(),
    roomGst: v.optional(v.number()),
    foodGst: v.optional(v.number()),
    alGst: v.optional(v.number()),
    autoCheckoutReminders: v.optional(v.boolean()),
    requireIdUpload: v.optional(v.boolean()),
    defaultKitchenTab: v.optional(v.string()), // "restaurant" | "cafe"
    defaultBillingTab: v.optional(v.string()), // "rooms" | "tables"
    staffTypes: v.optional(v.array(v.string())),
    advancePercentage: v.optional(v.number()),
  }),

  // STAFF (RBAC & Payroll)
  staff: defineTable({
    name: v.string(),
    pin: v.string(),               // SHA-256 hashed PIN
    role: v.string(),
    isActive: v.boolean(),
    failedAttempts: v.optional(v.number()),  // brute-force counter
    lockedUntil: v.optional(v.number()),     // ms timestamp; null = not locked

    // Payroll Info
    baseSalary: v.optional(v.number()),
    joiningDate: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountNo: v.optional(v.string()),
    ifsc: v.optional(v.string()),
    upiId: v.optional(v.string()),
  }).index("by_pin", ["pin"]),

  attendance: defineTable({
    staffId: v.id("staff"),
    date: v.string(),              // "YYYY-MM-DD"
    status: v.string(),            // "present", "absent", "half_day"
    notes: v.optional(v.string()),
  }).index("by_staff_date", ["staffId", "date"])
    .index("by_date", ["date"]),

  staffAdvances: defineTable({
    staffId: v.id("staff"),
    amount: v.number(),
    date: v.string(),
    reason: v.optional(v.string()),
    status: v.string(),            // "pending", "recovered"
  }).index("by_staff", ["staffId"]),

  salaryPayments: defineTable({
    staffId: v.id("staff"),
    month: v.string(),             // "YYYY-MM"
    baseSalary: v.number(),
    workedDays: v.number(),
    earnings: v.number(),
    deductions: v.number(),
    advanceRecovered: v.number(),
    netAmount: v.number(),
    paymentDate: v.string(),
    status: v.string(),            // "paid"
    paymentMethod: v.string(),
    reference: v.optional(v.string()),
  }).index("by_staff", ["staffId"])
    .index("by_staff_month", ["staffId", "month"]),

  // AUTH SESSIONS
  authSessions: defineTable({
    token: v.string(),
    staffId: v.id("staff"),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_staff", ["staffId"]),

  // ROLE CONFIG (Dynamic Permissions)
  roleConfig: defineTable({
    role: v.string(),
    allowedPaths: v.array(v.string()),
  }).index("by_role", ["role"]),

  // SEQUENTIAL COUNTERS (KOT numbers, folio numbers)
  counters: defineTable({
    name: v.string(),              // "kot", "folio"
    value: v.number(),             // current counter value
  }).index("by_name", ["name"]),

  // AUDIT LOG
  auditLog: defineTable({
    staffId: v.id("staff"),
    action: v.string(),            // "login","logout","create_order","checkin","checkout"
    details: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_staff", ["staffId"]),

  categories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()), // Useful for maintaining the menu's visual order
  }),

  // ─────────────────────────────────────────────────────────────────
  // GROCERY STORE
  // ─────────────────────────────────────────────────────────────────

  groceryProducts: defineTable({
    name: v.string(),
    category: v.string(),                    // "Dairy", "Grains", "Beverages", etc.
    subCategory: v.optional(v.string()),
    barcode: v.optional(v.string()),
    unit: v.string(),                        // "kg", "litre", "piece", "packet"
    sellingPrice: v.number(),
    costPrice: v.optional(v.number()),
    gstRate: v.optional(v.number()),         // percentage: 0, 5, 12, 18, 28
    stockQuantity: v.number(),
    lowStockThreshold: v.number(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    brandName: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    ingredients: v.optional(v.string()),
    isVegetarian: v.optional(v.boolean()),
    isVegan: v.optional(v.boolean()),
    isOrganic: v.optional(v.boolean()),
    countryOfOrigin: v.optional(v.string()),
    packagingType: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_category", ["category"])
    .index("by_barcode", ["barcode"]),

  grocerySales: defineTable({
    receiptNumber: v.string(),               // "GRC-2025-00001"
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
    subtotal: v.number(),
    gstAmount: v.number(),
    discountAmount: v.number(),
    totalAmount: v.number(),
    paymentMethod: v.string(),               // "cash", "upi", "card", "credit"
    isGstBill: v.boolean(),
    gstin: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.string(),                      // "completed", "voided"
    createdAt: v.string(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_receiptNumber", ["receiptNumber"])
    .index("by_status", ["status"])
    .index("by_customerPhone", ["customerPhone"]),

  groceryStockMovements: defineTable({
    productId: v.id("groceryProducts"),
    quantityChange: v.number(),              // positive = in, negative = out
    reason: v.string(),                      // "sale:GRC-…", "purchase:INV-…", "manual_adjustment"
    stockAfter: v.number(),
    createdAt: v.string(),
  }).index("by_product", ["productId"]),

  groceryPurchases: defineTable({
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
    purchaseDate: v.string(),
    status: v.string(),                      // "received", "partial", "pending"
    createdAt: v.string(),
  }),

  // BARCODE PRODUCT CACHE (External lookups)
  barcodeCache: defineTable({
    barcode: v.string(),
    source: v.string(),
    name: v.string(),
    brandName: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    ingredients: v.optional(v.string()),
    countryOfOrigin: v.optional(v.string()),
    packagingType: v.optional(v.string()),
    image: v.optional(v.string()),
    unit: v.string(),
    description: v.optional(v.string()),
    isVegetarian: v.optional(v.boolean()),
    isVegan: v.optional(v.boolean()),
    isOrganic: v.optional(v.boolean()),
    productType: v.string(),
    cachedAt: v.number(),
  }).index("by_barcode", ["barcode"]),

  // ─────────────────────────────────────────────────────────────────

  // The actual food and beverage items
  banquetMenuItems: defineTable({
    categoryId: v.id("categories"),
    name: v.string(), // e.g., "VIRGIN PINA COLADA", "Classic Margherita" [cite: 29, 48]

    // Optional description for ingredients, e.g., "Pineapple Juice, Fresh Coconut Cream" 
    description: v.optional(v.string()),

    // The base price of the item
    price: v.number(),

    // To handle prices attached to quantities, e.g., "scoop" or "2 pcs" [cite: 76, 78]
    unit: v.optional(v.string()),

    // Categorizing items to match the menu's Veg/NonVeg/Egg sections 
    dietaryType: v.optional(
      v.union(v.literal("veg"), v.literal("non-veg"), v.literal("egg"))
    ),

    // To handle restricted timing like Breakfast: "7:00 AM - 10:30 AM" 
    availabilityWindow: v.optional(v.string()),

    isAvailable: v.boolean(), // Quick toggle to mark items out of stock

    image: v.optional(v.string()), // For Cafe/Restaurant views
  })
    // Index to quickly fetch all items under a specific menu category
    .index("by_category", ["categoryId"])
    // Index to filter items by dietary preference
    .index("by_dietary", ["dietaryType"]),

  // ─────────────────────────────────────────────────────────────────
  // POS TERMINALS & SHARED CARTS
  // ─────────────────────────────────────────────────────────────────
  
  storeCounters: defineTable({
    name: v.string(),
    isActive: v.boolean(),
  }),

  activeGroceryCarts: defineTable({
    counterId: v.id("storeCounters"),
    items: v.array(v.object({
      cartId: v.string(),
      productId: v.id("groceryProducts"),
      quantity: v.number(),
      // Snapshots for quick display
      name: v.string(),
      price: v.number(),
      unit: v.string(),
    })),
    lastUpdated: v.number(),
  }).index("by_counter", ["counterId"]),
});