import { query } from "./_generated/server";
import { v } from "convex/values";

// MONTHLY REVENUE REPORT
export const getMonthlyReport = query({
  args: { month: v.string() }, // "2024-11"
  handler: async (ctx, args) => {
    const monthlyBills = await ctx.db
      .query("bills")
      .withIndex("by_createdAt", (q: any) =>
        q.gte("createdAt", args.month).lte("createdAt", args.month + "\uffff")
      )
      .collect();

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
    const yearlyBills = await ctx.db
      .query("bills")
      .withIndex("by_createdAt", (q: any) =>
        q.gte("createdAt", args.year).lte("createdAt", args.year + "\uffff")
      )
      .collect();

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
      .withIndex("by_createdAt", (q: any) => q.eq("createdAt", args.today))
      .collect();

    const todayRevenue = todayBills.reduce(
      (acc, b) => acc + b.totalAmount,
      0
    );

    // today's arrivals
    const todayArrivals = await ctx.db
      .query("bookings")
      .withIndex("by_checkIn", (q: any) => q.eq("checkIn", args.today))
      .filter((q: any) => q.eq(q.field("status"), "confirmed"))
      .collect();

    // today's departures
    const todayDepartures = await ctx.db
      .query("bookings")
      .withIndex("by_checkOut", (q: any) => q.eq("checkOut", args.today))
      .filter((q: any) => q.eq(q.field("status"), "checked_in"))
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

    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    const weekBills = await ctx.db
      .query("bills")
      .withIndex("by_createdAt", (q: any) =>
        q.gte("createdAt", startDate).lte("createdAt", endDate)
      )
      .collect();

    return dates.map((dateStr) => {
      const dayBills = weekBills.filter((b) => b.createdAt === dateStr);
      const total = dayBills.reduce((acc, b) => acc + b.totalAmount, 0);
      
      const dateObj = new Date(dateStr);
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });

      return {
        day: dayName,
        hotel: Math.round(dayBills.filter(b => b.billType === "room").reduce((acc, b) => acc + b.totalAmount, 0) * 100) / 100,
        restaurant: Math.round(dayBills.filter(b => b.billType === "restaurant").reduce((acc, b) => acc + b.totalAmount, 0) * 100) / 100,
        cafe: Math.round(dayBills.filter(b => b.billType === "cafe").reduce((acc, b) => acc + b.totalAmount, 0) * 100) / 100,
        banquet: Math.round(dayBills.filter(b => b.billType === "banquet").reduce((acc, b) => acc + b.totalAmount, 0) * 100) / 100,
        v: Math.round(total * 100) / 100,
      };
    });
  },
});

// PER-OUTLET DAILY REVENUE
export const getOutletDailyRevenue = query({
  args: { today: v.string() },
  handler: async (ctx, args) => {
    const todayBills = await ctx.db
      .query("bills")
      .withIndex("by_createdAt", (q: any) => q.eq("createdAt", args.today))
      .collect();

    const sum = (type: string) =>
      todayBills.filter((b) => b.billType === type).reduce((acc, b) => acc + b.totalAmount, 0);

    return {
      hotel: Math.round(sum("room") * 100) / 100,
      restaurant: Math.round(sum("restaurant") * 100) / 100,
      cafe: Math.round(sum("cafe") * 100) / 100,
      banquet: Math.round(sum("banquet") * 100) / 100,
    };
  },
});

// HELPER: Calculate Occupancy Trend
async function calculateOccupancyTrend(ctx: any, today: string) {
  const dates = [];
  const _d = new Date(today);
  for (let i = 29; i >= 0; i--) {
    const temp = new Date(_d);
    temp.setDate(temp.getDate() - i);
    const yyyy = temp.getFullYear();
    const mm = String(temp.getMonth() + 1).padStart(2, "0");
    const dd = String(temp.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  const allRooms = await ctx.db.query("rooms").collect();
  const totalRooms = allRooms.length || 1;

  // Optimize by only fetching bookings that could possibly overlap this 30-day window
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  
  const relevantBookings = await ctx.db
    .query("bookings")
    .withIndex("by_checkIn", (q: any) => q.lte("checkIn", lastDate))
    .collect();

  const validBookings = relevantBookings.filter((b: any) => 
    b.status !== "cancelled" && b.checkOut >= firstDate
  );

  return dates.map((dateStr) => {
    const occupiedOnDate = validBookings.filter((b: any) => {
      return b.checkIn <= dateStr && b.checkOut > dateStr;
    }).length;

    const rate = Math.round((occupiedOnDate / totalRooms) * 100);
    
    const dateObj = new Date(dateStr);
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
}

// 30-DAY OCCUPANCY TREND
export const getOccupancyTrend = query({
  args: { today: v.string() },
  handler: async (ctx, args) => {
    return calculateOccupancyTrend(ctx, args.today);
  },
});

// SUMMARY KPI STATS
export const getSummaryStats = query({
  args: { today: v.string(), year: v.string() },
  handler: async (ctx, args) => {
    // 1. YTD Revenue
    const ytdBills = await ctx.db
      .query("bills")
      .withIndex("by_createdAt", (q: any) =>
        q.gte("createdAt", `${args.year}-01-01`).lte("createdAt", `${args.year}-12-31`)
      )
      .collect();

    const ytdRevenue = ytdBills.reduce((acc: number, b: any) => acc + b.totalAmount, 0);

    // 2. Avg Stay (Nights)
    // For avg stay, we target checked_out bookings from this year
    const ytdBookings = await ctx.db
      .query("bookings")
      .withIndex("by_checkOut", (q: any) =>
        q.gte("checkOut", `${args.year}-01-01`).lte("checkOut", `${args.year}-12-31`)
      )
      .collect();

    const validBookings = ytdBookings.filter((b: any) => b.status === "checked_out" || b.status === "checked_in");
    let totalNights = 0;
    validBookings.forEach((b: any) => {
      const start = new Date(b.checkIn);
      const end = new Date(b.checkOut);
      const nights = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
      totalNights += nights;
    });
    const avgStay = validBookings.length > 0 ? Math.round((totalNights / validBookings.length) * 10) / 10 : 0;

    // 3. Total Events (YTD)
    const ytdBanquet = await ctx.db
      .query("banquetBookings")
      .withIndex("by_eventDate", (q: any) =>
        q.gte("eventDate", `${args.year}-01-01`).lte("eventDate", `${args.year}-12-31`)
      )
      .collect();

    const totalEvents = ytdBanquet.filter((b: any) => b.status !== "cancelled").length;

    // 4. Avg Occupancy (Last 30 days)
    const occupancyTrend = await calculateOccupancyTrend(ctx, args.today);
    const avgOccupancy = occupancyTrend.length > 0 
      ? Math.round(occupancyTrend.reduce((acc: number, cur: any) => acc + cur.rate, 0) / occupancyTrend.length) 
      : 0;

    // 5. Sparklines (Last 10 points)
    const tenDaysAgo = new Date(args.today);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const tenDaysAgoStr = tenDaysAgo.toISOString().split("T")[0];

    // Fetch the raw data for sparklines in a single indexed query
    const sparkBills = ytdBills.filter(b => b.createdAt >= tenDaysAgoStr);
    const sparkBanquet = ytdBanquet.filter(b => b.eventDate >= tenDaysAgoStr);

    const sparkRevenue = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(args.today);
      d.setDate(d.getDate() - (9 - i));
      const ds = d.toISOString().split("T")[0];
      return sparkBills
        .filter((b: any) => b.createdAt === ds)
        .reduce((acc: number, b: any) => acc + b.totalAmount, 0);
    });

    const sparkOccupancy = occupancyTrend.slice(-10).map((o: any) => o.rate);
    
    const sparkGuests = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(args.today);
      d.setDate(d.getDate() - (9 - i));
      const ds = d.toISOString().split("T")[0];
      // Reuse the occupancy trend logic roughly
      return validBookings.filter((b: any) => b.checkIn <= ds && b.checkOut > ds).length;
    });

    const sparkEvents = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(args.today);
      d.setDate(d.getDate() - (9 - i));
      const ds = d.toISOString().split("T")[0];
      return sparkBanquet.filter((b: any) => b.eventDate === ds && b.status !== "cancelled").length;
    });

    return {
      ytdRevenue: Math.round(ytdRevenue),
      avgStay,
      avgOccupancy,
      totalEvents,
      sparklines: {
        revenue: sparkRevenue,
        occupancy: sparkOccupancy,
        guests: sparkGuests,
        events: sparkEvents
      }
    };
  },
});