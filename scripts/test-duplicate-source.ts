import { parseForecastFile } from '../src/lib/parser/forecast-parser';
import { extractSpreadsheetId } from '../src/lib/parser/booking-downloader';
import path from 'path';

async function run() {
  const filePath = path.resolve('./CPR_DAILY_FORECAST_2026.xlsx');
  console.log(`Analyzing forecast file: ${filePath}`);
  const { cells } = await parseForecastFile(filePath, 2026, 5);

  console.log(`Total forecast cells: ${cells.length}`);

  // Simulate assigning cell.id (simulate database creation)
  const createdCells = cells.map((c, index) => ({
    cell: {
      id: `cell-uuid-${index}`,
      hyperlink: c.hyperlink,
      forecastDate: c.forecastDate,
      statusText: c.statusText,
    },
    original: c,
  }));

  // Identify unique booking links
  const uniqueLinks = new Map<string, typeof createdCells[0]>();
  createdCells.forEach((cc) => {
    if (cc.cell.hyperlink) {
      const fileId = extractSpreadsheetId(cc.cell.hyperlink);
      if (fileId) {
        if (!uniqueLinks.has(fileId)) {
          uniqueLinks.set(fileId, cc);
        }
      }
    }
  });

  const uniqueLinksArray = Array.from(uniqueLinks.entries());
  console.log(`Unique Links count: ${uniqueLinksArray.length}`);

  // Check if any cc.cell.id is duplicated in uniqueLinks
  const cellIds = uniqueLinksArray.map(([fileId, cc]) => cc.cell.id);
  const duplicateCellIds = cellIds.filter((item, index) => cellIds.indexOf(item) !== index);
  console.log('Duplicate cell IDs in uniqueLinks:', duplicateCellIds);

  // Check if there are any duplicate fileIds in uniqueLinks keys
  const fileIds = uniqueLinksArray.map(([fileId]) => fileId);
  const duplicateFileIds = fileIds.filter((item, index) => fileIds.indexOf(item) !== index);
  console.log('Duplicate file IDs in uniqueLinks:', duplicateFileIds);
}

run().catch(console.error);
