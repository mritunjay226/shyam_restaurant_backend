import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

export const razorpayWebhook = httpAction(async (ctx, request) => {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret || !signature) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Use Web Crypto API instead of Node.js crypto
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const expectedSignature = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (signature !== expectedSignature) {
    return new Response("Invalid signature", { status: 400 });
  }

  const payload = JSON.parse(body);
  const event = payload.event;

  if (event === "payment.captured" || event === "order.paid") {
    const payment = payload.payload.payment?.entity;
    const orderId = payment?.order_id || payload.payload.order?.entity?.id;
    const paymentId = payment?.id || "N/A";

    if (orderId) {
      console.log("Processing payment capture for Order:", orderId);
      await ctx.runMutation(api.bookings.confirmPaymentByOrderId, {
        razorpayOrderId: orderId,
        paymentId: paymentId,
      });
    }
  }

  return new Response("OK", { status: 200 });
});
