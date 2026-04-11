export type RoomCategory = 'Luxury' | 'Premium' | 'Suite';
export type RoomStatus = 'Available' | 'Occupied' | 'Pending Checkout';

export interface RoomData {
  id: string;
  roomNumber: string;
  floor: number;
  category: RoomCategory;
  tariff: number;
  status: RoomStatus;
  guestName?: string;
  checkInDate?: string;
  nights?: number;
}

export const ROOMS: RoomData[] = [
  // Floor 1
  { id: '101', roomNumber: '101', floor: 1, category: 'Premium', tariff: 2500, status: 'Available' },
  { id: '102', roomNumber: '102', floor: 1, category: 'Premium', tariff: 2500, status: 'Occupied', guestName: 'Rahul Sharma', checkInDate: '2 days ago', nights: 2 },
  { id: '103', roomNumber: '103', floor: 1, category: 'Premium', tariff: 2500, status: 'Available' },
  { id: '104', roomNumber: '104', floor: 1, category: 'Premium', tariff: 2500, status: 'Available' },
  { id: '105', roomNumber: '105', floor: 1, category: 'Premium', tariff: 2500, status: 'Pending Checkout', guestName: 'Neha Gupta', checkInDate: '1 day ago', nights: 1 },
  { id: '106', roomNumber: '106', floor: 1, category: 'Luxury', tariff: 4500, status: 'Occupied', guestName: 'Priya Patel', checkInDate: 'today', nights: 0 },
  { id: '107', roomNumber: '107', floor: 1, category: 'Luxury', tariff: 4500, status: 'Available' },
  { id: '108', roomNumber: '108', floor: 1, category: 'Luxury', tariff: 4500, status: 'Available' },
  { id: '109', roomNumber: '109', floor: 1, category: 'Luxury', tariff: 4500, status: 'Occupied', guestName: 'Vikram Joshi', checkInDate: '1 day ago', nights: 1 },
  { id: '110', roomNumber: '110', floor: 1, category: 'Luxury', tariff: 4500, status: 'Available' },
  
  // Floor 2
  { id: '201', roomNumber: '201', floor: 2, category: 'Suite', tariff: 7500, status: 'Occupied', guestName: 'Amit Singh', checkInDate: '3 days ago', nights: 3 },
  { id: '202', roomNumber: '202', floor: 2, category: 'Suite', tariff: 7500, status: 'Available' },
  { id: '203', roomNumber: '203', floor: 2, category: 'Suite', tariff: 7500, status: 'Occupied', guestName: 'Sunita Verma', checkInDate: 'today', nights: 0 },
  { id: '204', roomNumber: '204', floor: 2, category: 'Suite', tariff: 7500, status: 'Available' },
  { id: '205', roomNumber: '205', floor: 2, category: 'Suite', tariff: 7500, status: 'Available' },
  { id: '206', roomNumber: '206', floor: 2, category: 'Suite', tariff: 7500, status: 'Pending Checkout', guestName: 'Rajesh Kumar', checkInDate: '2 days ago', nights: 2 },
  { id: '207', roomNumber: '207', floor: 2, category: 'Suite', tariff: 7500, status: 'Available' },
];

export type MenuItemType = 'Food' | 'Beverage';
export type MenuCategory = 'Starters' | 'Main Course' | 'Breads' | 'Desserts' | 'Beverages' | 'Coffees' | 'Teas' | 'Cold Drinks' | 'Snacks' | 'Bakery';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  type: MenuItemType;
  isVeg?: boolean;
}

export const RESTAURANT_MENU: MenuItem[] = [
  // Starters
  { id: 'r1', name: 'Paneer Tikka', category: 'Starters', price: 280, type: 'Food', isVeg: true },
  { id: 'r2', name: 'Veg Seekh Kebab', category: 'Starters', price: 260, type: 'Food', isVeg: true },
  
  // Main Course
  { id: 'r3', name: 'Dal Makhani', category: 'Main Course', price: 280, type: 'Food', isVeg: true },
  { id: 'r4', name: 'Paneer Butter Masala', category: 'Main Course', price: 320, type: 'Food', isVeg: true },
  { id: 'r5', name: 'Veg Biryani', category: 'Main Course', price: 350, type: 'Food', isVeg: true },
  { id: 'r6', name: 'Chicken Biryani', category: 'Main Course', price: 420, type: 'Food', isVeg: false },
  { id: 'r7', name: 'Butter Chicken', category: 'Main Course', price: 380, type: 'Food', isVeg: false },
  
  // Breads
  { id: 'r8', name: 'Butter Naan', category: 'Breads', price: 60, type: 'Food', isVeg: true },
  { id: 'r9', name: 'Tandoori Roti', category: 'Breads', price: 40, type: 'Food', isVeg: true },
  { id: 'r10', name: 'Paratha', category: 'Breads', price: 80, type: 'Food', isVeg: true },
  
  // Desserts
  { id: 'r11', name: 'Gulab Jamun', category: 'Desserts', price: 120, type: 'Food', isVeg: true },
  { id: 'r12', name: 'Kheer', category: 'Desserts', price: 100, type: 'Food', isVeg: true },
  { id: 'r13', name: 'Kulfi', category: 'Desserts', price: 140, type: 'Food', isVeg: true },
  
  // Beverages
  { id: 'r14', name: 'Masala Chai', category: 'Beverages', price: 60, type: 'Beverage', isVeg: true },
  { id: 'r15', name: 'Fresh Lime Soda', category: 'Beverages', price: 80, type: 'Beverage', isVeg: true },
  { id: 'r16', name: 'Lassi', category: 'Beverages', price: 100, type: 'Beverage', isVeg: true },
  { id: 'r17', name: 'Mango Shake', category: 'Beverages', price: 140, type: 'Beverage', isVeg: true },
];

export const CAFE_MENU: MenuItem[] = [
  // Coffees
  { id: 'c1', name: 'Espresso', category: 'Coffees', price: 120, type: 'Beverage', isVeg: true },
  { id: 'c2', name: 'Cappuccino', category: 'Coffees', price: 150, type: 'Beverage', isVeg: true },
  { id: 'c3', name: 'Cold Coffee', category: 'Coffees', price: 180, type: 'Beverage', isVeg: true },
  { id: 'c4', name: 'Cold Brew', category: 'Coffees', price: 200, type: 'Beverage', isVeg: true },
  { id: 'c5', name: 'Latte', category: 'Coffees', price: 160, type: 'Beverage', isVeg: true },
  
  // Teas
  { id: 'c6', name: 'Masala Chai', category: 'Teas', price: 80, type: 'Beverage', isVeg: true },
  { id: 'c7', name: 'Green Tea', category: 'Teas', price: 90, type: 'Beverage', isVeg: true },
  { id: 'c8', name: 'Herbal Tea', category: 'Teas', price: 100, type: 'Beverage', isVeg: true },
  
  // Cold Drinks
  { id: 'c9', name: 'Fruit Smoothie', category: 'Cold Drinks', price: 180, type: 'Beverage', isVeg: true },
  { id: 'c10', name: 'Fresh Juice', category: 'Cold Drinks', price: 140, type: 'Beverage', isVeg: true },
  
  // Snacks
  { id: 'c11', name: 'Club Sandwich', category: 'Snacks', price: 220, type: 'Food', isVeg: true },
  { id: 'c12', name: 'Veg Wrap', category: 'Snacks', price: 200, type: 'Food', isVeg: true },
  { id: 'c13', name: 'French Fries', category: 'Snacks', price: 160, type: 'Food', isVeg: true },
  
  // Bakery
  { id: 'c14', name: 'Croissant', category: 'Bakery', price: 140, type: 'Food', isVeg: true },
  { id: 'c15', name: 'Brownie', category: 'Bakery', price: 160, type: 'Food', isVeg: true },
  { id: 'c16', name: 'Muffin', category: 'Bakery', price: 120, type: 'Food', isVeg: true },
];

export interface BanquetHall {
  id: string;
  name: string;
  capacity: number;
  status: 'Available' | 'Booked Today';
  upcomingBookings: number;
}

export const BANQUET_HALLS: BanquetHall[] = [
  { id: 'b1', name: 'The Grand Ballroom', capacity: 500, status: 'Available', upcomingBookings: 3 },
  { id: 'b2', name: 'The Royal Hall', capacity: 300, status: 'Booked Today', upcomingBookings: 2 },
  { id: 'b3', name: 'The Garden Terrace', capacity: 150, status: 'Available', upcomingBookings: 2 },
  { id: 'b4', name: 'The Executive Suite', capacity: 50, status: 'Available', upcomingBookings: 3 },
];

export interface BanquetBooking {
  id: string;
  hallId: string;
  eventName: string;
  eventType: 'Wedding' | 'Corporate' | 'Birthday' | 'Social';
  date: string;
  guestName: string;
  guestCount: number;
  amount: number;
  status: 'Confirmed' | 'Completed';
}

export const BANQUET_BOOKINGS: BanquetBooking[] = [
  { id: 'bb1', hallId: 'b1', eventName: 'Sharma Wedding Reception', eventType: 'Wedding', date: '2026-05-12', guestName: 'Vinay Sharma', guestCount: 450, amount: 250000, status: 'Confirmed' },
  { id: 'bb2', hallId: 'b2', eventName: 'TechCorp Annual Meet', eventType: 'Corporate', date: 'Today', guestName: 'Anil Desai', guestCount: 200, amount: 120000, status: 'Confirmed' },
  { id: 'bb3', hallId: 'b3', eventName: 'Aarav 5th Birthday', eventType: 'Birthday', date: '2026-04-20', guestName: 'Kajal Patel', guestCount: 100, amount: 75000, status: 'Confirmed' },
];

export const TODAY_DATA = {
  arrivals: [
    { guest: 'Priya Patel', room: '106', status: 'Checked In', time: '10:30 AM' },
    { guest: 'Sunita Verma', room: '203', status: 'Confirmed', time: '02:00 PM' },
    { guest: 'Deepak Mehta', room: '103', status: 'Confirmed', time: '04:00 PM' },
  ],
  departures: [
    { guest: 'Neha Gupta', room: '105', status: 'Pending Checkout', time: '11:00 AM' },
    { guest: 'Rajesh Kumar', room: '206', status: 'Pending Checkout', time: '12:00 PM' },
  ],
  recentTransactions: [
    { id: 'tx1', description: 'Room 201 Advance', amount: 5000, time: '10:15 AM', type: 'Room' },
    { id: 'tx2', description: 'Restaurant Bill #4042', amount: 1250, time: '10:45 AM', type: 'Restaurant' },
    { id: 'tx3', description: 'Cafe Bill #1085', amount: 450, time: '11:10 AM', type: 'Cafe' },
    { id: 'tx4', description: 'Room 102 Checkout', amount: 7500, time: '11:30 AM', type: 'Room' },
    { id: 'tx5', description: 'Banquet Advance', amount: 50000, time: '12:05 PM', type: 'Banquet' },
  ],
  revenue: {
    total: 24500,
    rooms: 12500,
    restaurant: 7500,
    cafe: 4500,
    banquet: 0,
  }
};
