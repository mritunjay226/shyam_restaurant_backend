import { httpRouter } from "convex/server";
import { razorpayWebhook } from "./razorpay_webhook";

const http = httpRouter();

http.route({
  path: "/razorpay-webhook",
  method: "POST",
  handler: razorpayWebhook,
});

export default http;
