import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { downloadBookingSheet } from '@/lib/parser/booking-downloader';
import { processImportJob } from '../route';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = './tmp/uploads';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get the latest successful GOOGLE_SHEET import job
    const latestJob = await prisma.importJob.findFirst({
      where: {
        status: 'SUCCESS',
        sourceType: 'GOOGLE_SHEET',
        sourceUrl: { not: null },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!latestJob || !latestJob.sourceUrl) {
      return NextResponse.json({
        success: false,
        error: 'Chưa có Google Sheet nào được import thành công trước đó để đồng bộ.',
      }, { status: 400 });
    }

    const { month, year, sourceUrl } = latestJob;
    const match = sourceUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const fileId = match ? match[1] : 'GoogleSheet';
    const fileName = `Sync_Google_Sheet_${fileId.substring(0, 8)}`;

    console.log(`Starting automated live sync for ${sourceUrl} (Month: ${month}/${year})`);

    // 2. Download the sheet again (bypass cache to fetch fresh data)
    let tempFilePath = '';
    try {
      const { filePath } = await downloadBookingSheet(sourceUrl, true);
      tempFilePath = path.join(UPLOAD_DIR, `${Date.now()}_${fileName}.xlsx`);
      fs.copyFileSync(filePath, tempFilePath);
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: `Không thể tải Google Sheet để đồng bộ: ${err.message}`,
      }, { status: 400 });
    }

    // 3. Create a new import job in status PROCESSING
    const job = await prisma.importJob.create({
      data: {
        sourceType: 'GOOGLE_SHEET',
        sourceUrl,
        fileName,
        uploadedFileUrl: tempFilePath,
        month,
        year,
        status: 'PROCESSING',
      },
    });

    // 4. Run the parsing pipeline asynchronously
    processImportJob(job.id, tempFilePath, year, month).catch((err) => {
      console.error(`Automated sync job ${job.id} background processing failed:`, err);
    });

    return NextResponse.json({
      success: true,
      message: 'Bắt đầu đồng bộ trực tiếp từ Google Sheet trong nền thành công.',
      jobId: job.id,
    });
  } catch (error: any) {
    console.error('Sync API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Support simple GET requests for cron job triggers
  return POST(request);
}
