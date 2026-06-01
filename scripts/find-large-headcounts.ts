import prisma from '../src/lib/db';

async function run() {
  console.log('--- SEARCHING FOR LARGE COUNTS IN DB ---');
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        rooms: true,
        meals: true,
        services: true,
        payment: true,
      }
    });

    console.log(`Checking ${bookings.length} bookings...`);

    for (const b of bookings) {
      const hasLargeGuests = b.adults >= 100 || b.totalGuests >= 100;
      const largeRooms = b.rooms.filter(r => r.quantity >= 100 || r.amount >= 1000000000);
      const largeMeals = b.meals.filter(m => m.quantity >= 100 || m.paxCount >= 100);
      const largeServices = b.services.filter(s => s.quantity >= 100 || s.amount >= 1000000000);

      if (hasLargeGuests || largeRooms.length > 0 || largeMeals.length > 0 || largeServices.length > 0) {
        console.log(`\nSUSPICIOUS BOOKING: ${b.bookingCode} (${b.bookingName})`);
        console.log(`  Source URL: ${b.sourceUrl}`);
        console.log(`  Guests: Adults: ${b.adults}, Kids6-11: ${b.children6To11}, Kids<6: ${b.childrenUnder6}, Total: ${b.totalGuests}`);
        if (largeRooms.length > 0) {
          console.log(`  Rooms with large quantity/amount:`);
          for (const r of largeRooms) {
            console.log(`    - ${r.roomName}: Qty ${r.quantity}, Price ${r.unitPrice}, Amount ${r.amount}`);
          }
        }
        if (largeMeals.length > 0) {
          console.log(`  Meals with large quantity/pax:`);
          for (const m of largeMeals) {
            console.log(`    - ${m.serviceName}: Qty ${m.quantity}, Pax ${m.paxCount}, Unit ${m.unit}, Price ${m.unitPrice}, Amount ${m.amount}`);
          }
        }
        if (largeServices.length > 0) {
          console.log(`  Services with large quantity/amount:`);
          for (const s of largeServices) {
            console.log(`    - ${s.serviceName}: Qty ${s.quantity}, Price ${s.unitPrice}, Amount ${s.amount}`);
          }
        }
        if (b.payment) {
          console.log(`  Payment: Total ${b.payment.totalAmount}, Deposit ${b.payment.depositAmount}, Remaining ${b.payment.remainingAmount}`);
        }
      }
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
