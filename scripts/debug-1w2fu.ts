import ExcelJS from 'exceljs';
import path from 'path';

function extractCleanText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if ('result' in val) return extractCleanText(val.result);
    if ('text' in val) return extractCleanText(val.text);
    if ('richText' in val && Array.isArray(val.richText)) {
      return val.richText.map((rt: any) => rt.text || '').join('');
    }
  }
  return String(val);
}

async function run() {
  const filePath = path.resolve('./tmp/booking_cache/1OlaYNcJkcTkNjyRkb3Yx2plT21jcKOxNerG8jOy64wE.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  let sheet = workbook.worksheets[0];
  for (const s of workbook.worksheets) {
    const name = s.name.toLowerCase();
    if (name.includes('booking') || name.includes('confirm') || name.includes('voucher') || name.includes('info')) {
      sheet = s;
      break;
    }
  }

  console.log(`Sheet selected: "${sheet.name}"`);
  let currentSection: string | null = null;
  let hasResolvedColumns = false;

  sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex > 80) return;
    const cellTexts: string[] = [];
    row.eachCell({ includeEmpty: false }, (cell) => {
      const txt = extractCleanText(cell.value).trim();
      if (txt) cellTexts.push(txt);
    });

    const rowTextCombined = cellTexts.join(' | ').toLowerCase();
    
    const isRoomsSection = 
      rowTextCombined.includes('chi tiết phòng') || 
      rowTextCombined.includes('room details') || 
      rowTextCombined.includes('room list');

    const isMealsSection = 
      rowTextCombined.includes('ẩm thực') || 
      rowTextCombined.includes('f&b') || 
      rowTextCombined.includes('dining') || 
      rowTextCombined.includes('chi tiết ăn uống') || 
      rowTextCombined.includes('meal details') || 
      rowTextCombined.includes('suất ăn') || 
      rowTextCombined.includes('f&b schedule') ||
      rowTextCombined.includes('món ăn');

    const isServicesSection = 
      rowTextCombined.includes('dịch vụ khác') || 
      rowTextCombined.includes('dịch vụ thêm') || 
      rowTextCombined.includes('other services') || 
      rowTextCombined.includes('additional services') || 
      rowTextCombined.includes('bảng phí phụ thu') || 
      rowTextCombined.includes('phụ thu');

    const isTotalsRow = 
      rowTextCombined.includes('tổng cộng') || 
      rowTextCombined.includes('grand total') || 
      rowTextCombined.includes('đặt cọc') || 
      rowTextCombined.includes('deposit') || 
      rowTextCombined.includes('còn lại') || 
      rowTextCombined.includes('remaining') ||
      rowTextCombined.includes('phải thanh toán');

    let sectionChange = '';
    if (isTotalsRow && hasResolvedColumns) {
      currentSection = null;
      sectionChange = ' -> TOTALS RESET (NULL)';
    } else if (isRoomsSection) {
      currentSection = 'ROOMS';
      sectionChange = ' -> ROOMS';
    } else if (isMealsSection) {
      currentSection = 'MEALS';
      sectionChange = ' -> MEALS';
    } else if (isServicesSection) {
      currentSection = 'SERVICES';
      sectionChange = ' -> SERVICES';
    }

    const isHeaderRow = 
      rowTextCombined.includes('đơn giá') || 
      rowTextCombined.includes('price') || 
      rowTextCombined.includes('thành tiền') || 
      rowTextCombined.includes('amount');

    if (isHeaderRow) {
      hasResolvedColumns = true;
      sectionChange += ' [HEADER ROW DETECTED]';
    }

    console.log(`Row ${rowIndex}: [Section: ${currentSection}]${sectionChange} | Content: "${rowTextCombined}"`);
  });
}

run().catch(console.error);
