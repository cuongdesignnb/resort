import { parse, isValid } from 'date-fns';

export interface ParsedMealLine {
  mealType: string; // BREAKFAST, LUNCH, DINNER, GALA, BBQ, TEAMBUILDING
  mealDate: Date;
  serviceName: string;
  restaurantName: string | null;
  unit: string; // Pax, Mâm, Set, etc.
  quantity: number;
  paxCount: number;
  tableCount: number;
  unitPrice: number;
  amount: number;
  confidence: number;
  needsReview: boolean;
  rawLine: string;
}

export function parseMealDate(
  dateStr: string,
  checkinDate: Date,
  checkoutDate: Date,
  forecastYear: number
): { date: Date; confidence: number; needsReview: boolean } {
  const normalized = dateStr.toLowerCase().trim();

  // Rule 1: "ngày checkin", "ngày đến", "check-in", "checkin"
  if (
    normalized.includes('checkin') ||
    normalized.includes('check-in') ||
    normalized.includes('ngày đến') ||
    normalized.includes('ngay den') ||
    normalized.includes('nhận phòng') ||
    normalized.includes('nhan phong')
  ) {
    return { date: new Date(checkinDate), confidence: 1.0, needsReview: false };
  }

  // Rule 2: "ngày checkout", "ngày đi", "check-out", "checkout"
  if (
    normalized.includes('checkout') ||
    normalized.includes('check-out') ||
    normalized.includes('ngày đi') ||
    normalized.includes('ngay di') ||
    normalized.includes('trả phòng') ||
    normalized.includes('tra phong')
  ) {
    return { date: new Date(checkoutDate), confidence: 1.0, needsReview: false };
  }

  // Rule 3: Exact date matching like "2026-05-31", "31/05/2026", "31/05"
  // Try YYYY-MM-DD first (starts with 4 digits)
  const ymdMatch = normalized.match(/^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const parsedDate = new Date(year, month - 1, day, 12, 0, 0);
    if (isValid(parsedDate)) {
      return { date: parsedDate, confidence: 1.0, needsReview: false };
    }
  }

  // Try DD/MM/YYYY or DD/MM
  const dmyMatch = normalized.match(/(\d{1,2})[-/\.](\d{1,2})(?:[-/\.](\d{2,4}))?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3] ? parseInt(dmyMatch[3].replace(/[^0-9]/g, ''), 10) : forecastYear;

    const fullYear = year < 100 ? 2000 + year : year;
    const parsedDate = new Date(fullYear, month - 1, day, 12, 0, 0);

    if (isValid(parsedDate)) {
      return { date: parsedDate, confidence: 1.0, needsReview: false };
    }
  }

  // Rule 4: Relational labels like "ngày 2", "day 2"
  const dayOffsetMatch = normalized.match(/(?:ngày|day)\s*(\d+)/i);
  if (dayOffsetMatch) {
    const offset = parseInt(dayOffsetMatch[1], 10);
    const targetDate = new Date(checkinDate);
    targetDate.setDate(targetDate.getDate() + (offset - 1));
    return { date: targetDate, confidence: 0.8, needsReview: false };
  }

  // If no date parsed, default to check-in and flag review
  return { date: new Date(checkinDate), confidence: 0.3, needsReview: true };
}

export function parseMealType(serviceName: string, description: string): string {
  const combined = `${serviceName} ${description}`.toLowerCase();

  if (combined.includes('gala')) return 'GALA';
  if (combined.includes('bbq')) return 'BBQ';
  if (combined.includes('sáng') || combined.includes('breakfast') || combined.includes('sang')) return 'BREAKFAST';
  if (combined.includes('trưa') || combined.includes('lunch') || combined.includes('trua')) return 'LUNCH';
  if (combined.includes('tối') || combined.includes('dinner') || combined.includes('toi')) return 'DINNER';
  if (combined.includes('teambuilding') || combined.includes('team building')) return 'TEAMBUILDING';

  return 'DINNER'; // Default dining category
}

export function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (val instanceof Date) return 0;
  if (typeof val === 'number') return val;

  let cleanStr = String(val).trim();
  if (cleanStr === '') return 0;

  // Check if it's a formula result object
  if (typeof val === 'object') {
    if ('result' in val) {
      return parseNumber(val.result);
    }
  }

  // Remove currency symbols, letters, spaces
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
      // Vietnamese format: 1.500.000,50 -> thousands are dots, decimal is comma
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
      // English format: 1,500,000.50 -> thousands are commas, decimal is dot
      cleanStr = cleanStr.replace(/,/g, '');
    }
  }

  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
}

export function analyzeMealLine(
  rowValues: any[],
  checkinDate: Date,
  checkoutDate: Date,
  totalGuests: number,
  forecastYear: number
): ParsedMealLine | null {
  // We assume columns: [Date, Meal Type/Name, Venue/Restaurant, Qty, Unit, Price, Total]
  // Row values will be mapped based on columns detected in the sheet
  const rawDate = String(rowValues[0] || '');
  const rawName = String(rowValues[1] || rowValues[2] || '');
  const restaurantName = String(rowValues[3] || '').trim() || null;
  const rawQty = rowValues[4];
  const rawUnit = String(rowValues[5] || 'Pax').trim();
  const rawPrice = rowValues[6];
  const rawAmount = rowValues[7];

  if (!rawDate && !rawName) return null;

  const { date: mealDate, confidence: dateConfidence, needsReview: dateNeedsReview } = parseMealDate(
    rawDate,
    checkinDate,
    checkoutDate,
    forecastYear
  );

  const mealType = parseMealType(rawName, rawDate);
  const quantity = parseNumber(rawQty);
  const unitPrice = parseNumber(rawPrice);
  const amount = parseNumber(rawAmount) || quantity * unitPrice;

  // Meal Unit Conversion Rules
  let paxCount = 0;
  let tableCount = 0;
  let unit = rawUnit;
  let needsReview = dateNeedsReview;

  const normalizedUnit = rawUnit.toLowerCase().trim();

  if (normalizedUnit.includes('mâm') || normalizedUnit.includes('mam') || normalizedUnit.includes('table')) {
    unit = 'Mâm';
    tableCount = quantity;
    // 1 mâm usually seats 6 pax (standard Vietnamese dining)
    paxCount = quantity * 6;
  } else if (normalizedUnit.includes('suất') || normalizedUnit.includes('pax') || normalizedUnit.includes('người') || normalizedUnit.includes('nguoi') || normalizedUnit.includes('khách') || normalizedUnit.includes('khach')) {
    unit = 'Pax';
    paxCount = quantity;
  } else {
    // If unit is ambiguous
    unit = rawUnit || 'Pax';
    paxCount = quantity;
    if (quantity > 0 && quantity !== totalGuests && totalGuests > 0) {
      needsReview = true;
    }
  }

  // Rule: Check if quantity matches expected headcount
  if (paxCount > 0 && totalGuests > 0 && Math.abs(paxCount - totalGuests) > 0.1 && mealType !== 'BREAKFAST') {
    // Flag for manual review if meal pax count is different from booking headcount (unless breakfast which might be free or included differently)
    needsReview = true;
  }

  const confidence = dateConfidence * (needsReview ? 0.7 : 1.0);

  return {
    mealType,
    mealDate,
    serviceName: rawName,
    restaurantName,
    unit,
    quantity,
    paxCount,
    tableCount,
    unitPrice,
    amount,
    confidence,
    needsReview,
    rawLine: rowValues.map(v => String(v || '')).join(' | '),
  };
}
