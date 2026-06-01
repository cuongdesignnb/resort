import { parseBookingFile } from '../src/lib/parser/booking-parser';
import fs from 'fs';
import path from 'path';

async function testAll() {
  const cacheDir = path.join(__dirname, '../tmp/booking_cache');
  if (!fs.existsSync(cacheDir)) {
    console.log('No cache dir found');
    return;
  }
  const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.xlsx'));
  console.log(`Found ${files.length} files in cache.`);

  let bkCount = 0;
  let successCount = 0;
  const sampleBks: { file: string; code: string }[] = [];

  for (const file of files) {
    const filePath = path.join(cacheDir, file);
    try {
      const parsed = await parseBookingFile(filePath, undefined, undefined, 2026);
      if (parsed.bookingCode.startsWith('BK-') || parsed.bookingCode.startsWith('ERR-')) {
        bkCount++;
        if (sampleBks.length < 20) {
          sampleBks.push({ file, code: parsed.bookingCode });
        }
      } else {
        successCount++;
      }
    } catch (e: any) {
      // ignore
    }
  }

  console.log(`\nResults:`);
  console.log(`- Successfully parsed custom code: ${successCount}`);
  console.log(`- Failed / Fallback to BK- or ERR-: ${bkCount}`);
  console.log(`- Samples of BK- fallbacks:`, JSON.stringify(sampleBks, null, 2));
}

testAll().catch(console.error);
