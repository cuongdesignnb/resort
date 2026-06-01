import fs from 'fs';
import path from 'path';
import axios from 'axios';

const MOCK_DIR = process.env.MOCK_GOOGLE_DRIVE_DIR || './mock_google_drive';
const CACHE_DIR = './tmp/booking_cache';

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function extractSpreadsheetId(url: string): string | null {
  // Regex to extract ID from google spreadsheet url
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function downloadBookingSheet(
  url: string,
  forceRefresh = false
): Promise<{ filePath: string; isMock: boolean }> {
  const fileId = extractSpreadsheetId(url);
  if (!fileId) {
    throw new Error(`Invalid Google Sheets URL: ${url}`);
  }

  const cachePath = path.join(CACHE_DIR, `${fileId}.xlsx`);
  const mockPath = path.resolve(path.join(MOCK_DIR, `${fileId}.xlsx`));
  const isMockId = fileId.startsWith('mock') || fs.existsSync(mockPath);

  // Check if there is a cached version
  if (!forceRefresh && fs.existsSync(cachePath)) {
    return { filePath: cachePath, isMock: isMockId };
  }

  // Handle mock files
  if (isMockId) {
    if (fs.existsSync(mockPath)) {
      fs.copyFileSync(mockPath, cachePath);
      return { filePath: cachePath, isMock: true };
    } else {
      // Fallback default mock for demo bookings
      const files = fs.readdirSync(MOCK_DIR).filter((f) => f.endsWith('.xlsx'));
      if (files.length > 0) {
        // Try to match the index or take the first one
        const matchFile = files.find((f) => f.includes(fileId)) || files[0];
        const fallbackPath = path.join(MOCK_DIR, matchFile);
        fs.copyFileSync(fallbackPath, cachePath);
        return { filePath: cachePath, isMock: true };
      }
    }
  }

  // Live download
  try {
    const downloadUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream',
      headers: {
        // Add auth token if configured in environments
        ...(process.env.GOOGLE_OAUTH_TOKEN ? { Authorization: `Bearer ${process.env.GOOGLE_OAUTH_TOKEN}` } : {}),
      },
    });

    const contentType = String(response.headers['content-type'] || '');
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      response.data.destroy();
      throw new Error(
        'Tải file thất bại. Google Sheet có thể ở chế độ riêng tư (Private) hoặc link không hợp lệ. ' +
        'Vui lòng chia sẻ công khai trang tính dưới dạng "Bất kỳ ai có liên kết đều có thể xem" (Anyone with the link can view).'
      );
    }

    const writer = fs.createWriteStream(cachePath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', (err) => {
        writer.close();
        if (fs.existsSync(cachePath)) {
          fs.unlinkSync(cachePath);
        }
        reject(err);
      });
    });

    return { filePath: cachePath, isMock: false };
  } catch (error: any) {
    // If it was supposed to be a mock but we reached here, try mock files as ultimate fallback
    if (isMockId) {
      const files = fs.readdirSync(MOCK_DIR).filter((f) => f.endsWith('.xlsx'));
      if (files.length > 0) {
        const fallbackPath = path.join(MOCK_DIR, files[0]);
        fs.copyFileSync(fallbackPath, cachePath);
        return { filePath: cachePath, isMock: true };
      }
    }
    
    // Clean up cache file if created and empty
    if (fs.existsSync(cachePath)) {
      try {
        fs.unlinkSync(cachePath);
      } catch {}
    }

    throw new Error(
      error.message.includes('Tải file thất bại')
        ? error.message
        : `Không thể tải dữ liệu từ Google Sheets: ${error.message}. ` +
          `Vui lòng kiểm tra quyền chia sẻ "Anyone with the link can view".`
    );
  }
}
