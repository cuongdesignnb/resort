import { parseBookingFile } from '../src/lib/parser/booking-parser';
import path from 'path';

async function testSingle() {
  const files = process.argv[2] ? [process.argv[2]] : [
    '1h4lVYwC2PNAMZLlmVWHU9FEOTnZsndV9wya8QgOVa_k.xlsx',
    '1W2fuENEHOVMQ3LoYsBXhJ0sbtuM98KXc.xlsx',
    '1OlaYNcJkcTkNjyRkb3Yx2plT21jcKOxNerG8jOy64wE.xlsx'
  ];

  for (const f of files) {
    const filePath = path.join(__dirname, '../tmp/booking_cache', f);
    console.log(`\n===========================================`);
    console.log(`TESTING FILE: ${f}`);
    try {
      const parsed = await parseBookingFile(filePath, undefined, undefined, 2026);
      console.log(`  - Booking Code:  ${parsed.bookingCode}`);
      console.log(`  - Booking Name:  ${parsed.bookingName}`);
      console.log(`  - Customer Name: ${parsed.customerName}`);
      console.log(`  - Check-in:      ${parsed.checkinAt.toISOString().split('T')[0]}`);
      console.log(`  - Check-out:     ${parsed.checkoutAt.toISOString().split('T')[0]}`);
      console.log(`  - Guests Count:  ${parsed.totalGuests} (A:${parsed.adults}, K6-11:${parsed.children6To11}, K<6:${parsed.childrenUnder6})`);
      console.log(`  - Rooms Count:   ${parsed.totalRooms}`);
      console.log(`  - Total Amount:  ${parsed.payment.totalAmount}`);
      console.log(`  - Deposit:       ${parsed.payment.depositAmount}`);
      console.log(`  - Remaining:     ${parsed.payment.remainingAmount}`);
      console.log(`  - Payment Status: ${parsed.payment.paymentStatus}`);
      console.log(`  - Rooms Table:`);
      for (const r of parsed.rooms) {
        console.log(`      * Room: ${r.roomName} | ${r.quantity} qty * ${r.nights} nights @ ${r.unitPrice} = ${r.amount}`);
      }
      console.log(`  - Meals Table:`);
      for (const m of parsed.meals) {
        console.log(`      * Meal: ${m.serviceName} | ${m.quantity} qty * ${m.paxCount} pax @ ${m.unitPrice} = ${m.amount} (Type: ${m.mealType}, Date: ${m.mealDate.toISOString().split('T')[0]})`);
      }
      console.log(`  - Services Table:`);
      for (const s of parsed.services) {
        console.log(`      * Service: ${s.serviceName} | ${s.quantity} qty @ ${s.unitPrice} = ${s.amount} (Type: ${s.serviceType})`);
      }
      console.log(`  - Warnings:      ${JSON.stringify(parsed.warnings)}`);
      console.log(`  - Needs Review:  ${parsed.needsReview}`);
    } catch (e: any) {
      console.error(`Error parsing ${f}:`, e.message);
    }
  }
}

testSingle();
