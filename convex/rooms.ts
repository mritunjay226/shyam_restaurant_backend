import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// GET ALL ROOMS
export const getAllRooms = query({
  handler: async (ctx) => {
    return await ctx.db.query("rooms").collect();
  },
});

// GET SINGLE ROOM
export const getRoomById = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  },
});

// GET ROOMS BY STATUS
export const getRoomsByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("status"), args.status))
      .collect();
  },
});

// ADD ROOM (admin)
export const addRoom = mutation({
  args: {
    roomNumber: v.string(),
    category: v.string(),
    floor: v.number(),
    tariff: v.number(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    amenities: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("rooms", {
      ...args,
      status: "available",
      isActive: true,
    });
  },
});

// UPDATE ROOM (admin)
export const updateRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    category: v.optional(v.string()),
    tariff: v.optional(v.number()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    amenities: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { roomId, ...updates } = args;
    return await ctx.db.patch(roomId, updates);
  },
});

// UPDATE ROOM TARIFF (admin)
export const updateRoomTariff = mutation({
  args: {
    roomId: v.id("rooms"),
    tariff: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.roomId, { tariff: args.tariff });
  },
});

// TOGGLE ROOM ACTIVE/INACTIVE (admin)
export const toggleRoomActive = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    return await ctx.db.patch(args.roomId, { isActive: !room.isActive });
  },
});

// UPDATE ROOM STATUS
export const updateRoomStatus = mutation({
  args: {
    roomId: v.id("rooms"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.roomId, { status: args.status });
  },
});