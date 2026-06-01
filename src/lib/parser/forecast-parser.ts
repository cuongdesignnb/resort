import ExcelJS from 'exceljs';

export interface ParsedForecastCell {
  sheetName: string;
  forecastDate: Date;
  rowIndex: number;
  columnIndex: number;
  roomNumber: string;
  roomType: string;
  cellText: string | null;
  hyperlink: string | null;
  statusText: string | null;
  noteText: string | null;
  fillColor: string | null;
}

function getDayFromCellValue(val: any): number | null {
  if (val === null || val === undefined) return null;

  // 1. Check if it's a JS Date object
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.getDate();
    }
  }

  // 2. Check if it's a cell object with formula result or custom date structure
  if (typeof val === 'object') {
    if ('result' in val) {
      return getDayFromCellValue(val.result);
    }
    if ('date' in val && val.date instanceof Date) {
      return val.date.getDate();
    }
  }

  // 3. Try parsing string representation of dates
  const str = String(val).trim();
  if (str === '') return null;

  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.getDate();
    }
  }

  // Matches DD/MM/YYYY or D/M
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    if (day >= 1 && day <= 31) {
      return day;
    }
  }

  // 4. Try parsing as simple integer day number
  const num = Number(val);
  if (!isNaN(num) && num >= 1 && num <= 31 && !str.includes('.')) {
    return num;
  }

  return null;
}

function extractTextFromCellValue(val: any): string {
  if (val === null || val === undefined) return '';

  if (typeof val === 'object') {
    if ('result' in val) {
      return extractTextFromCellValue(val.result);
    }
    if ('text' in val) {
      return extractTextFromCellValue(val.text);
    }
    if ('richText' in val && Array.isArray(val.richText)) {
      return val.richText.map((t: any) => t?.text || '').join('');
    }
    if (Array.isArray(val)) {
      return val.map((v) => extractTextFromCellValue(v)).join('');
    }
  }

  return String(val).trim();
}

function extractHyperlinkFromCellValue(val: any): string {
  if (val === null || val === undefined) return '';

  if (typeof val === 'object') {
    if ('hyperlink' in val) {
      return String(val.hyperlink || '');
    }
    if ('result' in val) {
      return extractHyperlinkFromCellValue(val.result);
    }
  }
  return '';
}

function getMonthFromSheetName(sheetName: string): number | null {
  const normName = sheetName.normalize('NFC').toLowerCase().trim();

  // Matches "Tháng  5", "Tháng 5", "T5", "Month 5", etc.
  const match = normName.match(/(?:tháng|month|t|m)\s*(\d+)/) || normName.match(/(\d{1,2})[-/]\d{4}/) || normName.match(/^(\d{1,2})$/);
  if (match) {
    const m = parseInt(match[1], 10);
    if (m >= 1 && m <= 12) return m;
  }

  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  for (let i = 0; i < months.length; i++) {
    if (normName.includes(months[i])) {
      return i + 1;
    }
  }

  return null;
}

export async function parseForecastFile(
  filePath: string,
  year: number,
  targetMonth?: number
): Promise<{ cells: ParsedForecastCell[]; warnings: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const parsedCells: ParsedForecastCell[] = [];
  const warnings: string[] = [];

  workbook.worksheets.forEach((sheet) => {
    const sheetName = sheet.name;
    const sheetMonth = getMonthFromSheetName(sheetName);

    // If targetMonth is selected, skip worksheets representing other months
    if (targetMonth && sheetMonth !== null && sheetMonth !== targetMonth) {
      return;
    }

    const month = sheetMonth || targetMonth || 5;

    // Step 1: Scan first 10 rows to locate header row and columns index for Room & Type
    let headerRowIndex = -1;
    let roomColIndex = 1;
    let typeColIndex = 2;
    const dateCols: { colIndex: number; day: number }[] = [];

    // Prioritized search for Room / Room Type headers
    for (let r = 1; r <= 10; r++) {
      const row = sheet.getRow(r);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const val = cell.value;
        if (val !== null && val !== undefined) {
          const str = extractTextFromCellValue(val).toLowerCase();
          if (
            str === 'room' ||
            str === 'phòng' ||
            str === 'phong' ||
            str === 'số phòng' ||
            str === 'so phong' ||
            str.startsWith('số phòng') ||
            str.startsWith('so phong')
          ) {
            roomColIndex = colNumber;
          } else if (
            (str.includes('type') || str.includes('loại') || str.includes('loai') || str.includes('số lô') || str.includes('so lo')) &&
            !str.includes('giường') &&
            !str.includes('bed')
          ) {
            typeColIndex = colNumber;
          }
        }
      });
    }

    // Scan rows to find calendar date header
    for (let r = 1; r <= 10; r++) {
      const row = sheet.getRow(r);
      let dateFoundCount = 0;
      const tempDateCols: { colIndex: number; day: number }[] = [];

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const val = cell.value;
        const day = getDayFromCellValue(val);
        if (day !== null) {
          dateFoundCount++;
          tempDateCols.push({ colIndex: colNumber, day });
        }
      });

      if (dateFoundCount >= 25) {
        headerRowIndex = r;
        dateCols.push(...tempDateCols);
        break;
      }
    }

    if (headerRowIndex === -1) {
      warnings.push(`Sheet "${sheetName}": Không tìm thấy dòng ngày tiêu đề 1-31. Bỏ qua sheet này.`);
      return;
    }

    // Step 2: Check if there's a sub-header row (e.g. double-column: Name/Company, Status)
    let hasSubHeaders = false;
    let subHeaderRowIndex = -1;
    if (headerRowIndex < sheet.rowCount) {
      const nextRow = sheet.getRow(headerRowIndex + 1);
      const roomCellVal = extractTextFromCellValue(nextRow.getCell(roomColIndex)).toLowerCase();
      if (roomCellVal.includes('phòng') || roomCellVal.includes('room') || roomCellVal.includes('phong')) {
        hasSubHeaders = true;
        subHeaderRowIndex = headerRowIndex + 1;
      }
    }

    // Step 3: Iterate each room row (starts after headers)
    const startRowIndex = hasSubHeaders ? subHeaderRowIndex + 1 : headerRowIndex + 1;

    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex < startRowIndex) return;

      const roomNumberVal = row.getCell(roomColIndex).value;
      if (!roomNumberVal) return;

      const roomNumber = extractTextFromCellValue(roomNumberVal);
      if (!roomNumber) return;

      // Skip summary or formula rows
      const rmLower = roomNumber.toLowerCase();
      if (rmLower.includes('tổng') || rmLower.includes('total') || rmLower.includes('cộng') || rmLower.includes('occupancy')) {
        return;
      }

      const roomType = extractTextFromCellValue(row.getCell(typeColIndex).value);

      // Step 4: Parse dates for this room row
      dateCols.forEach(({ colIndex, day }) => {
        // Skip status columns in double-column layout
        if (hasSubHeaders) {
          const subHeaderVal = extractTextFromCellValue(sheet.getRow(subHeaderRowIndex).getCell(colIndex)).toLowerCase();
          const isStatusCol = subHeaderVal.includes('status') || subHeaderVal.includes('trạng thái') || subHeaderVal.includes('tt');
          if (isStatusCol) return;
        }

        const cell = row.getCell(colIndex);
        const cellValue = cell.value;
        if (!cellValue) return;

        let cellText = extractTextFromCellValue(cellValue);
        let hyperlink = extractHyperlinkFromCellValue(cellValue);

        if (!cellText) {
          cellText = cell.text || '';
        }
        if (!hyperlink) {
          hyperlink = cell.hyperlink || '';
        }

        cellText = cellText.trim();
        hyperlink = hyperlink.trim();

        // Treat dot (.) as empty cell
        if (!cellText || cellText === '.') return;

        // Peek cancellation status from adjacent status cell in double column sheets
        let statusText = 'CONFIRMED';
        let adjacentHyperlink = '';
        let adjacentNote = '';

        if (hasSubHeaders) {
          const nextCell = row.getCell(colIndex + 1);
          const nextVal = nextCell.value;
          if (nextVal) {
            const nextText = extractTextFromCellValue(nextVal);
            adjacentHyperlink = extractHyperlinkFromCellValue(nextVal) || nextCell.hyperlink || '';
            
            const txtUpper = nextText.toUpperCase();
            if (txtUpper.includes('HỦY') || txtUpper.includes('CANCEL') || txtUpper.includes('STRIKE')) {
              statusText = 'CANCELLED';
            }
          }

          if (nextCell.note) {
            if (typeof nextCell.note === 'string') {
              adjacentNote = nextCell.note;
            } else if (typeof nextCell.note === 'object' && (nextCell.note as any).texts) {
              adjacentNote = (nextCell.note as any).texts.map((t: any) => t.text).join('\n');
            }
          }
        }

        if (!hyperlink && adjacentHyperlink) {
          hyperlink = adjacentHyperlink;
        }

        // Parse comments/notes
        let noteText: string | null = null;
        if (cell.note) {
          if (typeof cell.note === 'string') {
            noteText = cell.note;
          } else if (typeof cell.note === 'object' && (cell.note as any).texts) {
            noteText = (cell.note as any).texts.map((t: any) => t.text).join('\n');
          }
        }

        if (adjacentNote) {
          noteText = noteText ? `${noteText}\nStatus Note: ${adjacentNote}` : adjacentNote;
        }

        // Parse status from the primary cell text as well
        const txtUpper = cellText.toUpperCase();
        if (txtUpper.includes('HỦY') || txtUpper.includes('CANCEL') || txtUpper.includes('STRIKE')) {
          statusText = 'CANCELLED';
        }

        // Get background color
        let fillColor: string | null = null;
        if (cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern === 'solid') {
          const colorObj = cell.fill.fgColor;
          if (colorObj && colorObj.argb) {
            fillColor = colorObj.argb;
          }
        }

        const forecastDate = new Date(year, month - 1, day, 12, 0, 0);

        parsedCells.push({
          sheetName,
          forecastDate,
          rowIndex,
          columnIndex: colIndex,
          roomNumber,
          roomType,
          cellText,
          hyperlink: hyperlink || null,
          statusText,
          noteText,
          fillColor,
        });
      });
    });
  });

  return { cells: parsedCells, warnings };
}
