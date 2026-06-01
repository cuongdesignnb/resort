import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

async function run() {
  const cacheDir = './tmp/booking_cache';
  const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.xlsx'));
  console.log(`Searching through ${files.length} files...`);

  for (const file of files) {
    const filePath = path.join(cacheDir, file);
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      let found = false;
      
      for (const sheet of workbook.worksheets) {
        sheet.eachRow((row) => {
          row.eachCell((cell) => {
            const val = cell.value;
            if (val === null || val === undefined) return;
            const textVal = String(val);
            if (textVal.includes('11946')) {
              console.log(`FOUND IN FILE: ${file} | Sheet: "${sheet.name}" | Cell value: "${textVal}"`);
              found = true;
            }
          });
        });
      }
      if (found) {
        // Stop after finding the match
        break;
      }
    } catch (e: any) {
      // ignore read errors
    }
  }
}

run().catch(console.error);
