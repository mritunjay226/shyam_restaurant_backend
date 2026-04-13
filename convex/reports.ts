import { query } from "./_generated/server";
import { v } from "convex/values";

// MONTHLY REVENUE REPORT
export const getMonthlyReport = query({
  args: { month: v.string() }, // "2024-11"
  handler: async (ctx, args) => {
    const allBills = await ctx.db.query("bills").collect();
    const monthlyBills = allBills.filter((bill) =>
      bill.createdAt.startsWith(args.month)
    );

    // breakdown by type
    const roomBills = monthlyBills.filter((b) => b.billType === "room");
    const restaurantBills = monthlyBills.filter((b) => b.billType === "restaurant");
    const cafeBills = monthlyBills.filter((b) => b.billType === "cafe");
    const banquetBills = monthlyBills.filter((b) => b.billType === "banquet");

    const sum = (bills: typeof monthlyBills) =>
      bills.reduce((acc, b) => acc + b.totalAmount, 0);

    const gstSum = (bills: typeof monthlyBills) =>
      bills.reduce((acc, b) => acc + b.cgst + b.sgst, 0);

    return {
      month: args.month,
      rooms: {
        count: roomBills.length,
        revenue: Math.round(sum(roomBills) * 100) / 100,
        gstCollected: Math.round(gstSum(roomBills) * 100) / 100,
      },
      restaurant: {
        count: restaurantBills.length,
        revenue: Math.round(sum(restaurantBills) * 100) / 100,
        gstCollected: Math.round(gstSum(restaurantBills) * 100) / 100,
      },
      cafe: {
        count: cafeBills.length,
        revenue: Math.round(sum(cafeBills) * 100) / 100,
        gstCollected: Math.round(gstSum(cafeBills) * 100) / 100,
      },
      banquet: {
        count: banquetBills.length,
        revenue: Math.round(sum(banquetBills) * 100) / 100,
        gstCollected: Math.round(gstSum(banquetBills) * 100) / 100,
      },
      total: {
        count: monthlyBills.length,
        revenue: Math.round(sum(monthlyBills) * 100) / 100,
        gstCollected: Math.round(gstSum(monthlyBills) * 100) / 100,
      },
    };
  },
});

// YEARLY REPORT — all 12 months
export const getYearlyReport = query({
  args: { year: v.string() }, // "2024"
  handler: async (ctx, args) => {
    const allBills = await ctx.db.query("bills").collect();
    const yearlyBills = allBills.filter((bill) =>
      bill.createdAt.startsWith(args.year)
    );

    const months = Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, "0");
      return `${args.year}-${month}`;
    });

    return months.map((month) => {
      const bills = yearlyBills.filter((b) => b.createdAt.startsWith(month));

      return {
        month,
        rooms: bills
          .filter((b) => b.billType === "room")
          .reduce((acc, b) => acc + b.totalAmount, 0),
        restaurant: bills
          .filter((b) => b.billType === "restaurant")
          .reduce((acc, b) => acc + b.totalAmount, 0),
        cafe: bills
          .filter((b) => b.billType === "cafe")
          .reduce((acc, b) => acc + b.totalAmount, 0),
        banquet: bills
          .filter((b) => b.billType === "banquet")
          .reduce((acc, b) => acc + b.totalAmount, 0),
        total: bills.reduce((acc, b) => acc + b.totalAmount, 0),
      };
    });
  },
});

// DASHBOARD STATS — today
export const getDashboardStats = query({
  args: { today: v.string() }, // "2024-11-14"
  handler: async (ctx, args) => {
    // room stats
    const allRooms = await ctx.db.query("rooms").collect();
    const occupiedRooms = allRooms.filter(
      (r) => r.status === "occupied"
    ).length;
    const availableRooms = allRooms.filter(
      (r) => r.status === "available" && r.isActive
    ).length;
    const pendingCheckouts = allRooms.filter(
      (r) => r.status === "pending_checkout"
    ).length;

    // today's revenue
    const todayBills = await ctx.db
      .query("bills")
      .filter((q) => q.eq(q.field("createdAt"), args.today))
      .collect();

    const todayRevenue = todayBills.reduce(
      (acc, b) => acc + b.totalAmount,
      0
    );

    // today's arrivals
    const todayArrivals = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("checkIn"), args.today),
          q.eq(q.field("status"), "confirmed")
        )
      )
      .collect();

    // today's departures
    const todayDepartures = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("checkOut"), args.today),
          q.eq(q.field("status"), "checked_in")
        )
      )
      .collect();

    // recent bookings (last 5)
    const recentBookings = await ctx.db
      .query("bookings")
      .order("desc")
      .take(5);

    return {
      rooms: {
        total: allRooms.length,
        occupied: occupiedRooms,
        available: availableRooms,
        pendingCheckout: pendingCheckouts,
      },
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      todayArrivals: todayArrivals.length,
      todayDepartures: todayDepartures.length,
      recentBookings,
    };
  },
});

// WEEKLY REVENUE CHART DATA
export const getWeeklyRevenue = query({
  args: { today: v.string() }, // "2024-11-14"
  handler: async (ctx, args) => {
    const dates = [];
    const _d = new Date(args.today);
    for (let i = 6; i >= 0; i--) {
      const temp = new Date(_d);
      temp.setDate(temp.getDate() - i);
      const yyyy = temp.getFullYear();
      const mm = String(temp.getMonth() + 1).padStart(2, "0");
      const dd = String(temp.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }

    const allBills = await ctx.db.query("bills").collect();

    return dates.map((dateStr) => {
      const dayBills = allBills.filter((b) => b.createdAt === dateStr);
      const total = dayBills.reduce((acc, b) => acc + b.totalAmount, 0);
      
      const dateObj = new Date(dateStr);
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });

      return {
        day: dayName,
        v: Math.round(total * 100) / 100,
      };
    });
  },
});

// 30-DAY OCCUPANCY TREND
export const getOccupancyTrend = query({
  args: { today: v.string() }, // "2024-11-14"
  handler: async (ctx, args) => {
    const dates = [];
    const _d = new Date(args.today);
    for (let i = 29; i >= 0; i--) {
      const temp = new Date(_d);
      temp.setDate(temp.getDate() - i);
      const yyyy = temp.getFullYear();
      const mm = String(temp.getMonth() + 1).padStart(2, "0");
      const dd = String(temp.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }

    const allRooms = await ctx.db.query("rooms").collect();
    const totalRooms = allRooms.length || 1; // avoid division by zero

    const allBookings = await ctx.db.query("bookings").collect();
    const validBookings = allBookings.filter(b => b.status !== "cancelled");

    return dates.map((dateStr) => {
      const occupiedOnDate = validBookings.filter(b => {
        // Simple occupied check: dateStr is between checkIn and checkOut
        return b.checkIn <= dateStr && b.checkOut > dateStr;
      }).length;

      const rate = Math.round((occupiedOnDate / totalRooms) * 100);
      
      const dateObj = new Date(dateStr);
      // Format as "5th", "10th" etc just for brief display or "Dec 10"
      const dayNum = dateObj.getDate();
      let suffix = "th";
      if (dayNum % 10 === 1 && dayNum !== 11) suffix = "st";
      else if (dayNum % 10 === 2 && dayNum !== 12) suffix = "nd";
      else if (dayNum % 10 === 3 && dayNum !== 13) suffix = "rd";

      return {
        name: `${dayNum}${suffix}`,
        rate,
      };
    });
  },
});