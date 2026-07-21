import * as xlsx from 'xlsx';
import { RawTransactionRow, ParsedWorkbook } from './types';
import { COLUMN_MAPS } from './columnMaps';

function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function extractRows(sheet: xlsx.WorkSheet, headerMap: Record<string, string>, startRow: number = 1): RawTransactionRow[] {
  // Use header: 1 to get array of arrays
  const json: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  if (json.length <= startRow) return [];

  // Find header row and build column index map
  const headerRow = json[startRow];
  if (!headerRow) return [];
  
  const colIndex: Record<string, number> = {};
  headerRow.forEach((col: any, index: number) => {
    if (col && typeof col === 'string') {
      const key = col.trim();
      // Only take the first occurrence (duplicate columns exist in some sheets)
      if (!(key in colIndex)) {
        colIndex[key] = index;
      }
    }
  });

  const rows: RawTransactionRow[] = [];
  
  for (let i = startRow + 1; i < json.length; i++) {
    const row = json[i];
    if (!row || row.length === 0) continue;

    const seller = row[colIndex[headerMap.seller]];
    const buyer = row[colIndex[headerMap.buyer]];
    
    // Skip empty essential rows
    if (!seller || !buyer) continue;

    const invoice = String(row[colIndex[headerMap.invoice]] || '');
    const dpp = parseNumber(row[colIndex[headerMap.dpp]]);
    const ppn = parseNumber(row[colIndex[headerMap.ppn]]);
    const approval = String(row[colIndex[headerMap.approval]] || 'Unknown');
    const masa = String(row[colIndex[headerMap.masa]] || '');
    const tahun = String(row[colIndex[headerMap.tahun]] || '');
    
    rows.push({
      sellerName: String(seller).trim(),
      buyerName: String(buyer).trim(),
      invoiceNumber: invoice.trim(),
      dpp,
      ppn,
      approvalStatus: approval.trim(),
      period: `${masa} / ${tahun}`.trim()
    });
  }

  return rows;
}

export function parseDataPerusahaanSheet(sheet: xlsx.WorkSheet): string[] {
  const json: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  if (json.length <= 0) return [];
  
  const headerRow = json[0];
  let compIdx = -1;
  headerRow.forEach((col: any, index: number) => {
    if (col && typeof col === 'string' && col.trim() === COLUMN_MAPS.DATA_PERUSAHAAN.company) {
      compIdx = index;
    }
  });

  if (compIdx === -1) return [];

  const companies: string[] = [];
  for (let i = 1; i < json.length; i++) {
    const row = json[i];
    if (row && row[compIdx]) {
      companies.push(String(row[compIdx]).trim());
    }
  }
  return companies;
}

export function parseWorkbook(buffer: ArrayBuffer): ParsedWorkbook {
  const workbook = xlsx.read(buffer, { type: 'array' });
  
  // Find sheets (case-insensitive for Data Perusahaan)
  let dpSheetName = 'Data Perusahaan';
  workbook.SheetNames.forEach(name => {
    if (name.toLowerCase() === 'data perusahaan') dpSheetName = name;
  });

  return {
    fm: workbook.Sheets['FM'] ? extractRows(workbook.Sheets['FM'], COLUMN_MAPS.FM, 1) : [],
    fk: workbook.Sheets['FK'] ? extractRows(workbook.Sheets['FK'], COLUMN_MAPS.FK, 1) : [],
    fmCrtx: workbook.Sheets['FM_CRTX'] ? extractRows(workbook.Sheets['FM_CRTX'], COLUMN_MAPS.FM_CRTX, 1) : [],
    fkCrtx: workbook.Sheets['FK_CRTX'] ? extractRows(workbook.Sheets['FK_CRTX'], COLUMN_MAPS.FK_CRTX, 1) : [],
    dataPerusahaan: workbook.Sheets[dpSheetName] ? parseDataPerusahaanSheet(workbook.Sheets[dpSheetName]) : []
  };
}
