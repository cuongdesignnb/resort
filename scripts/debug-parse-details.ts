import ExcelJS from 'exceljs';
import path from 'path';

function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;

  let cleanStr = String(val).trim();
  if (cleanStr === '') return 0;

  if (typeof val === 'object') {
    if ('result' in val) {
      return parseNumber(val.result);
    }
  }

  cleanStr = cleanStr.replace(/[^\d\.,\-]/g, '');

  const dotCount = (cleanStr.match(/\./g) || []).length;
  const commaCount = (cleanStr.match(/,/g) || []).length;

  if (commaCount > 0 && dotCount === 0) {
    const commaIndex = cleanStr.lastIndexOf(',');
    const decimalPlaces = cleanStr.length - 1 - commaIndex;
    if (commaCount === 1 && (decimalPlaces === 1 || decimalPlaces === 2)) {
      cleanStr = cleanStr.replace(',', '.');
    } else {
      cleanStr = cleanStr.replace(/,/g, '');
    }
  } else if (dotCount > 0 && commaCount === 0) {
    const dotIndex = cleanStr.lastIndexOf('.');
    const decimalPlaces = cleanStr.length - 1 - dotIndex;
    if (dotCount > 1 || decimalPlaces === 3) {
      cleanStr = cleanStr.replace(/\./g, '');
    }
  } else if (dotCount > 0 && commaCount > 0) {
    const lastDotIndex = cleanStr.lastIndexOf('.');
    const lastCommaIndex = cleanStr.lastIndexOf(',');
    if (lastCommaIndex > lastDotIndex) {
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
      cleanStr = cleanStr.replace(/,/g, '');
    }
  }

  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

async function debugParse() {
  const filePath = path.join(__dirname, '../tmp/booking_cache/1OlaYNcJkcTkNjyRkb3Yx2plT21jcKOxNerG8jOy64wE.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  sheet.eachRow({ includeEmpty: true }, (row, rowIndex) => {
    if (rowIndex > 85) return; // Only trace first 85 rows
    row.eachCell({ includeEmpty: true }, (cell, colIndex) => {
      const val = cell.value;
      if (val === null || val === undefined) return;
      const textVal = String(val).trim();
      const normText = textVal.toLowerCase();

      const getNextCellVal = () => {
        const nextCell = row.getCell(colIndex + 1);
        return nextCell ? nextCell.value : null;
      };

      if (normText.includes('booking code') || normText.includes('mã đặt phòng') || normText.includes('mã đp') || normText.includes('booking id') || normText.includes('mã ref')) {
        const nextVal = getNextCellVal();
        console.log(`[Row ${rowIndex} Col ${colIndex}] Booking Code Label: "${textVal}". Next cell: "${JSON.stringify(nextVal)}"`);
      } else if (normText.includes('customer name') || normText.includes('tên khách') || normText.includes('khách hàng') || normText.includes('guest name') || normText.includes('tên đoàn')) {
        const nextVal = getNextCellVal();
        console.log(`[Row ${rowIndex} Col ${colIndex}] Customer Name Label: "${textVal}". Next cell: "${JSON.stringify(nextVal)}"`);
      } else if (normText.includes('check-in') || normText.includes('checkin') || normText.includes('ngày đến') || normText.includes('ngay den') || normText.includes('arrival')) {
        const nextVal = getNextCellVal();
        console.log(`[Row ${rowIndex} Col ${colIndex}] Check-in Label: "${textVal}". Next cell: "${JSON.stringify(nextVal)}"`);
      } else if (normText.includes('check-out') || normText.includes('checkout') || normText.includes('ngày đi') || normText.includes('ngay di') || normText.includes('departure')) {
        const nextVal = getNextCellVal();
        console.log(`[Row ${rowIndex} Col ${colIndex}] Check-out Label: "${textVal}". Next cell: "${JSON.stringify(nextVal)}"`);
      } else if (normText.includes('total amount') || normText.includes('tổng cộng') || normText.includes('tong cong') || normText.includes('tổng tiền') || normText.includes('grand total') || normText.includes('tổng thanh toán')) {
        const nextVal = getNextCellVal();
        console.log(`[Row ${rowIndex} Col ${colIndex}] Total Amount Label: "${textVal}". Next cell: "${JSON.stringify(nextVal)}". Parsed: ${parseNumber(nextVal)}`);
      } else if (normText.includes('deposit') || normText.includes('tiền cọc') || normText.includes('đã cọc') || normText.includes('đặt cọc')) {
        const nextVal = getNextCellVal();
        console.log(`[Row ${rowIndex} Col ${colIndex}] Deposit Label: "${textVal}". Next cell: "${JSON.stringify(nextVal)}". Parsed: ${parseNumber(nextVal)}`);
      } else if (normText.includes('remaining') || normText.includes('còn lại') || normText.includes('còn phải thanh toán') || normText.includes('còn thanh toán')) {
        const nextVal = getNextCellVal();
        console.log(`[Row ${rowIndex} Col ${colIndex}] Remaining Label: "${textVal}". Next cell: "${JSON.stringify(nextVal)}". Parsed: ${parseNumber(nextVal)}`);
      }
    });
  });
}

debugParse().catch(console.error);
