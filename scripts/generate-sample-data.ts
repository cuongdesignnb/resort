import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const MOCK_DIR = path.join(__dirname, '../mock_google_drive');
const OUTPUT_FORECAST = path.join(__dirname, '../CPR_DAILY_FORECAST_2026.xlsx');

// Ensure output directories exist
if (!fs.existsSync(MOCK_DIR)) {
  fs.mkdirSync(MOCK_DIR, { recursive: true });
}

// Format a date helper
function formatDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function createForecast() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Tháng 5');

  // Define headers
  sheet.getRow(1).values = ['Room', 'Type', ...Array.from({ length: 31 }, (_, i) => i + 1)];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'center' };

  // Set columns
  sheet.columns = [
    { header: 'Room', key: 'room', width: 10 },
    { header: 'Type', key: 'type', width: 15 },
    ...Array.from({ length: 31 }, (_, i) => ({ header: String(i + 1), key: `day_${i + 1}`, width: 18 })),
  ];

  const rooms = [
    { number: '101', type: 'Deluxe Ocean' },
    { number: '102', type: 'Deluxe Garden' },
    { number: '103', type: 'Executive Suite' },
    { number: 'Villa 1', type: '3BR Pool Villa' },
    { number: 'Villa 2', type: '3BR Pool Villa' },
  ];

  rooms.forEach((r, idx) => {
    const rowNum = idx + 2;
    sheet.getCell(rowNum, 1).value = r.number;
    sheet.getCell(rowNum, 2).value = r.type;
  });

  // Let's paint booking grids
  // Mr. An: Room 101, Days 1, 2, 3
  for (let d = 1; d <= 3; d++) {
    const cell = sheet.getCell(2, d + 2);
    cell.value = {
      text: 'BK-1001 - Mr. An (4 pax)',
      hyperlink: 'https://docs.google.com/spreadsheets/d/mock-booking-1001/edit'
    };
    cell.font = { color: { argb: 'FF0000FF' }, underline: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F4EA' }, // light green
    };
  }

  // Mr. Binh: Room 102, Days 15, 16, 17, 18
  for (let d = 15; d <= 18; d++) {
    const cell = sheet.getCell(3, d + 2);
    cell.value = {
      text: 'BK-1002 - Mr. Binh (2 pax)',
      hyperlink: 'https://docs.google.com/spreadsheets/d/mock-booking-1002/edit'
    };
    cell.font = { color: { argb: 'FF0000FF' }, underline: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F4EA' },
    };
  }

  // Ms. Chi: Room 103, Days 20, 21
  for (let d = 20; d <= 21; d++) {
    const cell = sheet.getCell(4, d + 2);
    cell.value = {
      text: 'BK-1003 - Ms. Chi (6 pax)',
      hyperlink: 'https://docs.google.com/spreadsheets/d/mock-booking-1003/edit'
    };
    cell.font = { color: { argb: 'FF0000FF' }, underline: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F0FE' }, // light blue
    };
  }

  // Company X (Villa 1 & Villa 2): Days 30, 31
  // Villa 1 booking has link, Villa 2 booking has duplicate code or details
  for (let d = 30; d <= 31; d++) {
    const cellV1 = sheet.getCell(5, d + 2);
    cellV1.value = {
      text: 'BK-1004 - Company X (12 pax)',
      hyperlink: 'https://docs.google.com/spreadsheets/d/mock-booking-1004/edit'
    };
    cellV1.font = { color: { argb: 'FF0000FF' }, underline: true };
    cellV1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFCE8E6' }, // light red
    };

    // Villa 2 is booked under the same BK-1004, but missing the hyperlink! (Warning case)
    const cellV2 = sheet.getCell(6, d + 2);
    cellV2.value = 'BK-1004 - Company X (Villa 2)';
    cellV2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFCE8E6' },
    };
  }

  // Cancelled Booking: Room 101, Days 10, 11
  for (let d = 10; d <= 11; d++) {
    const cell = sheet.getCell(2, d + 2);
    cell.value = {
      text: 'HỦY - BK-1005 - Ms. Duong',
      hyperlink: 'https://docs.google.com/spreadsheets/d/mock-booking-1005/edit'
    };
    cell.font = { color: { argb: 'FFFF0000' }, strike: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFCE8E6' },
    };
  }

  // Missing link booking: Room 102, Days 25, 26
  for (let d = 25; d <= 26; d++) {
    const cell = sheet.getCell(3, d + 2);
    cell.value = 'BK-1006 - Mr. Em (No Link)';
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF4E5' }, // light orange
    };
  }

  await workbook.xlsx.writeFile(OUTPUT_FORECAST);
  console.log(`Generated sample forecast at: ${OUTPUT_FORECAST}`);
}

async function createBookingConfirmations() {
  // Booking 1001: Mr. An (Standard 3 days, standard meals)
  {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Booking Info');
    ws.getCell('A1').value = 'BOOKING CONFIRMATION';
    ws.getCell('A1').font = { bold: true, size: 16 };

    ws.getCell('A3').value = 'Booking Code:';
    ws.getCell('B3').value = 'BK-1001';
    ws.getCell('A4').value = 'Customer Name:';
    ws.getCell('B4').value = 'Mr. An';
    ws.getCell('A5').value = 'Company Name:';
    ws.getCell('B5').value = 'An Group';
    ws.getCell('A6').value = 'Phone:';
    ws.getCell('B6').value = '0901234567';
    ws.getCell('A7').value = 'Email:';
    ws.getCell('B7').value = 'an@gmail.com';
    ws.getCell('A8').value = 'Channel:';
    ws.getCell('B8').value = 'OTA';
    ws.getCell('A9').value = 'Sale Staff:';
    ws.getCell('B9').value = 'Ms. Huong';

    ws.getCell('D3').value = 'Check-in:';
    ws.getCell('E3').value = '2026-05-01 14:00';
    ws.getCell('D4').value = 'Check-out:';
    ws.getCell('E4').value = '2026-05-03 12:00';
    ws.getCell('D5').value = 'Adults:';
    ws.getCell('E5').value = 2;
    ws.getCell('D6').value = 'Children (6-11):';
    ws.getCell('E6').value = 1;
    ws.getCell('D7').value = 'Children (<6):';
    ws.getCell('E7').value = 1;

    // Room Table
    ws.getCell('A12').value = 'ROOM DETAILS';
    ws.getCell('A12').font = { bold: true };
    ws.getRow(13).values = ['Room Name', 'Room Type', 'Qty', 'Nights', 'Price', 'Amount'];
    ws.getRow(13).font = { bold: true };
    ws.getRow(14).values = ['101', 'Deluxe Ocean', 1, 2, 2000000, 4000000];

    // Meals Table
    ws.getCell('A16').value = 'MEAL DETAILS';
    ws.getCell('A16').font = { bold: true };
    ws.getRow(17).values = ['Meal Date', 'Meal Type', 'Service Name', 'Restaurant', 'Qty', 'Unit', 'Price', 'Amount'];
    ws.getRow(17).font = { bold: true };
    // Test rule: Lunch on checkin day, breakfast day 2, dinner day 2, breakfast checkout
    ws.getRow(18).values = ['ngày checkin', 'LUNCH', 'Ăn trưa Buffet', 'Ocean Grill', 4, 'Suất', 300000, 1200000];
    ws.getRow(19).values = ['2026-05-02', 'BREAKFAST', 'Ăn sáng tiêu chuẩn', 'Restaurant A', 4, 'Suất', 0, 0];
    ws.getRow(20).values = ['02/05', 'DINNER', 'BBQ hải sản tối', 'Garden Lawn', 4, 'Suất', 500000, 2000000];
    ws.getRow(21).values = ['ngày checkout', 'BREAKFAST', 'Ăn sáng tiêu chuẩn', 'Restaurant A', 4, 'Suất', 0, 0];

    // Services Table
    ws.getCell('A23').value = 'ADDITIONAL SERVICES';
    ws.getCell('A23').font = { bold: true };
    ws.getRow(24).values = ['Service Date', 'Service Name', 'Qty', 'Price', 'Amount'];
    ws.getRow(24).font = { bold: true };
    ws.getRow(25).values = ['2026-05-02', 'Spa Massage 60m', 2, 500000, 1000000];

    // Payments
    ws.getCell('D27').value = 'Total Amount:';
    ws.getCell('E27').value = 8200000;
    ws.getCell('D28').value = 'Deposit:';
    ws.getCell('E28').value = 3000000;
    ws.getCell('D29').value = 'Discount:';
    ws.getCell('E29').value = 200000;
    ws.getCell('D30').value = 'VAT Required:';
    ws.getCell('E30').value = true;
    ws.getCell('D31').value = 'Remaining Amount:';
    ws.getCell('E31').value = 5000000;
    ws.getCell('D32').value = 'Payment Status:';
    ws.getCell('E32').value = 'PARTIAL';

    await wb.xlsx.writeFile(path.join(MOCK_DIR, 'mock-booking-1001.xlsx'));
  }

  // Booking 1002: Mr. Binh (Standard 4 days)
  {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Confirmation');
    ws.getCell('A1').value = 'BOOKING CONFIRMATION';
    ws.getCell('A1').font = { bold: true, size: 16 };

    ws.getCell('A3').value = 'Booking Code:';
    ws.getCell('B3').value = 'BK-1002';
    ws.getCell('A4').value = 'Customer Name:';
    ws.getCell('B4').value = 'Mr. Binh';
    ws.getCell('A5').value = 'Phone:';
    ws.getCell('B5').value = '0987654321';
    ws.getCell('A6').value = 'Channel:';
    ws.getCell('B6').value = 'TA';
    ws.getCell('A7').value = 'Sale Staff:';
    ws.getCell('B7').value = 'Mr. Tuan';

    ws.getCell('D3').value = 'Check-in:';
    ws.getCell('E3').value = '2026-05-15';
    ws.getCell('D4').value = 'Check-out:';
    ws.getCell('E4').value = '2026-05-19';
    ws.getCell('D5').value = 'Adults:';
    ws.getCell('E5').value = 2;
    ws.getCell('D6').value = 'Children (6-11):';
    ws.getCell('E6').value = 0;
    ws.getCell('D7').value = 'Children (<6):';
    ws.getCell('E7').value = 0;

    // Room Details
    ws.getCell('A9').value = 'ROOM LIST';
    ws.getRow(10).values = ['Room Name', 'Room Type', 'Qty', 'Nights', 'Price', 'Total'];
    ws.getRow(11).values = ['102', 'Deluxe Garden', 1, 4, 1500000, 6000000];

    // Meals Details (Test rule: No date given, Combo 2N1Đ like text. Let's make it checkin lunch, checkout breakfast)
    ws.getCell('A13').value = 'MEALS LIST';
    ws.getRow(14).values = ['Date', 'Meal', 'Restaurant', 'Qty', 'Unit', 'Price', 'Total'];
    // Ambiguous meal row without specific date (will invoke check-in day mapping)
    ws.getRow(15).values = ['Ăn trưa', 'LUNCH', 'Ocean Grill', 2, 'Suất', 250000, 500000];
    ws.getRow(16).values = ['Ăn tối BBQ', 'DINNER', 'Beach Club', 2, 'Suất', 600000, 1200000];

    // Payments
    ws.getCell('D18').value = 'Total:';
    ws.getCell('E18').value = 7700000;
    ws.getCell('D19').value = 'Deposit:';
    ws.getCell('E19').value = 7700000;
    ws.getCell('D20').value = 'Remaining:';
    ws.getCell('E20').value = 0;
    ws.getCell('D21').value = 'Status:';
    ws.getCell('E21').value = 'PAID';

    await wb.xlsx.writeFile(path.join(MOCK_DIR, 'mock-booking-1002.xlsx'));
  }

  // Booking 1003: Ms. Chi (6 pax, BBQ, Set menus, 2 nights)
  {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Main Sheet');
    ws.getCell('A1').value = 'Booking Voucher';
    ws.getCell('A1').font = { bold: true, size: 16 };

    ws.getCell('A3').value = 'Booking ID:';
    ws.getCell('B3').value = 'BK-1003';
    ws.getCell('A4').value = 'Guest Name:';
    ws.getCell('B4').value = 'Ms. Chi';
    ws.getCell('A5').value = 'Channel:';
    ws.getCell('B5').value = 'CTV';
    ws.getCell('A6').value = 'Sales:';
    ws.getCell('B6').value = 'Ms. Huong';

    ws.getCell('D3').value = 'Check-in:';
    ws.getCell('E3').value = '2026-05-20';
    ws.getCell('D4').value = 'Check-out:';
    ws.getCell('E4').value = '2026-05-22';
    ws.getCell('D5').value = 'Guests:';
    ws.getCell('E5').value = 6;

    // Room
    ws.getCell('A8').value = 'ROOMS';
    ws.getRow(9).values = ['Room', 'Type', 'Qty', 'Nights', 'Price', 'Total'];
    ws.getRow(10).values = ['103', 'Executive Suite', 1, 2, 3500000, 7000000];

    // Meals - Mâm instead of pax (1 mâm = 6 pax)
    ws.getCell('A12').value = 'DINING SERVICES';
    ws.getRow(13).values = ['Date', 'Meal', 'Restaurant', 'Qty', 'Unit', 'Price', 'Total'];
    ws.getRow(14).values = ['20/05', 'Ăn tối Set Menu', 'Hillside Restaurant', 1, 'Mâm', 1800000, 1800000];
    ws.getRow(15).values = ['21/05', 'Ăn trưa Set Menu', 'Hillside Restaurant', 1, 'Mâm', 1800000, 1800000];
    ws.getRow(16).values = ['21/05', 'Ăn tối BBQ', 'Ocean Grill', 6, 'Suất', 400000, 2400000];

    // Payments
    ws.getCell('D18').value = 'Total Amount:';
    ws.getCell('E18').value = 13000000;
    ws.getCell('D19').value = 'Deposit:';
    ws.getCell('E19').value = 0;
    ws.getCell('D20').value = 'Remaining:';
    ws.getCell('E20').value = 13000000;
    ws.getCell('D21').value = 'Payment Status:';
    ws.getCell('E21').value = 'UNPAID';

    await wb.xlsx.writeFile(path.join(MOCK_DIR, 'mock-booking-1003.xlsx'));
  }

  // Booking 1004: Company X (12 pax, Villa 1 & 2, large group)
  {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Summary');
    ws.getCell('A1').value = 'GROUP BOOKING DETAILS';
    ws.getCell('A1').font = { bold: true, size: 16 };

    ws.getCell('A3').value = 'Booking Reference:';
    ws.getCell('B3').value = 'BK-1004';
    ws.getCell('A4').value = 'Company:';
    ws.getCell('B4').value = 'Company X';
    ws.getCell('A5').value = 'Salesperson:';
    ws.getCell('B5').value = 'Mr. Tuan';
    ws.getCell('A6').value = 'Channel:';
    ws.getCell('B6').value = 'Corporate';

    ws.getCell('D3').value = 'Arrival:';
    ws.getCell('E3').value = '2026-05-30';
    ws.getCell('D4').value = 'Departure:';
    ws.getCell('E4').value = '2026-05-31';
    ws.getCell('D5').value = 'Total Pax:';
    ws.getCell('E5').value = 12;

    // Rooms
    ws.getCell('A9').value = 'ACCOMMODATION';
    ws.getRow(10).values = ['Room Number', 'Type', 'Qty', 'Nights', 'Rate', 'Total'];
    ws.getRow(11).values = ['Villa 1', '3BR Pool Villa', 1, 1, 10000000, 10000000];
    ws.getRow(12).values = ['Villa 2', '3BR Pool Villa', 1, 1, 10000000, 10000000];

    // Meals - Gala dinner BBQ with Team Building
    ws.getCell('A14').value = 'F&B SCHEDULE';
    ws.getRow(15).values = ['Meal Date', 'Meal Type', 'Description', 'Venue', 'Qty', 'Unit', 'Price', 'Total'];
    ws.getRow(16).values = ['30/05', 'DINNER', 'Gala Dinner BBQ Buffet', 'Beachside Lawn', 12, 'Pax', 800000, 9600000];
    ws.getRow(17).values = ['31/05', 'BREAKFAST', 'Buffet sáng tiêu chuẩn', 'Restaurant A', 12, 'Pax', 0, 0];

    // Services - Team Building
    ws.getCell('A19').value = 'OTHER SERVICES';
    ws.getRow(20).values = ['Date', 'Service Name', 'Qty', 'Unit Price', 'Amount'];
    ws.getRow(21).values = ['30/05', 'Team Building Setup & MC', 1, 5000000, 5000000];

    // Payments
    ws.getCell('D23').value = 'Grand Total:';
    ws.getCell('E23').value = 34600000;
    ws.getCell('D24').value = 'Deposit Paid:';
    ws.getCell('E24').value = 20000000;
    ws.getCell('D25').value = 'Remaining Due:';
    ws.getCell('E25').value = 14600000;
    ws.getCell('D26').value = 'Status:';
    ws.getCell('E26').value = 'PARTIAL';

    await wb.xlsx.writeFile(path.join(MOCK_DIR, 'mock-booking-1004.xlsx'));
  }

  // Booking 1005: Ms. Duong (CANCELLED booking)
  {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Main');
    ws.getCell('A1').value = 'CANCELLATION CONFIRMATION';
    ws.getCell('A1').font = { bold: true, size: 16 };

    ws.getCell('A3').value = 'Booking Code:';
    ws.getCell('B3').value = 'BK-1005';
    ws.getCell('A4').value = 'Customer Name:';
    ws.getCell('B4').value = 'Ms. Duong';
    ws.getCell('A5').value = 'Sale Staff:';
    ws.getCell('B5').value = 'Mr. Tuan';
    ws.getCell('A6').value = 'Status:';
    ws.getCell('B6').value = 'CANCELLED'; // Cancellation indicator

    ws.getCell('D3').value = 'Check-in:';
    ws.getCell('E3').value = '2026-05-10';
    ws.getCell('D4').value = 'Check-out:';
    ws.getCell('E4').value = '2026-05-12';
    ws.getCell('D5').value = 'Adults:';
    ws.getCell('E5').value = 2;

    // Room
    ws.getRow(10).values = ['Room', 'Type', 'Qty', 'Nights', 'Price', 'Total'];
    ws.getRow(11).values = ['101', 'Deluxe Ocean', 1, 2, 2000000, 4000000];

    // Payments
    ws.getCell('D15').value = 'Total Amount:';
    ws.getCell('E15').value = 4000000;
    ws.getCell('D16').value = 'Deposit:';
    ws.getCell('E16').value = 1000000;
    ws.getCell('D17').value = 'Refund Amount:';
    ws.getCell('E17').value = 500000; // Partial refund
    ws.getCell('D18').value = 'Cancellation Note:';
    ws.getCell('E18').value = 'Khách hủy vì lý do cá nhân';

    await wb.xlsx.writeFile(path.join(MOCK_DIR, 'mock-booking-1005.xlsx'));
  }

  console.log(`Generated mock booking confirmations inside: ${MOCK_DIR}`);
}

async function run() {
  try {
    await createForecast();
    await createBookingConfirmations();
    console.log('Sample data generation completed successfully!');
  } catch (err) {
    console.error('Error generating sample data:', err);
  }
}

run();
