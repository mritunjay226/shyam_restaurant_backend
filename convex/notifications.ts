"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendWhatsAppBookingConfirmation = internalAction({
  args: {
    phone: v.string(),
    guestName: v.string(),
    checkIn: v.string(),
    trackingCode: v.string(),
    hotelName: v.string(),
  },
  handler: async (ctx, args) => {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    // Check if tokens are available and not the placeholder
    if (!token || !phoneId || token.includes("INSERT_YOUR_META")) {
      console.warn("WhatsApp API credentials missing or invalid. Skipping notification.");
      return { success: false, reason: "missing_credentials" };
    }

    // Format phone number to standard E.164 without '+' (usually required by Meta Cloud API)
    // For India, ensure it starts with 91 if it's 10 digits
    let formattedPhone = args.phone.replace(/[^0-9]/g, "");
    if (formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone;
    }

    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text", // Using a direct text message instead of template for maximum reliability during testing
          text: {
            preview_url: false,
            body: `Hi ${args.guestName},\n\nYour booking at ${args.hotelName} for ${args.checkIn} is confirmed!\n\nYour Booking Tracking Code is: *${args.trackingCode}*\n\nYou can use this code to manage your booking. We look forward to hosting you!`,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("WhatsApp API Error Response:", errorText);
        throw new Error(`Failed to send WhatsApp message: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("WhatsApp message sent successfully:", data);
      return { success: true, messageId: data?.messages?.[0]?.id };

    } catch (error) {
      console.error("Error dispatching WhatsApp notification:", error);
      // We don't want a notification failure to crash the booking confirmation
      return { success: false, error: String(error) };
    }
  },
});
