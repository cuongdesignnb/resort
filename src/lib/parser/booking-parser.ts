import ExcelJS from 'exceljs';
import { analyzeMealLine, parseNumber, ParsedMealLine } from './meal-analyzer';
import { parse } from 'date-fns';

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

function normalizeSearchText(str: string): string {
  return removeVietnameseTones(str)
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ParsedBookingRoom {
  roomName: string;
  roomType: string;
  quantity: number;
  nights: number;
  unitPrice: number;
  amount: number;
}

export interface ParsedBookingService {
  serviceType: string;
  serviceName: string;
  serviceDate: Date;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  rawLine: string;
}

export interface ParsedBookingPayment {
  depositAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalAmount: number;
  paymentStatus: string; // PAID, PARTIAL, UNPAID
  vatRequired: boolean;
  commissionAmount: number;
  discountAmount: number;
}

export interface ParsedBooking {
  bookingCode: string;
  bookingName: string;
  customerName: string | null;
  companyName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  channel: string | null;
  saleName: string | null;
  checkinAt: Date;
  checkoutAt: Date;
  adults: number;
  children6To11: number;
  childrenUnder6: number;
  totalGuests: number;
  totalRooms: number;
  status: string; // CONFIRMED, CANCELLED
  needsReview: boolean;
  rawText: string;
  rooms: ParsedBookingRoom[];
  meals: ParsedMealLine[];
  services: ParsedBookingService[];
  payment: ParsedBookingPayment;
  warnings: string[];
}

// Clean date parsing from cell values
function parseCellDate(val: any, fallbackYear?: number): Date | null {
  if (val instanceof Date) return val;
  if (!val) return null;

  const dStr = String(val).trim();
  // Try YYYY-MM-DD
  const ymdMatch = dStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    return new Date(parseInt(ymdMatch[1]), parseInt(ymdMatch[2]) - 1, parseInt(ymdMatch[3]), 12, 0, 0);
  }

  // Try DD-MM-YYYY
  const dmyMatch = dStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    return new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]), 12, 0, 0);
  }

  // Try DD/MM or DD-MM (without year)
  const dmMatch = dStr.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (dmMatch) {
    const year = fallbackYear || new Date().getFullYear();
    return new Date(year, parseInt(dmMatch[2]) - 1, parseInt(dmMatch[1]), 12, 0, 0);
  }

  const timestamp = Date.parse(dStr);
  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }

  return null;
}

// Extract string content from any cell value type under ExcelJS (handling richText/formulas)
function extractCleanText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (Array.isArray(val.richText)) {
      return val.richText.map((rt: any) => rt.text || '').join('');
    }
    if (val.text) {
      return extractCleanText(val.text);
    }
    if (val.result !== undefined) {
      return extractCleanText(val.result);
    }
    return JSON.stringify(val);
  }
  return String(val);
}

// Scans cells to the right to find a string value
function findStringToTheRight(row: ExcelJS.Row, startColIndex: number, labelText: string): string | null {
  const normLabel = labelText.trim().toLowerCase();
  for (let c = startColIndex + 1; c <= Math.min(row.cellCount, startColIndex + 8); c++) {
    const val = row.getCell(c).value;
    if (val === null || val === undefined) continue;
    if (val instanceof Date) continue; // Names are not Dates

    const textVal = extractCleanText(val).trim();
    if (textVal === '' || textVal.toLowerCase() === normLabel) continue;
    
    // Ignore long header section labels that might be merged
    if (textVal.includes('|') && textVal.length > 20) continue;

    // Ignore if cell contains the replica label text itself
    if (textVal.toLowerCase().includes(normLabel) || normLabel.includes(textVal.toLowerCase())) {
      continue;
    }

    // Ignore purely numeric values (since we are looking for a string like name/code)
    const cleanNumStr = textVal.replace(/[.,\sđ₫vndvmd\$]/gi, '');
    if (/^\d+$/.test(cleanNumStr) && cleanNumStr.length > 3) {
      continue;
    }
    
    return textVal;
  }
  return null;
}

// Scans cells to the right to find and construct a booking code (can concatenate short prefix + numbers)
function findBookingCodeToTheRight(row: ExcelJS.Row, startColIndex: number, labelText: string): string | null {
  const parts: string[] = [];
  const labelNorm = labelText.trim().toLowerCase();
  
  for (let c = startColIndex + 1; c <= Math.min(row.cellCount, startColIndex + 8); c++) {
    const val = row.getCell(c).value;
    if (val === null || val === undefined) continue;
    if (val instanceof Date) continue;
    
    const textVal = extractCleanText(val).trim();
    if (textVal === '' || textVal.toLowerCase() === labelNorm) continue;
    
    // Ignore long header section labels
    if (textVal.includes('|') && textVal.length > 20) continue;
    if (textVal.toLowerCase().includes(labelNorm) || labelNorm.includes(textVal.toLowerCase())) {
      continue;
    }
    
    if (parts.includes(textVal)) continue;
    parts.push(textVal);
    
    // If we have a code that is already reasonably long (e.g. >= 6 chars), stop.
    // Otherwise, continue to find another part (e.g. EZ + 11946)
    if (parts.length >= 2 || textVal.length >= 6) {
      break;
    }
  }
  
  if (parts.length === 0) return null;

  // Process gathered parts to extract clean booking code
  const firstPart = parts[0].trim();
  const isPrefix = /^[a-zA-Z]{2,4}-?$/.test(firstPart);
  
  let prefix = '';
  let rest = '';
  
  if (isPrefix) {
    prefix = firstPart.toUpperCase();
    rest = parts.slice(1).join(' ').trim();
  } else {
    rest = parts.join(' ').trim();
  }
  
  if (!rest) {
    return prefix || null;
  }
  
  const normRest = normalizeSearchText(rest);
  
  // Try matching "so xac nhan" (confirmation number)
  const sxnMatch = normRest.match(/so\s+xac\s+nhan\s*[:\-\s]*\s*([a-z0-9]+)/i);
  if (sxnMatch) {
    return prefix + sxnMatch[1].toUpperCase();
  }
  
  // Try matching "ma doan" (group code)
  const mdMatch = normRest.match(/ma\s+doan\s*[:\-\s]*\s*([a-z0-9]+)/i);
  if (mdMatch) {
    return prefix + mdMatch[1].toUpperCase();
  }
  
  // Default to extracting the first contiguous alphanumeric sequence from rest
  const wordMatch = rest.match(/^([a-zA-Z0-9\-_]+)/);
  if (wordMatch) {
    return prefix + wordMatch[1].toUpperCase();
  }
  
  return prefix + rest;
}

// Scans cells to the right to find a number value
function findNumberToTheRight(row: ExcelJS.Row, startColIndex: number, labelText: string): number | null {
  const normLabel = labelText.trim().toLowerCase();
  for (let c = startColIndex + 1; c <= Math.min(row.cellCount, startColIndex + 8); c++) {
    const val = row.getCell(c).value;
    if (val === null || val === undefined) continue;
    if (val instanceof Date) continue; // Dates are not payment amounts

    const textVal = extractCleanText(val).trim();
    if (textVal === '' || textVal.toLowerCase() === normLabel) continue;
    
    // Ignore date formats like DD/MM/YYYY or DD-MM
    if (/^\d{1,2}[-/.]\d{1,2}/.test(textVal)) continue;

    // Ignore if cell contains replica label text or doesn't have numeric sequence
    if (textVal.toLowerCase().includes(normLabel) || normLabel.includes(textVal.toLowerCase())) {
      continue;
    }

    const cleanNumStr = textVal.replace(/[.,\sđ₫vndvmd\$]/gi, '');
    if (!/^\d+$/.test(cleanNumStr)) {
      continue;
    }

    return parseNumber(val);
  }
  return null;
}

// Scans cells to the right to find a date value
function findDateToTheRight(row: ExcelJS.Row, startColIndex: number, labelText: string, fallbackYear?: number): Date | null {
  const normLabel = labelText.trim().toLowerCase();
  for (let c = startColIndex + 1; c <= Math.min(row.cellCount, startColIndex + 8); c++) {
    const val = row.getCell(c).value;
    if (val === null || val === undefined) continue;
    const textVal = extractCleanText(val).trim();
    if (textVal === '' || textVal.toLowerCase() === normLabel) continue;
    
    const parsedDate = parseCellDate(val, fallbackYear);
    if (parsedDate) {
      // Avoid time-only values having year 1899 or 1900
      if (parsedDate.getFullYear() > 1900) {
        return parsedDate;
      }
    }
  }
  return null;
}

// Resolves a headcount value (checks cell below first, then cells to the right)
function findHeadcountValue(sheet: ExcelJS.Worksheet, rowIndex: number, colIndex: number, labelText: string): number | null {
  const row = sheet.getRow(rowIndex);
  const normLabel = labelText.trim().toLowerCase();
  
  // First, check the cell below it (row + 1, same column)
  const nextRow = sheet.getRow(rowIndex + 1);
  if (nextRow) {
    const valBelow = nextRow.getCell(colIndex).value;
    if (valBelow !== null && valBelow !== undefined) {
      const textValBelow = extractCleanText(valBelow).trim();
      // If the cell below contains a clean number value and is not another text label
      if (/^\d+$/.test(textValBelow.replace(/[.,\s]/g, ''))) {
        return parseNumber(valBelow);
      }
    }
  }
  
  // Otherwise, scan cells to the right in the same row
  for (let c = colIndex + 1; c <= Math.min(row.cellCount, colIndex + 8); c++) {
    const val = row.getCell(c).value;
    if (val === null || val === undefined) continue;
    const textVal = extractCleanText(val).trim();
    if (textVal === '' || textVal.toLowerCase() === normLabel) continue;
    
    const num = parseNumber(val);
    // Make sure we only parse clean numeric values and ignore adjacent text labels
    if (/^\d+$/.test(textVal.replace(/[.,\s]/g, ''))) {
      return num;
    }
  }
  
  return null;
}

export async function parseBookingFile(
  filePath: string,
  sourceCellId?: string,
  sourceUrl?: string,
  fallbackYear?: number
): Promise<ParsedBooking> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // We will scan the first worksheet, or look for sheets containing "booking", "confirm", "voucher", "info"
  let sheet = workbook.worksheets[0];
  for (const s of workbook.worksheets) {
    const name = s.name.toLowerCase();
    if (name.includes('booking') || name.includes('confirm') || name.includes('voucher') || name.includes('info') || name.includes('chính') || name.includes('chinh')) {
      sheet = s;
      break;
    }
  }

  const warnings: string[] = [];
  let needsReview = false;

  // We will gather all texts to construct rawText
  const allTexts: string[] = [];

  // Variables to hold metadata
  let bookingCode = '';
  let customerName: string | null = null;
  let companyName: string | null = null;
  let contactName: string | null = null;
  let phone: string | null = null;
  let email: string | null = null;
  let channel: string | null = null;
  let saleName: string | null = null;
  let checkinAt: Date | null = null;
  let checkoutAt: Date | null = null;
  let parsedNights = 0;
  let adults = 0;
  let children6To11 = 0;
  let childrenUnder6 = 0;
  let totalGuests = 0;
  let totalRoomsVal = 0;
  let status = 'CONFIRMED';

  // Payments variables
  let depositAmount = 0;
  let paidAmount = 0;
  let remainingAmount = 0;
  let totalAmount = 0;
  let paymentStatus = 'UNPAID';
  let vatRequired = false;
  let commissionAmount = 0;
  let discountAmount = 0;

  // Tables
  const rooms: ParsedBookingRoom[] = [];
  const meals: ParsedMealLine[] = [];
  const services: ParsedBookingService[] = [];
  let hasHitTableHeader = false;

  // We do a global scan of the worksheet to extract key-value pairs
  sheet.eachRow({ includeEmpty: true }, (row, rowIndex) => {
    row.eachCell({ includeEmpty: true }, (cell, colIndex) => {
      const val = cell.value;
      if (val === null || val === undefined) return;
      const textVal = extractCleanText(cell.value).trim();
      allTexts.push(textVal);

      // Only scan for label matching if it's reasonably short (labels are not long disclaimers)
      if (textVal.length > 35) return;

      const normText = textVal.toLowerCase();
      const normSearch = normalizeSearchText(textVal);

      // Check Key-Value matches
      const isCheckinLabel = 
        normSearch.includes('check-in') || 
        normSearch.includes('check in') || 
        normSearch.includes('checkin') || 
        normSearch.includes('ngay den') || 
        normSearch.includes('arrival') ||
        normSearch.includes('nhan phong');

      const isCheckoutLabel = 
        normSearch.includes('check-out') || 
        normSearch.includes('check out') || 
        normSearch.includes('checkout') || 
        normSearch.includes('ngay di') || 
        normSearch.includes('departure') ||
        normSearch.includes('tra phong');

      const isSurchargeOrDiningLabel = 
        normSearch.includes('phu thu') || 
        normSearch.includes('an sang') || 
        normSearch.includes('an trua') || 
        normSearch.includes('an toi') || 
        normSearch.includes('mam') || 
        normSearch.includes('suat') || 
        normSearch.includes('phi') ||
        normSearch.includes('gala') ||
        normSearch.includes('bbq');

      const normTextNoSpace = normSearch.replace(/\s+/g, '');

      const isAdultsLabel = 
        !isSurchargeOrDiningLabel && (
          normTextNoSpace.includes('adults') || 
          normTextNoSpace.includes('nguoilon')
        );

      const isChildren6To11Label = 
        !isSurchargeOrDiningLabel && (
          normTextNoSpace.includes('children(6-11)') || 
          normTextNoSpace.includes('treem6-11') ||
          (normTextNoSpace.includes('treem') && normTextNoSpace.includes('6-11'))
        );

      const isChildrenUnder6Label = 
        !isSurchargeOrDiningLabel && (
          normTextNoSpace.includes('children(<6)') || 
          normTextNoSpace.includes('treem<6') ||
          normTextNoSpace.includes('duoi6')
        );

      const isTotalGuestsLabel = 
        !isSurchargeOrDiningLabel && (
          normTextNoSpace.includes('totalguests') || 
          normTextNoSpace.includes('tongkhach') || 
          normTextNoSpace.includes('soluongkhach')
        );

      const isTotalRoomsLabel = 
        !isSurchargeOrDiningLabel && (
          normTextNoSpace.includes('soluongphong') ||
          normTextNoSpace.includes('roomscount') ||
          normTextNoSpace.includes('totalrooms')
        );

      const isNightsLabel = 
        !isSurchargeOrDiningLabel && (
          normTextNoSpace.includes('sodem') || 
          normTextNoSpace.includes('soluongdem') ||
          normTextNoSpace.includes('nightscount') ||
          normTextNoSpace.includes('staynights')
        );

      const isBookingCodeLabel = 
        normSearch.includes('booking code') || 
        normSearch.includes('ma dat phong') || 
        normSearch.includes('ma dp') || 
        normSearch.includes('booking id') || 
        normSearch.includes('ma ref') || 
        normSearch.includes('order code') || 
        normSearch.includes('ma don hang') ||
        normSearch.includes('code check in') ||
        normSearch.includes('ma code check in') ||
        normSearch.includes('ma code') ||
        normSearch.includes('code') ||
        normSearch.includes('so xac nhan') ||
        normSearch.includes('ma doan') ||
        normSearch.includes('so xn') ||
        normSearch.includes('xac nhan');

      const isMetadataField = 
        isBookingCodeLabel ||
        normSearch.includes('customer name') || normSearch.includes('ten khach') || normSearch.includes('khach hang') || normSearch.includes('guest name') || normSearch.includes('ten doan') ||
        normSearch.includes('company name') || normSearch.includes('ten cong ty') || normSearch.includes('cong ty') || normSearch.includes('don vi') ||
        normSearch.includes('contact') || normSearch.includes('nguoi lien he') ||
        normSearch.includes('phone') || normSearch.includes('so dien thoai') || normSearch.includes('sdt') || normSearch.includes('tel') ||
        normSearch.includes('email') || normSearch.includes('thu dien tu') ||
        normSearch.includes('channel') || normSearch.includes('kenh ban') || normSearch.includes('nguon') ||
        normSearch.includes('sale staff') || normSearch.includes('sale') || normSearch.includes('nhan vien phu trách') || normSearch.includes('sales') ||
        isCheckinLabel || isCheckoutLabel || isAdultsLabel || isChildren6To11Label || isChildrenUnder6Label || isTotalGuestsLabel || isTotalRoomsLabel || isNightsLabel;

      // Detect if we hit a table header row in Phase 1
      const isHeaderRowText = 
        normSearch.includes('don gia') || 
        normSearch.includes('price') || 
        normSearch.includes('thanh tien') || 
        normSearch.includes('amount');
      if (isHeaderRowText) {
        hasHitTableHeader = true;
      }

      if (isMetadataField && hasHitTableHeader) {
        // Skip scanning guest metadata if we are inside a detail table section to avoid hijacking by detail items (like 'phụ thu người lớn')
        // but preserve totals metadata parsing
        const isTotalsMetadata = 
          normSearch.includes('total amount') || normSearch.includes('tong cong') || normSearch.includes('tong tien') || normSearch.includes('grand total') || normSearch.includes('tong thanh toan') ||
          normSearch.includes('deposit') || normSearch.includes('tien coc') || normSearch.includes('da coc') || normSearch.includes('dat coc') ||
          normSearch.includes('discount') || normSearch.includes('giam gia') || normSearch.includes('khuyen mai') ||
          normSearch.includes('remaining') || normSearch.includes('con lai') || normSearch.includes('con phai thanh toan') || normSearch.includes('con thanh toan') ||
          normSearch.includes('vat required') || normSearch.includes('hoa don vat') || normSearch.includes('thue vat') ||
          normSearch.includes('payment status') || normSearch.includes('trang thai thanh toan');
        if (!isTotalsMetadata) {
          return;
        }
      }

      if (isBookingCodeLabel) {
        // 1. Try to extract inline booking code directly from the cell text (e.g. "Mã code check in: 13130" or "Số xác nhận: 12744")
        const inlinePatterns = [
          /so\s+xac\s+nhan\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /ma\s+dat\s+phong\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /ma\s+dp\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /booking\s+code\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /order\s+code\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /ma\s+don\s+hang\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /code\s+check\s+in\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /ma\s+code\s+check\s+in\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /ma\s+code\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /code\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /ma\s+doan\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /so\s+xn\s*[:\-\s]+\s*([a-z0-9]+)/i,
          /xac\s+nhan\s*[:\-\s]+\s*([a-z0-9]+)/i
        ];
        
        let foundInline = '';
        for (const pattern of inlinePatterns) {
          const match = normSearch.match(pattern);
          if (match && match[1] && match[1].length >= 3) {
            foundInline = match[1].toUpperCase();
            break;
          }
        }
        
        if (foundInline) {
          bookingCode = foundInline;
        } else {
          // 2. Otherwise scan to the right
          const val = findBookingCodeToTheRight(row, colIndex, textVal);
          if (val !== null) bookingCode = val;
        }
      } else if (normSearch.includes('customer name') || normSearch.includes('ten khach') || normSearch.includes('khach hang') || normSearch.includes('guest name') || normSearch.includes('ten doan')) {
        const val = findStringToTheRight(row, colIndex, textVal);
        if (val !== null) customerName = val;
      } else if (normSearch.includes('company name') || normSearch.includes('ten cong ty') || normSearch.includes('cong ty') || normSearch.includes('don vi')) {
        const val = findStringToTheRight(row, colIndex, textVal);
        if (val !== null) companyName = val;
      } else if (normSearch.includes('contact') || normSearch.includes('nguoi lien he')) {
        const val = findStringToTheRight(row, colIndex, textVal);
        if (val !== null) contactName = val;
      } else if (normSearch.includes('phone') || normSearch.includes('so dien thoai') || normSearch.includes('sdt') || normSearch.includes('tel')) {
        const val = findStringToTheRight(row, colIndex, textVal);
        if (val !== null) phone = val;
      } else if (normSearch.includes('email') || normSearch.includes('thu dien tu')) {
        const val = findStringToTheRight(row, colIndex, textVal);
        if (val !== null) email = val;
      } else if (normSearch.includes('channel') || normSearch.includes('kenh ban') || normSearch.includes('nguon')) {
        const val = findStringToTheRight(row, colIndex, textVal);
        if (val !== null) channel = val;
      } else if (normSearch.includes('sale staff') || normSearch.includes('sale') || normSearch.includes('nhan vien phu trach') || normSearch.includes('sales')) {
        const val = findStringToTheRight(row, colIndex, textVal);
        if (val !== null) saleName = val;
      } else if (isCheckinLabel) {
        const val = findDateToTheRight(row, colIndex, textVal, fallbackYear);
        if (val !== null) checkinAt = val;
      } else if (isCheckoutLabel) {
        const val = findDateToTheRight(row, colIndex, textVal, fallbackYear);
        if (val !== null) checkoutAt = val;
      } else if (isAdultsLabel) {
        const val = findHeadcountValue(sheet, rowIndex, colIndex, textVal);
        if (val !== null) adults = val;
      } else if (isChildren6To11Label) {
        const val = findHeadcountValue(sheet, rowIndex, colIndex, textVal);
        if (val !== null) children6To11 = val;
      } else if (isChildrenUnder6Label) {
        const val = findHeadcountValue(sheet, rowIndex, colIndex, textVal);
        if (val !== null) childrenUnder6 = val;
      } else if (isTotalGuestsLabel) {
        const val = findHeadcountValue(sheet, rowIndex, colIndex, textVal);
        if (val !== null) totalGuests = val;
      } else if (isTotalRoomsLabel) {
        const val = findHeadcountValue(sheet, rowIndex, colIndex, textVal);
        if (val !== null) totalRoomsVal = val;
      } else if (isNightsLabel) {
        const val = findHeadcountValue(sheet, rowIndex, colIndex, textVal);
        if (val !== null) parsedNights = val;
      } else if (normSearch.includes('status') || normSearch.includes('trang thai')) {
        const val = findStringToTheRight(row, colIndex, textVal);
        if (val !== null) {
          const nextValNorm = val.toLowerCase();
          if (nextValNorm.includes('huy') || nextValNorm.includes('cancel')) {
            status = 'CANCELLED';
          }
        }
      } else if (normSearch.includes('total amount') || normSearch.includes('tong cong') || normSearch.includes('tong tien') || normSearch.includes('grand total') || normSearch.includes('tong thanh toan')) {
        const val = findNumberToTheRight(row, colIndex, textVal);
        if (val !== null) totalAmount = val;
      } else if (normSearch.includes('deposit') || normSearch.includes('tien coc') || normSearch.includes('da coc') || normSearch.includes('dat coc')) {
        const val = findNumberToTheRight(row, colIndex, textVal);
        if (val !== null) depositAmount = val;
      } else if (normSearch.includes('discount') || normSearch.includes('giam gia') || normSearch.includes('khuyen mai')) {
        const val = findNumberToTheRight(row, colIndex, textVal);
        if (val !== null) discountAmount = val;
      } else if (normSearch.includes('remaining') || normSearch.includes('con lai') || normSearch.includes('con phai thanh toan') || normSearch.includes('con thanh toan')) {
        const val = findNumberToTheRight(row, colIndex, textVal);
        if (val !== null) remainingAmount = val;
      } else if (normSearch.includes('vat required') || normSearch.includes('hoa don vat') || normSearch.includes('thue vat')) {
        const val = findStringToTheRight(row, colIndex, textVal);
        if (val !== null) {
          const normVal = normalizeSearchText(val);
          vatRequired = normVal === 'true' || normVal === '1' || normVal === 'co' || normVal === 'yes';
        }
      } else if (normSearch.includes('payment status') || normSearch.includes('trang thai thanh toan')) {
        const val = findStringToTheRight(row, colIndex, textVal);
        if (val !== null) paymentStatus = val.toUpperCase();
      }
    });
  });

  // Calculate totals and defaults if missing
  if (totalGuests === 0) {
    totalGuests = adults + children6To11 + childrenUnder6;
  }
  if (checkinAt && !checkoutAt) {
    checkoutAt = new Date(checkinAt);
    checkoutAt.setDate(checkoutAt.getDate() + 1);
    warnings.push('Checkout date was missing; defaulted to Check-in + 1 day.');
    needsReview = true;
  }
  if (!checkinAt) {
    checkinAt = new Date();
    warnings.push('Check-in date missing; defaulted to today.');
    needsReview = true;
  }
  if (!checkoutAt) {
    checkoutAt = new Date(checkinAt);
    checkoutAt.setDate(checkoutAt.getDate() + 1);
  }

  // Correct invalid checkout dates (before or equal to checkin date)
  if (checkinAt && checkoutAt && checkoutAt <= checkinAt) {
    const oldCheckout = checkoutAt;
    checkoutAt = new Date(checkinAt);
    const nights = parsedNights || 1;
    checkoutAt.setDate(checkoutAt.getDate() + nights);
    warnings.push(
      `Ngày Check-out (${oldCheckout.toISOString().split('T')[0]}) không hợp lệ (trước hoặc trùng Check-in); tự động điều chỉnh thành Check-in + ${nights} đêm (${checkoutAt.toISOString().split('T')[0]}).`
    );
    needsReview = true;
  }

  // Parse Booking Tables (Rooms, Meals, Services) using a unified state-based parser
  let currentSection: 'ROOMS' | 'MEALS' | 'SERVICES' | null = null;
  let hasReachedTotals = false;
  
  // Columns mapping (dynamically resolved if we find a header row)
  let descCol = 2; // Default to Column B
  let unitCol = -1;
  let nightCol = -1;
  let qtyCol = -1;
  let priceCol = -1;
  let amountCol = -1;
  let hasResolvedColumns = false;

  const totalRowCount = sheet.rowCount;
  const forecastYear = checkinAt.getFullYear();

  for (let r = 1; r <= totalRowCount; r++) {
    if (hasReachedTotals) {
      continue;
    }

    const row = sheet.getRow(r);
    
    let rowTextCombined = '';
    row.eachCell({ includeEmpty: false }, (cell) => {
      rowTextCombined += ' ' + extractCleanText(cell.value);
    });

    const normRowText = normalizeSearchText(rowTextCombined);

    if (normRowText === '') continue;

    // Detect section transitions
    const isRoomsSection = 
      normRowText.includes('dich vu luu tru') || 
      normRowText.includes('accommodation') || 
      normRowText.includes('chi tiet phong') || 
      normRowText.includes('room details') || 
      normRowText.includes('room list');

    const isMealsSection = 
      normRowText.includes('am thuc') || 
      normRowText.includes('f&b') || 
      normRowText.includes('dining') || 
      normRowText.includes('chi tiet an uong') || 
      normRowText.includes('meal details') || 
      normRowText.includes('suat an') || 
      normRowText.includes('f&b schedule') ||
      normRowText.includes('mon an');

    const isServicesSection = 
      normRowText.includes('dich vu khac') || 
      normRowText.includes('dich vu them') || 
      normRowText.includes('other services') || 
      normRowText.includes('additional services') || 
      normRowText.includes('bang phi phu thu') || 
      (normRowText.includes('phu thu') && 
       !normRowText.includes('phu thu nguoi') && 
       !normRowText.includes('phu thu tre') && 
       !normRowText.includes('phu thu phong') && 
       !normRowText.includes('phu thu an') && 
       !normRowText.includes('phu thu ve') && 
       !normRowText.includes('phu thu phi'));

    const isTotalsRow = 
      normRowText.includes('tong cong') || 
      normRowText.includes('grand total') || 
      normRowText.includes('dat coc') || 
      normRowText.includes('deposit') || 
      normRowText.includes('con lai') || 
      normRowText.includes('remaining') ||
      normRowText.includes('phai thanh toan');

    const resetColumns = () => {
      descCol = 2; // Default to Column B
      unitCol = -1;
      nightCol = -1;
      qtyCol = -1;
      priceCol = -1;
      amountCol = -1;
      hasResolvedColumns = false;
    };

    if (isTotalsRow && hasResolvedColumns) {
      hasReachedTotals = true;
      currentSection = null;
      hasResolvedColumns = false;
    } else if (isRoomsSection) {
      currentSection = 'ROOMS';
      continue;
    } else if (isMealsSection) {
      currentSection = 'MEALS';
      continue;
    } else if (isServicesSection) {
      currentSection = 'SERVICES';
      continue;
    }

    // Detect header row containing column labels
    const isHeaderRow = 
      normRowText.includes('don gia') || 
      normRowText.includes('price') || 
      normRowText.includes('thanh tien') || 
      normRowText.includes('amount');

    if (isHeaderRow) {
      // Dynamically map columns
      row.eachCell({ includeEmpty: false }, (cell, colIndex) => {
        const hText = normalizeSearchText(extractCleanText(cell.value));
        if (hText.includes('dich vu') || hText.includes('services') || hText.includes('noi dung')) {
          descCol = colIndex;
        } else if (hText.includes('dvt') || hText.includes('unit') || hText.includes('don vi')) {
          unitCol = colIndex;
        } else if (hText.includes('dem') || hText.includes('night')) {
          nightCol = colIndex;
        } else if (hText.includes('so luong') || hText.includes('quantity') || hText.includes('qty')) {
          qtyCol = colIndex;
        } else if (hText.includes('don gia') || hText.includes('price')) {
          priceCol = colIndex;
        } else if (hText.includes('thanh tien') || hText.includes('amount')) {
          amountCol = colIndex;
        }
      });
      hasResolvedColumns = true;
      continue;
    }

    // If we are currently in a data section, parse the row only if we have resolved the header columns
    if (currentSection !== null && hasResolvedColumns) {
      const description = extractCleanText(row.getCell(descCol).value).trim();
      if (!description) continue; // Skip empty rows

      // Resolve numeric column fallbacks if headers were not parsed
      const resolvedQtyCol = qtyCol !== -1 ? qtyCol : 3;
      const resolvedPriceCol = priceCol !== -1 ? priceCol : 5;
      const resolvedAmountCol = amountCol !== -1 ? amountCol : 6;
      const resolvedUnitCol = unitCol !== -1 ? unitCol : 4;
      const resolvedNightCol = nightCol !== -1 ? nightCol : -1;

      const qtyCell = row.getCell(resolvedQtyCol);
      const qtyText = extractCleanText(qtyCell.value).trim();
      
      const price = parseNumber(row.getCell(resolvedPriceCol).value);
      
      const amountCell = row.getCell(resolvedAmountCol);
      const amountText = extractCleanText(amountCell.value).trim();
      let amount = (amountText === '') ? 0 : parseNumber(amountCell.value);

      const qty = (qtyText === '') ? (amount > 0 ? 1 : 0) : parseNumber(qtyCell.value);

      const nightsCell = resolvedNightCol !== -1 ? row.getCell(resolvedNightCol) : null;
      const nightsText = nightsCell ? extractCleanText(nightsCell.value).trim() : '';
      const nights = (nightsText === '') ? 1 : (parseNumber(nightsCell!.value) || 1);
      
      if (amount === 0) {
        amount = currentSection === 'ROOMS' ? qty * nights * price : qty * price;
      }

      const unit = resolvedUnitCol !== -1 ? extractCleanText(row.getCell(resolvedUnitCol).value).trim() : '';

      if (currentSection === 'ROOMS') {
        rooms.push({
          roomName: description,
          roomType: description,
          quantity: qty,
          nights,
          unitPrice: price,
          amount,
        });
      } else if (currentSection === 'MEALS') {
        // Build raw array matching analyzeMealLine expectations
        const rowArr: any[] = [];
        rowArr[0] = null; // Date (will default to checkin/checkout inside analyzer)
        rowArr[1] = description;
        rowArr[2] = description;
        rowArr[3] = null; // Restaurant venue
        rowArr[4] = qty;
        rowArr[5] = unit;
        rowArr[6] = price;
        rowArr[7] = amount;

        const parsedMeal = analyzeMealLine(
          rowArr,
          checkinAt!,
          checkoutAt!,
          totalGuests,
          forecastYear
        );

        if (parsedMeal) {
          meals.push(parsedMeal);
          if (parsedMeal.needsReview) {
            needsReview = true;
            warnings.push(`Meal line has low confidence or mismatch: "${parsedMeal.rawLine}"`);
          }
        }
      } else if (currentSection === 'SERVICES') {
        services.push({
          serviceType: description.toLowerCase().includes('spa') ? 'SPA' : (description.toLowerCase().includes('xe') || description.toLowerCase().includes('transfer')) ? 'TRANSFER' : 'OTHER',
          serviceName: description,
          serviceDate: checkinAt!,
          unit: unit || 'Lượt',
          quantity: qty,
          unitPrice: price,
          amount,
          rawLine: `${description} | ${qty} | ${price} | ${amount}`,
        });
      }
    }
  }

  // Double-check total amount matches rooms + meals + services amounts
  const calculatedRoomsAmount = rooms.reduce((sum, item) => sum + item.amount, 0);
  const calculatedMealsAmount = meals.reduce((sum, item) => sum + item.amount, 0);
  const calculatedServicesAmount = services.reduce((sum, item) => sum + item.amount, 0);
  const calculatedTotal = calculatedRoomsAmount + calculatedMealsAmount + calculatedServicesAmount;

  if (totalAmount === 0) {
    totalAmount = calculatedTotal - discountAmount;
  } else if (Math.abs(totalAmount - (calculatedTotal - discountAmount)) > 1000) {
    warnings.push(`Calculated total (${calculatedTotal - discountAmount}) differs from stated total (${totalAmount}).`);
    needsReview = true;
  }

  if (remainingAmount === 0 && depositAmount > 0 && totalAmount > 0) {
    remainingAmount = totalAmount - depositAmount;
  }

  if (paymentStatus === 'UNPAID') {
    if (depositAmount >= totalAmount && totalAmount > 0) {
      paymentStatus = 'PAID';
    } else if (depositAmount > 0) {
      paymentStatus = 'PARTIAL';
    }
  }

  const rawText = allTexts.join('\n');
  let totalRooms = rooms.reduce((sum, item) => sum + item.quantity, 0);
  if (totalRooms === 0 && totalRoomsVal > 0) {
    totalRooms = totalRoomsVal;
  }

  // If there's no code found, check Row 7 (which contains booking code for owner/host bookings)
  if (!bookingCode) {
    const row7 = sheet.getRow(7);
    if (row7) {
      const col1Val = row7.getCell(1).value;
      if (col1Val && extractCleanText(col1Val).toLowerCase().includes('mã căn')) {
        // Look at cells from col 6 to col 11
        for (let c = 6; c <= 11; c++) {
          const val = row7.getCell(c).value;
          if (val !== null && val !== undefined) {
            const txt = extractCleanText(val).trim();
            if (txt) {
              const normTxt = normalizeSearchText(txt);
              const numMatch = txt.replace(/\s+/g, '').match(/^\d+$/);
              if (numMatch) {
                bookingCode = numMatch[0];
                break;
              }
              const sxnMatch = normTxt.match(/so\s+xac\s+nhan\s*[:\-\s]*\s*([a-z0-9]+)/i);
              if (sxnMatch) {
                bookingCode = sxnMatch[1].toUpperCase();
                break;
              }
              const mdMatch = normTxt.match(/ma\s+doan\s*[:\-\s]*\s*([a-z0-9]+)/i);
              if (mdMatch) {
                bookingCode = mdMatch[1].toUpperCase();
                break;
              }
            }
          }
        }
      }
    }
  }

  // If there's no code found, try fallback scanning of Row 14-16 (where booking code usually resides in the template)
  if (!bookingCode) {
    for (const rIndex of [14, 15, 16]) {
      const r = sheet.getRow(rIndex);
      if (r) {
        const col5Val = r.getCell(5).value;
        const col7Val = r.getCell(7).value;
        if (col5Val && col7Val) {
          const p5 = extractCleanText(col5Val).trim();
          const p7 = extractCleanText(col7Val).trim();
          // Make sure it doesn't contain check-in dates or table headers or other things
          if (p5 && p7 && !p5.toLowerCase().includes('check') && !p7.toLowerCase().includes('check') && p5.length < 15 && p7.length < 15) {
            const cleanP5 = p5.replace(/\s+/g, '');
            const cleanP7 = p7.replace(/\s+/g, '');
            // Only accept if p7 is numeric (like "13120" or "11946") or alphanumeric
            if (/^[a-z0-9\-_]+$/i.test(cleanP7)) {
              bookingCode = (cleanP5 + cleanP7).toUpperCase();
              break;
            }
          }
        }
      }
    }
  }

  // If there's no code found, fallback to filename ID or cell text
  if (!bookingCode) {
    const fileBase = filePath.split(/[\\/]/).pop()?.split('.')[0] || 'UNKNOWN';
    if (fileBase.length > 15) {
      bookingCode = 'BK-' + fileBase.substring(0, 8);
    } else {
      bookingCode = fileBase.replace('mock-booking-', 'BK-');
    }
    warnings.push(`Booking code was missing. Extracted "${bookingCode}" from spreadsheet source.`);
    needsReview = true;
  }

  // Concatenate customer name + sale name for a better descriptive name
  let bookingName = '';
  const primaryName = customerName || companyName || `Booking ${bookingCode}`;
  if (primaryName) {
    bookingName = primaryName;
    if (saleName && (saleName as string).trim() !== '' && !primaryName.includes(saleName as string)) {
      const shortSale = (saleName as string).split('-')[0].trim();
      bookingName = `${primaryName} (${shortSale})`;
    }
  } else {
    bookingName = `Booking ${bookingCode}`;
  }

  return {
    bookingCode,
    bookingName,
    customerName,
    companyName,
    contactName,
    phone,
    email,
    channel: channel || 'OTA',
    saleName: saleName || 'Mr. Admin',
    checkinAt: checkinAt!,
    checkoutAt: checkoutAt!,
    adults,
    children6To11,
    childrenUnder6,
    totalGuests,
    totalRooms,
    status,
    needsReview,
    rawText,
    rooms,
    meals,
    services,
    payment: {
      depositAmount,
      paidAmount: depositAmount,
      remainingAmount,
      totalAmount,
      paymentStatus,
      vatRequired,
      commissionAmount,
      discountAmount,
    },
    warnings,
  };
}
