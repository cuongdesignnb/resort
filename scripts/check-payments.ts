import prisma from '../src/lib/db';

async function checkPayments() {
  const bookings = await prisma.booking.findMany({
    take: 10,
    include: {
      payment: true,
      rooms: true,
      meals: true,
      services: true
    }
  });

  console.log('--- SAMPLE PAYMENTS IN DB ---');
  for (const b of bookings) {
    console.log(`Booking: ${b.bookingCode} - ${b.bookingName}`);
    console.log(`  Stated Total:  ${b.payment?.totalAmount}`);
    console.log(`  Deposit:       ${b.payment?.depositAmount}`);
    console.log(`  Remaining:     ${b.payment?.remainingAmount}`);
    if (b.rooms.length > 0) {
      console.log(`  Rooms Amount:  ${b.rooms.map(r => `${r.roomName}: Qty ${r.quantity} * ${r.nights} nights @ ${r.unitPrice} = ${r.amount}`).join(', ')}`);
    }
    if (b.meals.length > 0) {
      console.log(`  Meals Amount:  ${b.meals.map(m => `${m.mealType}: Qty ${m.quantity} * ${m.unitPrice} = ${m.amount}`).join(', ')}`);
    }
    if (b.services.length > 0) {
      console.log(`  Services:      ${b.services.map(s => `${s.serviceName}: Qty ${s.quantity} * ${s.unitPrice} = ${s.amount}`).join(', ')}`);
    }
    console.log('-----------------------------');
  }

  await prisma.$disconnect();
}

checkPayments();
