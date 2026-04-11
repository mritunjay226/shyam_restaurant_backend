import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ROOMS
  rooms: defineTable({
    roomNumber: v.string(),        // "101", "102" etc
    category: v.string(),          // "Luxury", "Premium", "Suite"
    floor: v.number(),             // 1, 2, 3
    tariff: v.number(),            // base price per night
    status: v.string(),            // "available", "occupied", "pending_checkout"
    isActive: v.boolean(),         // admin can deactivate
    description: v.optional(v.string()),
    amenities: v.optional(v.array(v.string())),
  }),

  // ROOM BOOKINGS
  bookings: defineTable({
    roomId: v.id("rooms"),
    guestName: v.string(),
    guestPhone: v.string(),
    idType: v.optional(v.string()),       // Aadhar, Passport etc
    idNumber: v.optional(v.string()),
    checkIn: v.string(),                  // "2024-11-14"
    checkOut: v.string(),
    tariff: v.number(),                   // tariff at time of booking
    advance: v.number(),
    balance: v.number(),
    totalAmount: v.number(),
    status: v.string(),          // "confirmed", "checked_in", "checked_out", "cancelled"
    gstBill: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  }),

  // MENU ITEMS (for both restaurant and cafe)
  menuItems: defineTable({
    name: v.string(),
    category: v.string(),         // "Food", "Beverage"
    subCategory: v.string(),      // "Starters", "Main Course", "Coffee", "Tea" etc
    price: v.number(),
    outlet: v.string(),           // "restaurant", "cafe"
    isAvailable: v.boolean(),
    description: v.optional(v.string()),
  }),

  // RESTAURANT / CAFE ORDERS
  orders: defineTable({
    outlet: v.string(),            // "restaurant", "cafe"
    tableNumber: v.string(),       // "Table 1", "Table 2"
    roomId: v.optional(v.id("rooms")),   // if order linked to a room
    items: v.array(v.object({
      menuItemId: v.id("menuItems"),
      name: v.string(),
      price: v.number(),
      quantity: v.number(),
      category: v.string(),        // to calculate GST
    })),
    subtotal: v.number(),
    gstAmount: v.number(),
    totalAmount: v.number(),
    status: v.string(),            // "kot_generated", "billed", "paid"
    kotGenerated: v.boolean(),
    createdAt: v.string(),
  }),

  // BANQUET HALLS
  banquetHalls: defineTable({
    name: v.string(),              // "Hall A", "Hall B" etc
    capacity: v.number(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  }),

  // BANQUET BOOKINGS
  banquetBookings: defineTable({
    hallId: v.id("banquetHalls"),
    eventName: v.string(),
    eventType: v.string(),         // "Wedding", "Corporate", "Birthday" etc
    eventDate: v.string(),
    guestName: v.string(),
    guestPhone: v.string(),
    guestCount: v.number(),
    menuPackage: v.optional(v.string()),
    totalAmount: v.number(),
    advance: v.number(),
    balance: v.number(),
    status: v.string(),            // "confirmed", "completed", "cancelled"
    notes: v.optional(v.string()),
  }),

  // FINAL BILLS
  bills: defineTable({
    billType: v.string(),          // "room", "restaurant", "cafe", "banquet"
    referenceId: v.string(),       // bookingId or orderId or banquetBookingId
    guestName: v.string(),
    isGstBill: v.boolean(),
    gstin: v.optional(v.string()),
    subtotal: v.number(),
    cgst: v.number(),
    sgst: v.number(),
    totalAmount: v.number(),
    paymentMethod: v.optional(v.string()),  // "cash", "card", "upi"
    status: v.string(),            // "generated", "paid"
    createdAt: v.string(),
  }),

  // HOTEL SETTINGS
  hotelSettings: defineTable({
    hotelName: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    gstin: v.string(),
    checkInTime: v.string(),
    checkOutTime: v.string(),
  }),

});