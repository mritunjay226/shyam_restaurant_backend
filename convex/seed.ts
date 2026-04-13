import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const dummyRooms = [
  { roomNumber: "101", floor: 1, category: "Premium", tariff: 4500, status: "available", isActive: true },
  { roomNumber: "102", floor: 1, category: "Premium", tariff: 4500, status: "available", isActive: true },
  { roomNumber: "103", floor: 1, category: "Premium", tariff: 4500, status: "available", isActive: true },
  { roomNumber: "104", floor: 1, category: "Suite", tariff: 6500, status: "available", isActive: true },
  { roomNumber: "105", floor: 1, category: "Suite", tariff: 6500, status: "available", isActive: true },
  { roomNumber: "201", floor: 2, category: "Luxury", tariff: 5500, status: "available", isActive: true },
  { roomNumber: "202", floor: 2, category: "Luxury", tariff: 5500, status: "available", isActive: true },
  { roomNumber: "203", floor: 2, category: "Luxury", tariff: 5500, status: "available", isActive: true },
  { roomNumber: "204", floor: 2, category: "Suite", tariff: 8500, status: "available", isActive: true },
  { roomNumber: "205", floor: 2, category: "Suite", tariff: 8500, status: "available", isActive: true },
];

const dummyMenu = [
  // Restaurant Items
  { name: "Paneer Tikka", category: "Food", subCategory: "Starters", price: 350, outlet: "restaurant", isAvailable: true },
  { name: "Chicken Reshmi Kebab", category: "Food", subCategory: "Starters", price: 420, outlet: "restaurant", isAvailable: true },
  { name: "Dal Makhani", category: "Food", subCategory: "Main Course", price: 280, outlet: "restaurant", isAvailable: true },
  { name: "Butter Chicken", category: "Food", subCategory: "Main Course", price: 450, outlet: "restaurant", isAvailable: true },
  { name: "Garlic Naan", category: "Food", subCategory: "Breads", price: 80, outlet: "restaurant", isAvailable: true },
  { name: "Fresh Lime Soda", category: "Beverage", subCategory: "Beverages", price: 120, outlet: "restaurant", isAvailable: true },
  
  // Cafe Items
  { name: "Cappuccino", category: "Beverage", subCategory: "Coffees", price: 180, outlet: "cafe", isAvailable: true },
  { name: "Iced Latte", category: "Beverage", subCategory: "Coffees", price: 210, outlet: "cafe", isAvailable: true },
  { name: "Masala Chai", category: "Beverage", subCategory: "Teas", price: 120, outlet: "cafe", isAvailable: true },
  { name: "Margherita Pizza", category: "Food", subCategory: "Snacks", price: 450, outlet: "cafe", isAvailable: true },
  { name: "Club Sandwich", category: "Food", subCategory: "Snacks", price: 320, outlet: "cafe", isAvailable: true },
  { name: "Blueberry Muffin", category: "Food", subCategory: "Bakery", price: 160, outlet: "cafe", isAvailable: true },
];

export const init = internalMutation({
  handler: async (ctx) => {
    // Optionally clear out existing items to prevent duplicates if desired,
    // but here we just append so it works gracefully on empty dbs.

    const roomsAdded = await Promise.all(
      dummyRooms.map((room) => ctx.db.insert("rooms", room))
    );

    const itemsAdded = await Promise.all(
      dummyMenu.map((item) => ctx.db.insert("menuItems", item))
    );

    return { rooms: roomsAdded.length, menuItems: itemsAdded.length };
  },
});
