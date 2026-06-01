import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { parseForecastFile } from '../../../lib/parser/forecast-parser';
import { downloadBookingSheet, extractSpreadsheetId } from '../../../lib/parser/booking-downloader';
import { parseBookingFile } from '../../../lib/parser/booking-parser';
import { aggregateDailyStats } from '../../../lib/services/stats-aggregator';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = './tmp/uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let month = 5;
    let year = 2026;
    let fileName = '';
    let tempFilePath = '';

    let sourceUrl: string | null = null;
    let sourceType = 'FILE';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const monthStr = formData.get('month') as string;
      const yearStr = formData.get('year') as string;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
      }

      month = parseInt(monthStr || '5', 10);
      year = parseInt(yearStr || '2026', 10);
      fileName = file.name;
      tempFilePath = path.join(UPLOAD_DIR, `${Date.now()}_${file.name}`);
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(tempFilePath, fileBuffer);
    } else {
      const body = await request.json();
      if (body.loadSample) {
        month = 5;
        year = 2026;
        fileName = 'CPR_DAILY_FORECAST_2026.xlsx';
        sourceType = 'SAMPLE';
        const samplePath = path.resolve('./CPR_DAILY_FORECAST_2026.xlsx');
        if (!fs.existsSync(samplePath)) {
          return NextResponse.json({ error: 'Sample forecast file not found. Run sample generator script first.' }, { status: 400 });
        }
        tempFilePath = path.join(UPLOAD_DIR, `${Date.now()}_CPR_DAILY_FORECAST_2026.xlsx`);
        fs.copyFileSync(samplePath, tempFilePath);
      } else if (body.sourceUrl) {
        month = parseInt(body.month || '5', 10);
        year = parseInt(body.year || '2026', 10);
        sourceUrl = body.sourceUrl;
        sourceType = 'GOOGLE_SHEET';
        
        // Extract spreadsheet ID to name the file cleanly
        const match = body.sourceUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const fileId = match ? match[1] : 'GoogleSheet';
        fileName = `Google_Sheet_${fileId.substring(0, 8)}`;
        
        try {
          // Pass forceRefresh = true to bypass cache for the main forecast sheet download
          const { filePath } = await downloadBookingSheet(body.sourceUrl, true);
          // Make a copy to prevent background worker unlink from deleting cached booking files
          tempFilePath = path.join(UPLOAD_DIR, `${Date.now()}_${fileName}.xlsx`);
          fs.copyFileSync(filePath, tempFilePath);
        } catch (err: any) {
          return NextResponse.json({ error: `Không thể tải Google Sheet: ${err.message}` }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: 'Unsupported request format' }, { status: 400 });
      }
    }

    // Create a new import job in DB
    const job = await prisma.importJob.create({
      data: {
        sourceType,
        sourceUrl,
        fileName,
        uploadedFileUrl: tempFilePath,
        month,
        year,
        status: 'PROCESSING',
      },
    });

    // Run the parsing pipeline asynchronously so that we don't timeout the API response
    processImportJob(job.id, tempFilePath, year, month).catch((err) => {
      console.error(`Import Job ${job.id} background processing failed:`, err);
    });

    return NextResponse.json({
      success: true,
      message: 'File upload successful. Parsing started in the background.',
      jobId: job.id,
    });
  } catch (error: any) {
    console.error('Import API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

// Background parsing task
export async function processImportJob(jobId: string, filePath: string, year: number, month: number) {
  try {
    // Clean up all old successful/failed import jobs for the same month and year
    // to prevent bookingCode unique constraint violations and double counting.
    await prisma.importJob.deleteMany({
      where: {
        month,
        year,
        id: { not: jobId }
      }
    });

    // 1. Parse the forecast grid
    const { cells, warnings } = await parseForecastFile(filePath, year, month);

    // Save forecast cells to DB
    const createdCells = [];
    for (const c of cells) {
      const cell = await prisma.forecastCell.create({
        data: {
          importJobId: jobId,
          sheetName: c.sheetName,
          forecastDate: c.forecastDate,
          rowIndex: c.rowIndex,
          columnIndex: c.columnIndex,
          roomNumber: c.roomNumber,
          roomType: c.roomType,
          cellText: c.cellText,
          hyperlink: c.hyperlink,
          statusText: c.statusText,
          noteText: c.noteText,
          fillColor: c.fillColor,
        },
      });
      createdCells.push({ cell, original: c });
    }

    // 2. Identify unique booking links by spreadsheet ID (Google sheet file id)
    const uniqueLinks = new Map<string, typeof createdCells[0]>();
    createdCells.forEach((cc) => {
      if (cc.cell.hyperlink) {
        const fileId = extractSpreadsheetId(cc.cell.hyperlink);
        if (fileId) {
          if (!uniqueLinks.has(fileId)) {
            uniqueLinks.set(fileId, cc);
          }
        }
      }
    });

    // 3. Download bookings in parallel (network bound, throttled by batch size)
    const uniqueLinksArray = Array.from(uniqueLinks.entries());
    const downloadedBookings: { fileId: string; cc: typeof createdCells[0]; bookingPath: string }[] = [];
    const downloadBatchSize = 30;

    for (let i = 0; i < uniqueLinksArray.length; i += downloadBatchSize) {
      const batch = uniqueLinksArray.slice(i, i + downloadBatchSize);
      await Promise.all(
        batch.map(async ([fileId, cc]) => {
          try {
            const { filePath: bookingPath } = await downloadBookingSheet(cc.cell.hyperlink!);
            downloadedBookings.push({ fileId, cc, bookingPath });
          } catch (err: any) {
            console.error(`Error downloading booking sheet for ${fileId}:`, err);
            downloadedBookings.push({ fileId, cc, bookingPath: 'FAILED:' + err.message });
          }
        })
      );
    }

    // 4. Parse and write to DB sequentially (safe from database concurrency constraint violations)
    for (const { fileId, cc, bookingPath } of downloadedBookings) {
      let bookingCreated = false;
      try {
        if (bookingPath.startsWith('FAILED:')) {
          throw new Error(bookingPath.substring(7));
        }

        const parsed = await parseBookingFile(bookingPath, cc.cell.id, cc.cell.hyperlink!, year);

        // Deduplicate booking creations in case the same sheet has multiple codes
        // or code already exists in db
        let booking = await prisma.booking.findUnique({
          where: { bookingCode: parsed.bookingCode }
        });

        if (!booking) {
          // Link booking to cell
          booking = await prisma.booking.create({
            data: {
              importJobId: jobId,
              bookingCode: parsed.bookingCode,
              bookingName: parsed.bookingName,
              customerName: parsed.customerName,
              companyName: parsed.companyName,
              contactName: parsed.contactName,
              phone: parsed.phone,
              email: parsed.email,
              channel: parsed.channel,
              saleName: parsed.saleName,
              sourceCellId: cc.cell.id,
              sourceUrl: cc.cell.hyperlink,
              checkinAt: parsed.checkinAt,
              checkoutAt: parsed.checkoutAt,
              adults: parsed.adults,
              children6To11: parsed.children6To11,
              childrenUnder6: parsed.childrenUnder6,
              totalGuests: parsed.totalGuests,
              totalRooms: parsed.totalRooms,
              status: cc.cell.statusText || parsed.status, // Honor cancelled status from forecast
              needsReview: parsed.needsReview,
              rawText: parsed.rawText,
            },
          });

          // Insert rooms
          if (parsed.rooms.length > 0) {
            await prisma.bookingRoom.createMany({
              data: parsed.rooms.map((r) => ({
                bookingId: booking!.id,
                roomName: r.roomName,
                roomType: r.roomType,
                quantity: r.quantity,
                nights: r.nights,
                unitPrice: r.unitPrice,
                amount: r.amount,
              })),
            });
          }

          // Insert meals
          if (parsed.meals.length > 0) {
            await prisma.bookingMeal.createMany({
              data: parsed.meals.map((m) => ({
                bookingId: booking!.id,
                mealType: m.mealType,
                mealDate: m.mealDate,
                serviceName: m.serviceName,
                restaurantName: m.restaurantName,
                unit: m.unit,
                quantity: m.quantity,
                paxCount: m.paxCount,
                tableCount: m.tableCount,
                unitPrice: m.unitPrice,
                amount: m.amount,
                confidence: m.confidence,
                needsReview: m.needsReview,
                rawLine: m.rawLine,
              })),
            });
          }

          // Insert services
          if (parsed.services.length > 0) {
            await prisma.bookingService.createMany({
              data: parsed.services.map((s) => ({
                bookingId: booking!.id,
                serviceType: s.serviceType,
                serviceName: s.serviceName,
                serviceDate: s.serviceDate,
                unit: s.unit,
                quantity: s.quantity,
                unitPrice: s.unitPrice,
                amount: s.amount,
                rawLine: s.rawLine,
              })),
            });
          }

          // Insert payment
          await prisma.bookingPayment.create({
            data: {
              bookingId: booking!.id,
              depositAmount: parsed.payment.depositAmount,
              paidAmount: parsed.payment.paidAmount,
              remainingAmount: parsed.payment.remainingAmount,
              totalAmount: parsed.payment.totalAmount,
              paymentStatus: parsed.payment.paymentStatus,
              vatRequired: parsed.payment.vatRequired,
              commissionAmount: parsed.payment.commissionAmount,
              discountAmount: parsed.payment.discountAmount,
            },
          });
        }
        bookingCreated = true;

        // Update all forecast cells with this hyperlink in the current import job
        await prisma.forecastCell.updateMany({
          where: { 
            importJobId: jobId,
            hyperlink: cc.cell.hyperlink
          },
          data: { parsedBookingCode: parsed.bookingCode },
        });
      } catch (err: any) {
        console.error(`Error parsing booking code ${fileId}:`, err);
        if (!bookingCreated) {
          const errCode = 'ERR-' + fileId.substring(0, 15);
          const exists = await prisma.booking.findUnique({ where: { bookingCode: errCode } });
          if (!exists) {
            await prisma.booking.create({
              data: {
                importJobId: jobId,
                bookingCode: errCode,
                bookingName: `Failed Booking (${fileId.substring(0, 8)})`,
                sourceCellId: cc.cell.id,
                sourceUrl: cc.cell.hyperlink,
                checkinAt: cc.cell.forecastDate,
                checkoutAt: cc.cell.forecastDate,
                status: 'FAILED_READ',
                needsReview: true,
                rawText: `Error description: ${err.message}`,
              },
            });
          }
        }
      }
    }

    // 4. Run Daily stats aggregator
    await aggregateDailyStats(jobId);

    // 5. Update Job status
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'SUCCESS',
        finishedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error(`Import Job ${jobId} failed:`, error);
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errorMessage: error.message || 'Unknown processing error',
      },
    });
  } finally {
    // Delete temp uploaded file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('Error unlinking temp file:', e);
    }
  }
}

// Fetch list of imports
export async function GET() {
  try {
    const jobs = await prisma.importJob.findMany({
      orderBy: { startedAt: 'desc' },
    });
    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
