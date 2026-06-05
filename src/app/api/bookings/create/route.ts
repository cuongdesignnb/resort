import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { Readable } from 'stream';

export const revalidate = 0;

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function getA1Notation(rowIndex: number, colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    const modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return `${letter}${rowIndex}`;
}

async function updateGoogleSheetCell(
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number,
  colIndex: number,
  value: string
) {
  if (process.env.DEMO_MODE === 'true' || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    console.log('[MOCK] Updating Google Sheet cell:', { spreadsheetId, sheetName, rowIndex, colIndex, value });
    return;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const a1 = getA1Notation(rowIndex, colIndex);
    const range = `${sheetName}!${a1}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value]],
      },
    });
    console.log(`Updated cell ${range} in spreadsheet ${spreadsheetId}`);
  } catch (error) {
    console.error('Error writing to Google Sheets cell:', error);
  }
}

async function uploadBookingExcelToDrive(filename: string, buffer: Buffer): Promise<string> {
  if (process.env.DEMO_MODE === 'true' || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    const localDir = process.env.MOCK_GOOGLE_DRIVE_DIR || './mock_google_drive';
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const filepath = path.join(localDir, filename);
    fs.writeFileSync(filepath, buffer);
    console.log(`[MOCK] Wrote Excel file locally to: ${filepath}`);
    return `/mock_google_drive/${filename}`;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: Readable.from(buffer),
    },
    fields: 'id,webViewLink',
  });

  const fileId = response.data.id;
  
  // Make the file readable by anyone with the link
  try {
    await drive.permissions.create({
      fileId: fileId!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permissionError) {
    console.error('Error setting Google Drive file permissions:', permissionError);
  }

  const fileDetails = await drive.files.get({
    fileId: fileId!,
    fields: 'webViewLink',
  });

  return fileDetails.data.webViewLink || `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
}

async function generateBookingExcel(bookingData: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Booking Info');
  sheet.views = [{ showGridLines: true }];

  // Column widths
  sheet.columns = [
    { width: 22 },
    { width: 28 },
    { width: 5 },
    { width: 22 },
    { width: 28 },
  ];

  // Title
  sheet.mergeCells('A1:E1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'BOOKING CONFIRMATION';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF064E3B' } };
  titleCell.alignment = { horizontal: 'center' };

  // Key-value metadata
  sheet.getCell('A3').value = 'Booking Code:';
  sheet.getCell('B3').value = bookingData.bookingCode;
  sheet.getCell('D3').value = 'Check-in:';
  sheet.getCell('E3').value = bookingData.checkinAt + ' 14:00';

  sheet.getCell('A4').value = 'Customer Name:';
  sheet.getCell('B4').value = bookingData.customerName;
  sheet.getCell('D4').value = 'Check-out:';
  sheet.getCell('E4').value = bookingData.checkoutAt + ' 12:00';

  sheet.getCell('A5').value = 'Company Name:';
  sheet.getCell('B5').value = bookingData.companyName || '';
  sheet.getCell('D5').value = 'Adults:';
  sheet.getCell('E5').value = Number(bookingData.adults) || 0;

  sheet.getCell('A6').value = 'Phone:';
  sheet.getCell('B6').value = bookingData.phone || '';
  sheet.getCell('D6').value = 'Children (6-11):';
  sheet.getCell('E6').value = Number(bookingData.children6To11) || 0;

  sheet.getCell('A7').value = 'Email:';
  sheet.getCell('B7').value = bookingData.email || '';
  sheet.getCell('D7').value = 'Children (<6):';
  sheet.getCell('E7').value = Number(bookingData.childrenUnder6) || 0;

  sheet.getCell('A8').value = 'Channel:';
  sheet.getCell('B8').value = bookingData.channel || '';

  sheet.getCell('A9').value = 'Sale Staff:';
  sheet.getCell('B9').value = bookingData.saleName || '';

  // Style metadata labels
  ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'D3', 'D4', 'D5', 'D6', 'D7'].forEach(c => {
    sheet.getCell(c).font = { bold: true };
  });

  // Room details section
  sheet.getCell('A12').value = 'ROOM DETAILS';
  sheet.getCell('A12').font = { bold: true, size: 12, color: { argb: 'FF064E3B' } };

  sheet.getRow(13).values = ['Room Name', 'Room Type', 'Qty', 'Nights', 'Price', 'Amount'];
  sheet.getRow(13).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(13).eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
  });

  sheet.getRow(14).values = [
    bookingData.roomNumber,
    bookingData.roomType,
    1,
    bookingData.nights,
    Number(bookingData.unitPrice) || 0,
    (Number(bookingData.unitPrice) || 0) * (Number(bookingData.nights) || 1)
  ];
  sheet.getCell('E14').numFmt = '#,##0';
  sheet.getCell('F14').numFmt = '#,##0';

  // Meals section
  sheet.getCell('A16').value = 'MEAL DETAILS';
  sheet.getCell('A16').font = { bold: true, size: 12, color: { argb: 'FF064E3B' } };

  sheet.getRow(17).values = ['Meal Date', 'Meal Type', 'Service Name', 'Restaurant', 'Qty', 'Unit', 'Price', 'Amount'];
  sheet.getRow(17).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(17).eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
  });

  let rowIdx = 18;
  const totalGuests = Number(bookingData.adults) + Number(bookingData.children6To11) + Number(bookingData.childrenUnder6);

  if (bookingData.meals && bookingData.meals.length > 0) {
    for (const meal of bookingData.meals) {
      sheet.getRow(rowIdx).values = [
        meal.date,
        meal.mealType,
        meal.serviceName,
        meal.restaurant || '',
        Number(meal.qty) || 0,
        meal.unit || 'Suất',
        Number(meal.price) || 0,
        (Number(meal.qty) || 0) * (Number(meal.price) || 0)
      ];
      sheet.getCell(`G${rowIdx}`).numFmt = '#,##0';
      sheet.getCell(`H${rowIdx}`).numFmt = '#,##0';
      rowIdx++;
    }
  } else {
    // Generate default breakfasts (standard for stays)
    const checkin = new Date(bookingData.checkinAt);
    const nights = bookingData.nights;
    for (let i = 1; i <= nights; i++) {
      const mealDate = new Date(checkin.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = format(mealDate, 'yyyy-MM-dd');
      sheet.getRow(rowIdx).values = [
        dateStr,
        'BREAKFAST',
        'Ăn sáng tiêu chuẩn',
        'Restaurant A',
        totalGuests,
        'Suất',
        0,
        0
      ];
      rowIdx++;
    }
  }

  // Services section
  const serviceStartRow = rowIdx + 2;
  sheet.getCell(`A${serviceStartRow}`).value = 'ADDITIONAL SERVICES';
  sheet.getCell(`A${serviceStartRow}`).font = { bold: true, size: 12, color: { argb: 'FF064E3B' } };

  sheet.getRow(serviceStartRow + 1).values = ['Service Date', 'Service Name', 'Qty', 'Price', 'Amount'];
  sheet.getRow(serviceStartRow + 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(serviceStartRow + 1).eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
  });

  let serviceRowIdx = serviceStartRow + 2;
  if (bookingData.services && bookingData.services.length > 0) {
    for (const svc of bookingData.services) {
      sheet.getRow(serviceRowIdx).values = [
        svc.date,
        svc.serviceName,
        Number(svc.qty) || 0,
        Number(svc.price) || 0,
        (Number(svc.qty) || 0) * (Number(svc.price) || 0)
      ];
      sheet.getCell(`D${serviceRowIdx}`).numFmt = '#,##0';
      sheet.getCell(`E${serviceRowIdx}`).numFmt = '#,##0';
      serviceRowIdx++;
    }
  } else {
    sheet.getRow(serviceRowIdx).values = ['', '', 0, 0, 0];
    serviceRowIdx++;
  }

  // Financial summary
  const summaryStartRow = serviceRowIdx + 1;
  const roomCost = (Number(bookingData.unitPrice) || 0) * (Number(bookingData.nights) || 1);
  const mealsCost = (bookingData.meals || []).reduce((sum: number, m: any) => sum + (Number(m.qty) || 0) * (Number(m.price) || 0), 0);
  const servicesCost = (bookingData.services || []).reduce((sum: number, s: any) => sum + (Number(s.qty) || 0) * (Number(s.price) || 0), 0);
  const totalAmount = roomCost + mealsCost + servicesCost;

  const discount = Number(bookingData.discountAmount) || 0;
  const deposit = Number(bookingData.depositAmount) || 0;
  const remaining = totalAmount - discount - deposit;

  sheet.getCell(`D${summaryStartRow}`).value = 'Total Amount:';
  sheet.getCell(`E${summaryStartRow}`).value = totalAmount;
  sheet.getCell(`E${summaryStartRow}`).numFmt = '#,##0';

  sheet.getCell(`D${summaryStartRow + 1}`).value = 'Deposit:';
  sheet.getCell(`E${summaryStartRow + 1}`).value = deposit;
  sheet.getCell(`E${summaryStartRow + 1}`).numFmt = '#,##0';

  sheet.getCell(`D${summaryStartRow + 2}`).value = 'Discount:';
  sheet.getCell(`E${summaryStartRow + 2}`).value = discount;
  sheet.getCell(`E${summaryStartRow + 2}`).numFmt = '#,##0';

  sheet.getCell(`D${summaryStartRow + 3}`).value = 'VAT Required:';
  sheet.getCell(`E${summaryStartRow + 3}`).value = !!bookingData.vatRequired;

  sheet.getCell(`D${summaryStartRow + 4}`).value = 'Remaining Amount:';
  sheet.getCell(`E${summaryStartRow + 4}`).value = remaining;
  sheet.getCell(`E${summaryStartRow + 4}`).numFmt = '#,##0';

  sheet.getCell(`D${summaryStartRow + 5}`).value = 'Payment Status:';
  sheet.getCell(`E${summaryStartRow + 5}`).value = bookingData.paymentStatus || 'UNPAID';

  for (let i = 0; i <= 5; i++) {
    sheet.getCell(`D${summaryStartRow + i}`).font = { bold: true };
  }

  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      checkinAt,
      checkoutAt,
      roomNumber,
      roomType,
      customerName,
      companyName,
      phone,
      email,
      channel,
      saleName,
      adults,
      children6To11,
      childrenUnder6,
      unitPrice,
      depositAmount,
      discountAmount,
      vatRequired,
      paymentStatus,
      meals,
      services
    } = body;

    if (!checkinAt || !checkoutAt || !roomNumber || !customerName) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc: Ngày checkin/checkout, Số phòng, Tên khách hàng.' }, { status: 400 });
    }

    const checkinDate = parseISO(checkinAt);
    const checkoutDate = parseISO(checkoutAt);

    if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
      return NextResponse.json({ error: 'Định dạng ngày không hợp lệ.' }, { status: 400 });
    }

    const latestJob = await prisma.importJob.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { startedAt: 'desc' },
    });

    if (!latestJob) {
      return NextResponse.json({ error: 'Không thể tạo đặt phòng vì chưa có dữ liệu forecast thành công nào.' }, { status: 400 });
    }

    // Calculate nights
    const nights = Math.max(1, Math.round((checkoutDate.getTime() - checkinDate.getTime()) / (24 * 60 * 60 * 1000)));

    // Generate unique booking code: BK-{next_number}
    const allBookings = await prisma.booking.findMany({
      select: { bookingCode: true }
    });
    
    let maxNum = 1000;
    allBookings.forEach(b => {
      const match = b.bookingCode.match(/^BK-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const bookingCode = `BK-${maxNum + 1}`;

    // Create the excel buffer
    const excelBuffer = await generateBookingExcel({
      bookingCode,
      checkinAt,
      checkoutAt,
      roomNumber,
      roomType,
      customerName,
      companyName,
      phone,
      email,
      channel,
      saleName,
      adults,
      children6To11,
      childrenUnder6,
      unitPrice,
      depositAmount,
      discountAmount,
      vatRequired,
      paymentStatus,
      nights,
      meals,
      services
    });

    // Upload to drive (or write locally for mock)
    const filename = `booking_${bookingCode}.xlsx`;
    const driveLink = await uploadBookingExcelToDrive(filename, excelBuffer);

    // Save details to Local database
    const roomCost = (Number(unitPrice) || 0) * nights;
    const mealsCost = (meals || []).reduce((sum: number, m: any) => sum + (Number(m.qty) || 0) * (Number(m.price) || 0), 0);
    const servicesCost = (services || []).reduce((sum: number, s: any) => sum + (Number(s.qty) || 0) * (Number(s.price) || 0), 0);
    const totalAmount = roomCost + mealsCost + servicesCost;

    const totalGuests = Number(adults) + Number(children6To11) + Number(childrenUnder6);

    const booking = await prisma.booking.create({
      data: {
        importJobId: latestJob.id,
        bookingCode,
        bookingName: `${bookingCode} - ${customerName} (${totalGuests} pax)`,
        customerName,
        companyName,
        phone,
        email,
        channel,
        saleName,
        checkinAt: checkinDate,
        checkoutAt: checkoutDate,
        adults: Number(adults) || 0,
        children6To11: Number(children6To11) || 0,
        childrenUnder6: Number(childrenUnder6) || 0,
        totalGuests,
        totalRooms: 1,
        status: 'CONFIRMED',
        sourceUrl: driveLink,
        rooms: {
          create: {
            roomName: roomNumber,
            roomType: roomType,
            quantity: 1,
            nights,
            unitPrice: Number(unitPrice) || 0,
            amount: roomCost
          }
        },
        payment: {
          create: {
            depositAmount: Number(depositAmount) || 0,
            discountAmount: Number(discountAmount) || 0,
            totalAmount,
            remainingAmount: totalAmount - (Number(depositAmount) || 0) - (Number(discountAmount) || 0),
            paymentStatus: paymentStatus || 'UNPAID',
            vatRequired: !!vatRequired
          }
        }
      }
    });

    // Save meals in database
    if (meals && meals.length > 0) {
      await prisma.bookingMeal.createMany({
        data: meals.map((m: any) => ({
          bookingId: booking.id,
          mealType: m.mealType,
          mealDate: parseISO(m.date),
          serviceName: m.serviceName,
          restaurantName: m.restaurant || '',
          unit: m.unit || 'Suất',
          quantity: Number(m.qty) || 0,
          paxCount: m.mealType === 'BREAKFAST' || m.unit === 'Suất' ? Number(m.qty) : 0,
          tableCount: m.unit === 'Mâm' ? Number(m.qty) : 0,
          unitPrice: Number(m.price) || 0,
          amount: (Number(m.qty) || 0) * (Number(m.price) || 0)
        }))
      });
    } else {
      // Default breakfast stayover meals
      const mealData = [];
      for (let i = 1; i <= nights; i++) {
        const mealDate = new Date(checkinDate.getTime() + i * 24 * 60 * 60 * 1000);
        mealData.push({
          bookingId: booking.id,
          mealType: 'BREAKFAST',
          mealDate,
          serviceName: 'Ăn sáng tiêu chuẩn',
          restaurantName: 'Restaurant A',
          unit: 'Suất',
          quantity: totalGuests,
          paxCount: totalGuests,
          tableCount: 0,
          unitPrice: 0,
          amount: 0
        });
      }
      await prisma.bookingMeal.createMany({
        data: mealData
      });
    }

    // Save services in database
    if (services && services.length > 0) {
      await prisma.bookingService.createMany({
        data: services.map((s: any) => ({
          bookingId: booking.id,
          serviceType: 'OTHER',
          serviceName: s.serviceName,
          serviceDate: parseISO(s.date),
          unit: s.unit || 'Lần',
          quantity: Number(s.qty) || 0,
          unitPrice: Number(s.price) || 0,
          amount: (Number(s.qty) || 0) * (Number(s.price) || 0)
        }))
      });
    }

    // Link booking to Forecast Cells for each night in range, and write to Google Sheets
    const checkoutPrevDay = new Date(checkoutDate.getTime() - 24 * 60 * 60 * 1000);
    const nightsInterval = eachDayOfInterval({
      start: checkinDate,
      end: checkoutPrevDay
    });

    let firstCellId = null;

    for (const day of nightsInterval) {
      // Find the row for this room and date
      const cell = await prisma.forecastCell.findFirst({
        where: {
          forecastDate: day,
          roomNumber: roomNumber,
          importJobId: latestJob.id
        }
      });

      if (cell) {
        if (!firstCellId) firstCellId = cell.id;

        await prisma.forecastCell.update({
          where: { id: cell.id },
          data: {
            cellText: `${bookingCode} - ${customerName} (${totalGuests} pax)`,
            hyperlink: driveLink,
            parsedBookingCode: bookingCode,
            statusText: 'CONFIRMED'
          }
        });

        // Background write-back to Google Sheet
        if (latestJob.sourceUrl && latestJob.sourceType === 'GOOGLE_SHEET') {
          const spreadsheetId = extractSpreadsheetId(latestJob.sourceUrl);
          if (spreadsheetId) {
            const cellFormula = `=HYPERLINK("${driveLink}", "${bookingCode} - ${customerName} (${totalGuests} pax)")`;
            // Fire-and-forget sheet update so we don't slow down the client response
            updateGoogleSheetCell(spreadsheetId, cell.sheetName, cell.rowIndex, cell.columnIndex, cellFormula);
          }
        }
      }
    }

    // Connect the first cell back to the booking source cell
    if (firstCellId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { sourceCellId: firstCellId }
      });
    }

    return NextResponse.json({
      success: true,
      bookingCode,
      driveLink,
      bookingId: booking.id
    });

  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống khi lưu đặt phòng.' }, { status: 500 });
  }
}
