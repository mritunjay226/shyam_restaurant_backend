/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiChatbot from "../aiChatbot.js";
import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as banquet from "../banquet.js";
import type * as banquetMenu from "../banquetMenu.js";
import type * as billing from "../billing.js";
import type * as bookings from "../bookings.js";
import type * as grocery from "../grocery.js";
import type * as guests from "../guests.js";
import type * as http from "../http.js";
import type * as menuItems from "../menuItems.js";
import type * as orders from "../orders.js";
import type * as razorpay from "../razorpay.js";
import type * as razorpay_webhook from "../razorpay_webhook.js";
import type * as reports from "../reports.js";
import type * as rooms from "../rooms.js";
import type * as salary from "../salary.js";
import type * as seed from "../seed.js";
import type * as seed2 from "../seed2.js";
import type * as settings from "../settings.js";
import type * as staff from "../staff.js";
import type * as wipe from "../wipe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiChatbot: typeof aiChatbot;
  attendance: typeof attendance;
  auth: typeof auth;
  banquet: typeof banquet;
  banquetMenu: typeof banquetMenu;
  billing: typeof billing;
  bookings: typeof bookings;
  grocery: typeof grocery;
  guests: typeof guests;
  http: typeof http;
  menuItems: typeof menuItems;
  orders: typeof orders;
  razorpay: typeof razorpay;
  razorpay_webhook: typeof razorpay_webhook;
  reports: typeof reports;
  rooms: typeof rooms;
  salary: typeof salary;
  seed: typeof seed;
  seed2: typeof seed2;
  settings: typeof settings;
  staff: typeof staff;
  wipe: typeof wipe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
