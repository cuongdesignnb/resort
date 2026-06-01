import ExcelJS from 'exceljs';
import prisma from '../db';
import { format } from 'date-fns';

export async function exportReportToExcel(importJobId: string): Promise<Buffer> {
  const job = await prisma.importJob.findUnique({
    where: { id: importJobId },
    include: {
      cells: true,
      bookings: {
        include: {
          rooms: true,
          meals: true,
          services: true,
          payment: true,
        },
      },
      dailyStats: true,
    },
  });

  if (!job) {
    throw new Error(`Import job ${importJobId} not found.`);
  }

  const workbook = new ExcelJS.Workbook();

  // Color Palette Definitions
  const primaryHeaderColor = { argb: 'FF064E3B' }; // Deep Emerald Green
  const zebraColor = { argb: 'FFF9FAFB' }; // Very light slate/gray
  const accentGoldColor = { argb: 'FFB45309' }; // Amber/Gold

  // Setup standard fonts and formatting helpers
  const applyHeaderStyle = (row: ExcelJS.Row, color = primaryHeaderColor) => {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: color,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    row.height = 25;
  };

  const numberFormat = '#,##0';

  // -------------------------------------------------------------
  // SHEET 1: SUMMARY
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.views = [{ showGridLines: true }];

  // Fetch KPI totals
  const totalRev = job.dailyStats.reduce((sum, s) => sum + s.totalRevenue, 0);
  const roomRev = job.dailyStats.reduce((sum, s) => sum + s.roomRevenue, 0);
  const foodRev = job.dailyStats.reduce((sum, s) => sum + s.foodRevenue, 0);
  const serviceRev = job.dailyStats.reduce((sum, s) => sum + s.serviceRevenue, 0);

  const roomSoldTotal = job.dailyStats.reduce((sum, s) => sum + s.roomSold, 0);
  const totalOccupancyPct = (roomSoldTotal / (5 * job.dailyStats.length)) * 100; // 5 rooms total in inventory
  const adr = roomSoldTotal > 0 ? roomRev / roomSoldTotal : 0;
  const revpar = job.dailyStats.length > 0 ? roomRev / (5 * job.dailyStats.length) : 0;

  const totalGuestsCheckin = job.bookings.filter(b => b.status !== 'CANCELLED').reduce((sum, b) => sum + b.totalGuests, 0);
  const totalCancellations = job.bookings.filter(b => b.status === 'CANCELLED').length;
  const bookingsNeedReview = job.bookings.filter(b => b.needsReview).length;

  summarySheet.getCell('A1').value = 'CUONG DESIGN RESORT SUMMARY';
  summarySheet.getCell('A1').font = { size: 16, bold: true, color: primaryHeaderColor };
  summarySheet.getCell('A2').value = `Month: ${job.month}/${job.year} | Source: ${job.fileName}`;
  summarySheet.getCell('A2').font = { italic: true };

  // Write KPI Table
  const kpis = [
    { name: 'Total Revenue', value: Math.round(totalRev), isCurrency: true },
    { name: 'Room Revenue', value: Math.round(roomRev), isCurrency: true },
    { name: 'F&B Revenue', value: Math.round(foodRev), isCurrency: true },
    { name: 'Services Revenue', value: Math.round(serviceRev), isCurrency: true },
    { name: 'Total Rooms Sold', value: roomSoldTotal, isCurrency: false },
    { name: 'Occupancy Rate', value: `${totalOccupancyPct.toFixed(1)}%`, isCurrency: false },
    { name: 'ADR (Average Daily Rate)', value: Math.round(adr), isCurrency: true },
    { name: 'RevPAR', value: Math.round(revpar), isCurrency: true },
    { name: 'Total Check-in Guests', value: totalGuestsCheckin, isCurrency: false },
    { name: 'Cancellations Count', value: totalCancellations, isCurrency: false },
    { name: 'Needs Review Alert List', value: bookingsNeedReview, isCurrency: false },
  ];

  summarySheet.getCell('A4').value = 'KPI Metric';
  summarySheet.getCell('B4').value = 'Value';
  summarySheet.getRow(4).font = { bold: true };
  applyHeaderStyle(summarySheet.getRow(4), accentGoldColor);

  kpis.forEach((k, idx) => {
    const rowNum = idx + 5;
    summarySheet.getCell(`A${rowNum}`).value = k.name;
    const valCell = summarySheet.getCell(`B${rowNum}`);
    valCell.value = k.value;
    if (k.isCurrency && typeof k.value === 'number') {
      valCell.numFmt = numberFormat;
    }
  });

  summarySheet.columns = [
    { width: 30 },
    { width: 25 },
  ];

  // -------------------------------------------------------------
  // SHEET 2: DAILY STATS
  // -------------------------------------------------------------
  const dailySheet = workbook.addWorksheet('Daily Stats');
  dailySheet.views = [{ showGridLines: true }];

  dailySheet.getRow(1).values = [
    'Date', 'Room Sold', 'Room Revenue', 'F&B Revenue', 'Service Revenue', 'Total Revenue',
    'Check-in Guests', 'Check-out Guests', 'Stayover Guests', 'Cancelled Guests',
    'Breakfast Pax', 'Lunch Pax', 'Dinner Pax', 'Gala Pax', 'BBQ Pax'
  ];
  applyHeaderStyle(dailySheet.getRow(1));

  job.dailyStats.forEach((s, idx) => {
    const rowNum = idx + 2;
    dailySheet.getRow(rowNum).values = [
      format(s.statDate, 'dd/MM/yyyy'),
      s.roomSold,
      Math.round(s.roomRevenue),
      Math.round(s.foodRevenue),
      Math.round(s.serviceRevenue),
      Math.round(s.totalRevenue),
      s.checkinGuests,
      s.checkoutGuests,
      s.stayoverGuests,
      s.cancelledGuests,
      s.breakfastPax,
      s.lunchPax,
      s.dinnerPax,
      s.galaPax,
      s.bbqPax
    ];

    // Zebra striping
    if (idx % 2 === 1) {
      dailySheet.getRow(rowNum).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: zebraColor,
        };
      });
    }

    // Number formatting
    for (let col = 3; col <= 6; col++) {
      dailySheet.getCell(rowNum, col).numFmt = numberFormat;
    }
  });

  dailySheet.columns = [
    { width: 12 }, { width: 10 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }
  ];

  // -------------------------------------------------------------
  // SHEET 3: BOOKINGS
  // -------------------------------------------------------------
  const bookingsSheet = workbook.addWorksheet('Bookings');
  bookingsSheet.views = [{ showGridLines: true }];

  bookingsSheet.getRow(1).values = [
    'Booking Code', 'Booking Name', 'Check-in', 'Check-out', 'Total Rooms', 'Total Guests',
    'Adults', 'Kids 6-11', 'Kids <6', 'Channel', 'Sale Agent', 'Total Amount', 'Deposit', 'Remaining', 'Status', 'Needs Review'
  ];
  applyHeaderStyle(bookingsSheet.getRow(1));

  job.bookings.forEach((b, idx) => {
    const rowNum = idx + 2;
    const pay = b.payment;
    bookingsSheet.getRow(rowNum).values = [
      b.bookingCode,
      b.bookingName,
      format(b.checkinAt, 'dd/MM/yyyy'),
      format(b.checkoutAt, 'dd/MM/yyyy'),
      b.totalRooms,
      b.totalGuests,
      b.adults,
      b.children6To11,
      b.childrenUnder6,
      b.channel || 'Direct',
      b.saleName || 'N/A',
      pay ? Math.round(pay.totalAmount) : 0,
      pay ? Math.round(pay.depositAmount) : 0,
      pay ? Math.round(pay.remainingAmount) : 0,
      b.status,
      b.needsReview ? 'REVIEW' : 'OK'
    ];

    if (idx % 2 === 1) {
      bookingsSheet.getRow(rowNum).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: zebraColor,
        };
      });
    }

    // Money format
    for (let col = 12; col <= 14; col++) {
      bookingsSheet.getCell(rowNum, col).numFmt = numberFormat;
    }
  });

  bookingsSheet.columns = [
    { width: 15 }, { width: 25 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 8 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 15 },
    { width: 16 }, { width: 16 }, { width: 16 }, { width: 12 }, { width: 14 }
  ];

  // -------------------------------------------------------------
  // SHEET 4: MEALS
  // -------------------------------------------------------------
  const mealsSheet = workbook.addWorksheet('Meals');
  mealsSheet.views = [{ showGridLines: true }];

  mealsSheet.getRow(1).values = [
    'Date', 'Booking Code', 'Guest Name', 'Meal Type', 'Service Name', 'Restaurant', 'Qty', 'Unit', 'Pax Count', 'Table Count', 'Unit Price', 'Total Amount', 'Confidence', 'Status'
  ];
  applyHeaderStyle(mealsSheet.getRow(1));

  let mealIdx = 0;
  job.bookings.forEach((b) => {
    b.meals.forEach((m) => {
      const rowNum = mealIdx + 2;
      mealsSheet.getRow(rowNum).values = [
        format(m.mealDate, 'dd/MM/yyyy'),
        b.bookingCode,
        b.bookingName,
        m.mealType,
        m.serviceName,
        m.restaurantName || 'Main Buffet Restaurant',
        m.quantity,
        m.unit,
        m.paxCount,
        m.tableCount,
        Math.round(m.unitPrice),
        Math.round(m.amount),
        `${(m.confidence * 100).toFixed(0)}%`,
        m.needsReview ? 'Needs Review' : 'Auto Parsed'
      ];

      if (mealIdx % 2 === 1) {
        mealsSheet.getRow(rowNum).eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: zebraColor,
          };
        });
      }

      mealsSheet.getCell(rowNum, 11).numFmt = numberFormat;
      mealsSheet.getCell(rowNum, 12).numFmt = numberFormat;

      mealIdx++;
    });
  });

  mealsSheet.columns = [
    { width: 12 }, { width: 15 }, { width: 25 }, { width: 12 }, { width: 25 }, { width: 20 },
    { width: 8 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 14 }
  ];

  // -------------------------------------------------------------
  // SHEET 5: REVENUE
  // -------------------------------------------------------------
  const revenueSheet = workbook.addWorksheet('Revenue');
  revenueSheet.views = [{ showGridLines: true }];

  revenueSheet.getRow(1).values = [
    'Booking Code', 'Booking Name', 'Category', 'Item Description', 'Date', 'Qty', 'Unit Price', 'Total Amount', 'Deposit', 'Remaining', 'Sale Agent', 'Payment Status'
  ];
  applyHeaderStyle(revenueSheet.getRow(1));

  let revIdx = 0;
  job.bookings.forEach((b) => {
    const pay = b.payment;
    // Add Room Line
    b.rooms.forEach((r) => {
      const rowNum = revIdx + 2;
      revenueSheet.getRow(rowNum).values = [
        b.bookingCode,
        b.bookingName,
        'Accommodation',
        `${r.roomName} (${r.roomType}) - ${r.nights} nights`,
        format(b.checkinAt, 'dd/MM/yyyy'),
        r.quantity,
        Math.round(r.unitPrice),
        Math.round(r.amount),
        pay ? Math.round(pay.depositAmount) : 0,
        pay ? Math.round(pay.remainingAmount) : 0,
        b.saleName || 'N/A',
        pay ? pay.paymentStatus : 'UNPAID'
      ];
      revenueSheet.getCell(rowNum, 7).numFmt = numberFormat;
      revenueSheet.getCell(rowNum, 8).numFmt = numberFormat;
      revenueSheet.getCell(rowNum, 9).numFmt = numberFormat;
      revenueSheet.getCell(rowNum, 10).numFmt = numberFormat;
      revIdx++;
    });

    // Add Meal Lines
    b.meals.forEach((m) => {
      if (m.amount === 0) return; // skip complimentary breakfasts
      const rowNum = revIdx + 2;
      revenueSheet.getRow(rowNum).values = [
        b.bookingCode,
        b.bookingName,
        'Food & Beverage',
        m.serviceName,
        format(m.mealDate, 'dd/MM/yyyy'),
        m.quantity,
        Math.round(m.unitPrice),
        Math.round(m.amount),
        0, // Booking level deposits
        0,
        b.saleName || 'N/A',
        pay ? pay.paymentStatus : 'UNPAID'
      ];
      revenueSheet.getCell(rowNum, 7).numFmt = numberFormat;
      revenueSheet.getCell(rowNum, 8).numFmt = numberFormat;
      revIdx++;
    });

    // Add Services Lines
    b.services.forEach((s) => {
      const rowNum = revIdx + 2;
      revenueSheet.getRow(rowNum).values = [
        b.bookingCode,
        b.bookingName,
        'Extra Service',
        s.serviceName,
        format(s.serviceDate, 'dd/MM/yyyy'),
        s.quantity,
        Math.round(s.unitPrice),
        Math.round(s.amount),
        0,
        0,
        b.saleName || 'N/A',
        pay ? pay.paymentStatus : 'UNPAID'
      ];
      revenueSheet.getCell(rowNum, 7).numFmt = numberFormat;
      revenueSheet.getCell(rowNum, 8).numFmt = numberFormat;
      revIdx++;
    });
  });

  revenueSheet.columns = [
    { width: 15 }, { width: 25 }, { width: 16 }, { width: 30 }, { width: 12 },
    { width: 8 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 15 }, { width: 14 }
  ];

  // -------------------------------------------------------------
  // SHEET 6: ROOMS
  // -------------------------------------------------------------
  const roomsSheet = workbook.addWorksheet('Rooms');
  roomsSheet.views = [{ showGridLines: true }];

  roomsSheet.getRow(1).values = ['Room Number', 'Room Type', 'Date', 'Booking Code', 'Guest Name', 'Status'];
  applyHeaderStyle(roomsSheet.getRow(1));

  let roomIdx = 0;
  job.dailyStats.forEach((day) => {
    const dayStr = format(day.statDate, 'yyyy-MM-dd');
    job.bookings.forEach((b) => {
      if (b.status === 'CANCELLED') return;
      const chkIn = format(b.checkinAt, 'yyyy-MM-dd');
      const chkOut = format(b.checkoutAt, 'yyyy-MM-dd');
      
      if (dayStr >= chkIn && dayStr < chkOut) {
        b.rooms.forEach((r) => {
          const rowNum = roomIdx + 2;
          roomsSheet.getRow(rowNum).values = [
            r.roomName,
            r.roomType,
            format(day.statDate, 'dd/MM/yyyy'),
            b.bookingCode,
            b.bookingName,
            'OCCUPIED'
          ];
          roomIdx++;
        });
      }
    });
  });

  roomsSheet.columns = [
    { width: 14 }, { width: 18 }, { width: 12 }, { width: 15 }, { width: 25 }, { width: 12 }
  ];

  // -------------------------------------------------------------
  // SHEET 7: CANCELLATIONS
  // -------------------------------------------------------------
  const cancelSheet = workbook.addWorksheet('Cancellations');
  cancelSheet.views = [{ showGridLines: true }];

  cancelSheet.getRow(1).values = ['Booking Code', 'Guest Name', 'Check-in Expected', 'Check-out Expected', 'Total Guests', 'Rooms Lost', 'Deposit Forfeited', 'Sale Agent', 'Refund Amount'];
  applyHeaderStyle(cancelSheet.getRow(1), { argb: 'FF991B1B' }); // Red header for cancellations

  let cancelIdx = 0;
  job.bookings.forEach((b) => {
    if (b.status !== 'CANCELLED') return;
    const rowNum = cancelIdx + 2;
    const pay = b.payment;
    
    cancelSheet.getRow(rowNum).values = [
      b.bookingCode,
      b.bookingName,
      format(b.checkinAt, 'dd/MM/yyyy'),
      format(b.checkoutAt, 'dd/MM/yyyy'),
      b.totalGuests,
      b.totalRooms,
      pay ? pay.depositAmount : 0,
      b.saleName || 'N/A',
      pay ? (pay.discountAmount) : 0 // Using discount field or refund representation
    ];

    cancelSheet.getCell(rowNum, 7).numFmt = numberFormat;
    cancelSheet.getCell(rowNum, 9).numFmt = numberFormat;
    cancelIdx++;
  });

  cancelSheet.columns = [
    { width: 15 }, { width: 25 }, { width: 16 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 16 }, { width: 15 }, { width: 16 }
  ];

  // -------------------------------------------------------------
  // SHEET 8: DATA QUALITY
  // -------------------------------------------------------------
  const dqSheet = workbook.addWorksheet('Data Quality');
  dqSheet.views = [{ showGridLines: true }];

  dqSheet.getRow(1).values = ['Record Type', 'Identifier', 'Issue Level', 'Issue Description', 'Raw Value Source'];
  applyHeaderStyle(dqSheet.getRow(1), { argb: 'FFD97706' }); // Orange header for data quality

  let dqIdx = 0;

  // Find bookings missing hyperlinks
  job.cells.forEach((c) => {
    if (c.cellText && !c.hyperlink) {
      const rowNum = dqIdx + 2;
      dqSheet.getRow(rowNum).values = [
        'Forecast Cell',
        `Cell ${c.sheetName}!R${c.rowIndex}C${c.columnIndex}`,
        'WARNING',
        `Booking text exists but has NO hyperlink: "${c.cellText}"`,
        c.cellText
      ];
      dqIdx++;
    }
  });

  // Find booking-level parser warnings
  job.bookings.forEach((b) => {
    if (b.needsReview) {
      const rowNum = dqIdx + 2;
      dqSheet.getRow(rowNum).values = [
        'Booking Confirmation',
        b.bookingCode,
        'REVIEW REQUIRED',
        'Flagged for manual review (unclear date/price mismatch).',
        `Customer: ${b.bookingName}`
      ];
      dqIdx++;
    }

    const warningsArr = b.needsReview ? [
      ...(b.payment && Math.abs(b.payment.totalAmount - (b.rooms.reduce((s, r) => s + r.amount, 0) + b.meals.reduce((s, m) => s + m.amount, 0) + b.services.reduce((sum, svc) => sum + svc.amount, 0))) > 1000 ? ['Calculated sum differs from payment total.'] : [])
    ] : [];

    warningsArr.forEach((w) => {
      const rowNum = dqIdx + 2;
      dqSheet.getRow(rowNum).values = [
        'Booking Payment',
        b.bookingCode,
        'WARNING',
        w,
        `Stated total: ${b.payment?.totalAmount}`
      ];
      dqIdx++;
    });
  });

  dqSheet.columns = [
    { width: 18 }, { width: 18 }, { width: 16 }, { width: 40 }, { width: 30 }
  ];

  // Format all worksheets with Segoe UI to support Vietnamese diacritics consistently
  workbook.worksheets.forEach((sheet) => {
    sheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        const currentFont = cell.font || {};
        cell.font = {
          name: 'Segoe UI',
          ...currentFont
        };
      });
    });
  });

  // Return generated buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}
