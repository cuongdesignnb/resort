import prisma from '../db';
import { format, differenceInDays } from 'date-fns';

export async function aggregateDailyStats(importJobId: string): Promise<void> {
  // 1. Fetch import job metadata
  const job = await prisma.importJob.findUnique({
    where: { id: importJobId },
  });

  if (!job) {
    throw new Error(`Import job ${importJobId} not found.`);
  }

  const { month, year } = job;

  // Clear existing daily stats for this job to prevent duplicates on re-runs
  await prisma.dailyStat.deleteMany({
    where: { importJobId },
  });

  // Calculate days in month
  const numDays = new Date(year, month, 0).getDate();
  const dateList: Date[] = [];
  for (let d = 1; d <= numDays; d++) {
    dateList.push(new Date(year, month - 1, d, 12, 0, 0));
  }

  // Fetch all bookings for this import job
  const bookings = await prisma.booking.findMany({
    where: { importJobId },
    include: {
      rooms: true,
      meals: true,
      services: true,
    },
  });

  const dailyStatsToCreate = [];

  // Loop through each day of the month
  for (const date of dateList) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayDate = new Date(dateStr);

    let checkinGuests = 0;
    let checkoutGuests = 0;
    let stayoverGuests = 0;
    let cancelledGuests = 0;
    let roomSold = 0;

    let breakfastPax = 0;
    let lunchPax = 0;
    let dinnerPax = 0;
    let galaPax = 0;
    let bbqPax = 0;

    let roomRevenue = 0;
    let foodRevenue = 0;
    let serviceRevenue = 0;

    for (const b of bookings) {
      const bCheckinStr = format(b.checkinAt, 'yyyy-MM-dd');
      const bCheckoutStr = format(b.checkoutAt, 'yyyy-MM-dd');

      const isCancelled = b.status === 'CANCELLED';

      if (isCancelled) {
        // If booking was cancelled and its date range covers today
        if (dateStr >= bCheckinStr && dateStr < bCheckoutStr) {
          cancelledGuests += b.totalGuests;
        }
        continue; // Don't add to active stats
      }

      // Check Guest Status
      if (bCheckinStr === dateStr) {
        checkinGuests += b.totalGuests;
      } else if (bCheckoutStr === dateStr) {
        checkoutGuests += b.totalGuests;
      } else if (dateStr > bCheckinStr && dateStr < bCheckoutStr) {
        stayoverGuests += b.totalGuests;
      }

      // Check room sold
      if (dateStr >= bCheckinStr && dateStr < bCheckoutStr) {
        roomSold += b.totalRooms;

        // Daily room revenue posting:
        // Split room revenue equally across booking nights
        const nights = differenceInDays(new Date(bCheckoutStr), new Date(bCheckinStr)) || 1;
        const totalRoomAmt = b.rooms.reduce((sum, r) => sum + r.amount, 0);
        roomRevenue += totalRoomAmt / nights;
      }

      // Aggregating Meals for today
      b.meals.forEach((m) => {
        const mDateStr = format(m.mealDate, 'yyyy-MM-dd');
        if (mDateStr === dateStr) {
          if (m.mealType === 'BREAKFAST') {
            breakfastPax += m.paxCount;
          } else if (m.mealType === 'LUNCH') {
            lunchPax += m.paxCount;
          } else if (m.mealType === 'DINNER') {
            dinnerPax += m.paxCount;
          } else if (m.mealType === 'GALA') {
            galaPax += m.paxCount;
          } else if (m.mealType === 'BBQ') {
            bbqPax += m.paxCount;
          }
          foodRevenue += m.amount;
        }
      });

      // Aggregating Services for today
      b.services.forEach((s) => {
        const sDateStr = format(s.serviceDate, 'yyyy-MM-dd');
        if (sDateStr === dateStr) {
          serviceRevenue += s.amount;
        }
      });
    }

    const totalRevenue = roomRevenue + foodRevenue + serviceRevenue;

    dailyStatsToCreate.push({
      importJobId,
      statDate: dayDate,
      checkinGuests,
      checkoutGuests,
      stayoverGuests,
      cancelledGuests,
      roomSold,
      roomNights: roomSold,
      breakfastPax,
      lunchPax,
      dinnerPax,
      galaPax,
      bbqPax,
      roomRevenue,
      foodRevenue,
      serviceRevenue,
      totalRevenue,
    });
  }

  // Bulk create daily stats in DB
  await prisma.dailyStat.createMany({
    data: dailyStatsToCreate,
  });
}
