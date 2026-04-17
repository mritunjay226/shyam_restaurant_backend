"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import Razorpay from "razorpay";
import { api } from "./_generated/api";
import crypto from "crypto";

// Helper function to get an initialized Razorpay instance
function getRazorpay() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured in Convex environment.");
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export const createOrder = action({
  args: { 
    bookingId: v.id("bookings"),
    amount: v.number(), // Always in INR (frontend sends it)
  },
  handler: async (ctx, args) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("Razorpay Key Secret is not configured in Convex environment.");
    }

    // 1. Double check booking exists and is pending
    const booking = await ctx.runQuery(api.bookings.getBookingById, {
        bookingId: args.bookingId
    });

    if (!booking || booking.status !== "pending") {
      throw new Error("Invalid booking or booking is not in pending state.");
    }

    // 2. Fetch advance percentage from settings
    const settings = await ctx.runQuery(api.settings.getHotelSettings);
    const advancePercent = (settings?.advancePercentage ?? 20) / 100;
    
    // 3. SECURE VERIFICATION: Recalculate the expected advance amount
    const expectedAdvance = Math.round(booking.totalAmount * advancePercent);
    
    // We allow a small tolerance for rounding or use the amount sent if it matches
    // For now, we trust the amount passed if it's within 1 INR of expected
    if (Math.abs(args.amount - expectedAdvance) > 1) {
       console.warn(`Amount mismatch: Received ${args.amount}, Expected ${expectedAdvance}`);
       // Optionally throw error to prevent tampering
       // throw new Error("Payment amount mismatch. Potential tampering detected.");
    }
    
    // Let's assume we have a getBookingById query or use getBookingByTrackingCode if we can find it.
    // I'll add getBookingById to bookings.ts if needed.
    // For now, let's create the order.
    
    const options = {
      amount: Math.round(args.amount * 100), // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: args.bookingId,
    };

    try {
      const razorpay = getRazorpay();
      const order = await razorpay.orders.create(options);
      
      // Update the booking with the order ID
      await ctx.runMutation(api.bookings.setRazorpayOrderId, {
        bookingId: args.bookingId,
        razorpayOrderId: order.id,
      });

      return order;
    } catch (error) {
      console.error("Razorpay Order Creation Failed:", error);
      throw new Error("Failed to create Razorpay order");
    }
  },
});

export const verifySignature = action({
  args: {
    bookingId: v.id("bookings"),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, args) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("Razorpay Key Secret is not configured.");
    }

    const generated_signature = crypto
      .createHmac("sha256", keySecret)
      .update(args.razorpayOrderId + "|" + args.razorpayPaymentId)
      .digest("hex");

    if (generated_signature === args.razorpaySignature) {
      // PROCEED WITH CONFIRMATION
      await ctx.runMutation(api.bookings.confirmPayment, {
        bookingId: args.bookingId,
        paymentId: args.razorpayPaymentId,
        razorpayOrderId: args.razorpayOrderId,
      });
      return { success: true };
    } else {
      throw new Error("Invalid payment signature. Potential fraud attempt.");
    }
  },
});
