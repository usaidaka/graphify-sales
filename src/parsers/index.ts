import * as xlsx from 'xlsx';
import { RawTransactionRow, ParsedWorkbook, InternalCompanyMaster } from './types';
import { COLUMN_MAPS } from './columnMaps';

function parseNumber(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function isNpwpEmptyOrImport(val: any): boolean {
  if (!val) return true;
  const str = String(val).trim();
  return str === '' || str === '-' || str === '0' || str.startsWith('-');
}

const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

function parseMonth(val: any): number | null {
  const normalized = String(val ?? '').trim().toLowerCase();
  if (!normalized) return null;

  const numericMonth = Number(normalized);
  if (Number.isInteger(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
    return numericMonth;
  }

  return INDONESIAN_MONTHS[normalized] ?? null;
}

function parseYear(val: any): number | null {
  const year = Number(String(val ?? '').trim());
  return Number.isInteger(year) && year > 0 ? year : null;
}

function findHeaderRowIndex(json: any[][]): number {
  for (let i = 0; i < Math.min(json.length, 10); i++) {
    const row = json[i];
    if (!row) continue;
    const rowText = row.map(cell => String(cell ?? '').toLowerCase().trim()).join(' ');
    if (rowText.includes('penjual') && rowText.includes('pembeli')) {
      return i;
    }
  }
  return 1;
}

function buildNormalizedColIndex(headerRow: any[]): Record<string, number> {
  const colIndex: Record<string, number> = {};
  headerRow.forEach((col: any, index: number) => {
    if (col && typeof col === 'string') {
      const key = col.trim().toLowerCase();
      if (!(key in colIndex)) {
        colIndex[key] = index;
      }
    }
  });
  return colIndex;
}

function getColumnValue(row: any[], colIndexMap: Record<string, number>, possibleKeys: string[]): any {
  for (const key of possibleKeys) {
    const normalizedKey = key.toLowerCase().trim();
    if (normalizedKey in colIndexMap) {
      return row[colIndexMap[normalizedKey]];
    }
  }
  return undefined;
}

function extractRows(sheet: xlsx.WorkSheet, headerMap: Record<string, string>, defaultStartRow: number = 1): RawTransactionRow[] {
  const json: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  if (json.length <= 1) return [];

  const startRow = findHeaderRowIndex(json);
  const headerRow = json[startRow];
  if (!headerRow) return [];
  
  const colIndex = buildNormalizedColIndex(headerRow);
  const rows: RawTransactionRow[] = [];
  
  for (let i = startRow + 1; i < json.length; i++) {
    const row = json[i];
    if (!row || row.length === 0) continue;

    const seller = getColumnValue(row, colIndex, [headerMap.seller, 'penjual']);
    const buyer = getColumnValue(row, colIndex, [headerMap.buyer, 'pembeli']);
    
    // Skip empty essential rows
    if (!seller || !buyer) continue;

    const sellerNpwp = String(getColumnValue(row, colIndex, [headerMap.sellerNpwp, 'npwp penjual']) || '').trim();
    const buyerNpwp = String(getColumnValue(row, colIndex, [headerMap.buyerNpwp, 'npwp pembeli']) || '').trim();
    const invoice = String(getColumnValue(row, colIndex, [headerMap.invoice, 'no. faktur / dokumen', 'no. faktur', 'faktur']) || '');
    const dpp = parseNumber(getColumnValue(row, colIndex, [headerMap.dpp, 'dpp']));
    const ppn = parseNumber(getColumnValue(row, colIndex, [headerMap.ppn, 'ppn']));
    const approval = String(getColumnValue(row, colIndex, [headerMap.approval, 'stat approval', 'stat. approval', 'status approval', 'approval']) || 'Unknown');
    const statusVal = String(getColumnValue(row, colIndex, [headerMap.status, 'status']) || 'Normal').trim();
    const masa = String(getColumnValue(row, colIndex, [headerMap.masa, 'masa']) || '');
    const tahun = String(getColumnValue(row, colIndex, [headerMap.tahun, 'tahun']) || '');
    const month = parseMonth(masa);
    const year = parseYear(tahun);
    
    const isImport = isNpwpEmptyOrImport(sellerNpwp) || isNpwpEmptyOrImport(buyerNpwp);

    rows.push({
      sellerName: String(seller).trim(),
      buyerName: String(buyer).trim(),
      sellerNpwp,
      buyerNpwp,
      invoiceNumber: invoice.trim(),
      dpp,
      ppn,
      approvalStatus: approval.trim(),
      status: statusVal,
      period: `${masa} / ${tahun}`.trim(),
      month,
      year,
      isImport
    });
  }

  return rows;
}

export function parseDataPerusahaanSheet(sheet: xlsx.WorkSheet): { companies: string[]; companyMaster: InternalCompanyMaster[] } {
  const json: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  if (json.length <= 0) return { companies: [], companyMaster: [] };
  
  const headerRow = json[0];
  let compIdx = -1;
  let abbrIdx = -1;
  let groupIdx = -1;

  headerRow.forEach((col: any, index: number) => {
    if (col && typeof col === 'string') {
      const key = col.trim();
      if (key === COLUMN_MAPS.DATA_PERUSAHAAN.company) compIdx = index;
      if (key === COLUMN_MAPS.DATA_PERUSAHAAN.abbreviation) abbrIdx = index;
      if (key === COLUMN_MAPS.DATA_PERUSAHAAN.group) groupIdx = index;
    }
  });

  if (compIdx === -1) return { companies: [], companyMaster: [] };

  const companies: string[] = [];
  const companyMaster: InternalCompanyMaster[] = [];

  for (let i = 1; i < json.length; i++) {
    const row = json[i];
    if (row && row[compIdx]) {
      const fullName = String(row[compIdx]).trim();
      const abbreviation = abbrIdx !== -1 && row[abbrIdx] ? String(row[abbrIdx]).trim() : fullName;
      const group = groupIdx !== -1 && row[groupIdx] ? String(row[groupIdx]).trim() : '';

      if (fullName) {
        companies.push(fullName);
        if (abbreviation && abbreviation !== fullName) {
          companies.push(abbreviation);
        }
        companyMaster.push({
          fullName,
          abbreviation,
          group
        });
      }
    }
  }

  return { companies, companyMaster };
}

export function parseWorkbook(buffer: ArrayBuffer): ParsedWorkbook {
  const workbook = xlsx.read(buffer, { type: 'array' });
  
  // Find sheets (case-insensitive & search for Data Perusahaan / Display)
  let dpSheetName = '';
  workbook.SheetNames.forEach(name => {
    const lower = name.toLowerCase();
    if (lower.includes('perusahaan') || lower.includes('display')) {
      dpSheetName = name;
    }
  });

  const dpResult = dpSheetName && workbook.Sheets[dpSheetName] 
    ? parseDataPerusahaanSheet(workbook.Sheets[dpSheetName]) 
    : { companies: [], companyMaster: [] };

  return {
    fm: workbook.Sheets['FM'] ? extractRows(workbook.Sheets['FM'], COLUMN_MAPS.FM, 1) : [],
    fk: workbook.Sheets['FK'] ? extractRows(workbook.Sheets['FK'], COLUMN_MAPS.FK, 1) : [],
    fmCrtx: workbook.Sheets['FM_CRTX'] ? extractRows(workbook.Sheets['FM_CRTX'], COLUMN_MAPS.FM_CRTX, 1) : [],
    fkCrtx: workbook.Sheets['FK_CRTX'] ? extractRows(workbook.Sheets['FK_CRTX'], COLUMN_MAPS.FK_CRTX, 1) : [],
    dataPerusahaan: dpResult.companies,
    companyMaster: dpResult.companyMaster
  };
}
