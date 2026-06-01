import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

function cleanValue(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (Array.isArray(val.richText)) {
      return val.richText.map((rt: any) => rt.text || '').join('');
    }
    if (val.text) {
      return cleanValue(val.text);
    }
    if (val.result !== undefined) {
      return cleanValue(val.result);
    }
    return JSON.stringify(val);
  }
  return String(val);
}

async function dumpCells() {
  const fileArg = process.argv[2] || '1W2fuENEHOVMQ3LoYsBXhJ0sbtuM98KXc.xlsx';
  const filePath = path.join(__dirname, '../tmp/booking_cache', fileArg);
  
  console.log(`Dumping rows for: ${filePath}`);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  
  sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex > 120) return;
    const cols: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colIndex) => {
      const val = cleanValue(cell.value);
      if (val) {
        cols.push(`C${colIndex}: "${val}"`);
      }
    });
    if (cols.length > 0) {
      console.log(`Row ${rowIndex}:`, cols.join(' | '));
    }
  });
}

dumpCells().catch(console.error);
