import path from 'path';
import { parseForecastFile } from '../src/lib/parser/forecast-parser';
import { downloadBookingSheet } from '../src/lib/parser/booking-downloader';
import { parseBookingFile } from '../src/lib/parser/booking-parser';

async function runTest() {
  console.log('--- STARTING PARSER VERIFICATION TEST ---');
  const forecastPath = path.join(__dirname, '../CPR_DAILY_FORECAST_2026.xlsx');

  console.log(`Parsing forecast file: ${forecastPath}`);
  const { cells, warnings: forecastWarnings } = await parseForecastFile(forecastPath, 2026, 5);

  console.log(`Successfully parsed ${cells.length} cells.`);
  if (forecastWarnings.length > 0) {
    console.warn('Forecast warnings:', forecastWarnings);
  }

  // Let's print out the forecast cells we found
  console.log('\nForecast cells extracted:');
  const uniqueBookings = new Map<string, typeof cells[0]>();
  cells.forEach(c => {
    console.log(`  - Date: ${c.forecastDate.toISOString().split('T')[0]} | Room: ${c.roomNumber} (${c.roomType}) | Text: "${c.cellText}" | Link: ${c.hyperlink ? 'Yes' : 'No'}`);
    if (c.hyperlink) {
      const match = c.cellText.match(/(BK-\d+)/);
      const code = match ? match[1] : c.cellText;
      if (!uniqueBookings.has(code)) {
        uniqueBookings.set(code, c);
      }
    }
  });

  console.log(`\nFound ${uniqueBookings.size} unique booking links to download & parse.`);

  // Let's download and parse each unique booking link
  for (const [code, cell] of uniqueBookings.entries()) {
    console.log(`\n--------------------------------------------`);
    console.log(`Processing Booking link for ${code}: ${cell.hyperlink}`);
    
    try {
      const { filePath, isMock } = await downloadBookingSheet(cell.hyperlink!);
      console.log(`Downloaded to: ${filePath} (Mock: ${isMock})`);

      const parsedBooking = await parseBookingFile(filePath, cell.id, cell.hyperlink!, 2026);
      console.log(`Parsed Booking Details for ${code}:`);
      console.log(`  - Booking Code: ${parsedBooking.bookingCode}`);
      console.log(`  - Guest Name:   ${parsedBooking.bookingName}`);
      console.log(`  - Channel:      ${parsedBooking.channel}`);
      console.log(`  - Sale Staff:   ${parsedBooking.saleName}`);
      console.log(`  - Check-in:     ${parsedBooking.checkinAt.toISOString().split('T')[0]}`);
      console.log(`  - Check-out:    ${parsedBooking.checkoutAt.toISOString().split('T')[0]}`);
      console.log(`  - Guests:       ${parsedBooking.totalGuests} (Adults: ${parsedBooking.adults}, Kids 6-11: ${parsedBooking.children6To11}, Kids <6: ${parsedBooking.childrenUnder6})`);
      console.log(`  - Rooms Count:  ${parsedBooking.totalRooms}`);
      
      console.log(`  - Rooms Table:`);
      parsedBooking.rooms.forEach(r => {
        console.log(`      * Room Name: ${r.roomName} | Type: ${r.roomType} | Qty: ${r.quantity} | Nights: ${r.nights} | Price: ${r.unitPrice} | Total: ${r.amount}`);
      });

      console.log(`  - Meals Table:`);
      parsedBooking.meals.forEach(m => {
        console.log(`      * Date: ${m.mealDate.toISOString().split('T')[0]} | Type: ${m.mealType} | Menu: "${m.serviceName}" | Venue: ${m.restaurantName} | Qty: ${m.quantity} ${m.unit} | Pax Count: ${m.paxCount} | Price: ${m.unitPrice} | Review: ${m.needsReview}`);
      });

      console.log(`  - Services Table:`);
      parsedBooking.services.forEach(s => {
        console.log(`      * Date: ${s.serviceDate.toISOString().split('T')[0]} | Type: ${s.serviceType} | Name: "${s.serviceName}" | Qty: ${s.quantity} | Total: ${s.amount}`);
      });

      console.log(`  - Payments:`);
      console.log(`      * Total:     ${parsedBooking.payment.totalAmount}`);
      console.log(`      * Deposit:   ${parsedBooking.payment.depositAmount}`);
      console.log(`      * Remaining: ${parsedBooking.payment.remainingAmount}`);
      console.log(`      * Status:    ${parsedBooking.payment.paymentStatus}`);
      console.log(`      * VAT Req:   ${parsedBooking.payment.vatRequired}`);

      if (parsedBooking.warnings.length > 0) {
        console.warn(`  - Parser Warnings:`, parsedBooking.warnings);
      }
      console.log(`  - Needs Review Flag: ${parsedBooking.needsReview}`);

    } catch (err: any) {
      console.error(`Error processing booking ${code}:`, err.message);
    }
  }

  console.log('\n--- PARSER VERIFICATION TEST COMPLETED ---');
}

runTest();
