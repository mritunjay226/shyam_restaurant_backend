/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as banquet from "../banquet.js";
import type * as billing from "../billing.js";
import type * as bookings from "../bookings.js";
import type * as guests from "../guests.js";
import type * as menuItems from "../menuItems.js";
import type * as orders from "../orders.js";
import type * as reports from "../reports.js";
import type * as rooms from "../rooms.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as staff from "../staff.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  banquet: typeof banquet;
  billing: typeof billing;
  bookings: typeof bookings;
  guests: typeof guests;
  menuItems: typeof menuItems;
  orders: typeof orders;
  reports: typeof reports;
  rooms: typeof rooms;
  seed: typeof seed;
  settings: typeof settings;
  staff: typeof staff;
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
