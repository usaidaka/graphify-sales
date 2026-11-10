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

/** NPWP lama menyimpan tiga digit kode KPP sebelum tiga digit cabang. */
export function extractKppLabel(npwp: string): string {
  const normalized = String(npwp ?? '').trim();
  const formattedMatch = normalized.match(/-(\d{3})\.\d{3}$/);
  if (formattedMatch) return `KPP ${formattedMatch[1]}`;

  const digits = normalized.replace(/\D/g, '');
  return digits.length === 15 ? `KPP ${digits.slice(9, 12)}` : '';
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

function normalizedHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function findCompanyMasterHeaderRowIndex(json: any[][]): number {
  const requiredHeaders = [
    COLUMN_MAPS.DATA_PERUSAHAAN.company,
    COLUMN_MAPS.DATA_PERUSAHAAN.abbreviation,
    COLUMN_MAPS.DATA_PERUSAHAAN.group,
  ].map(normalizedHeader);

  for (let index = 0; index < Math.min(json.length, 20); index += 1) {
    const headers = new Set((json[index] ?? []).map(normalizedHeader));
    if (requiredHeaders.every((header) => headers.has(header))) return index;
  }
  return -1;
}

function readLeadingRows(sheet: xlsx.WorkSheet, maximumRows = 20): any[][] {
  const reference = sheet['!ref'];
  if (!reference) return [];
  const range = xlsx.utils.decode_range(reference);
  range.e.r = Math.min(range.e.r, range.s.r + maximumRows - 1);
  return xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    range: xlsx.utils.encode_range(range),
  });
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

function extractRows(sheet: xlsx.WorkSheet, headerMap: Record<string, string>): RawTransactionRow[] {
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
    const sellerDirector = String(getColumnValue(row, colIndex, [
      headerMap.sellerDirector,
      'penjual (dir)',
      'penandatangan (dir)',
    ].filter(Boolean)) || '').trim();
    const buyerDirector = String(getColumnValue(row, colIndex, [
      headerMap.buyerDirector,
      'pembeli (dir)',
      'pembeli ttd.',
    ].filter(Boolean)) || '').trim();
    const sellerKpp = String(getColumnValue(row, colIndex, ['kpp penjual']) || '').trim()
      || extractKppLabel(sellerNpwp);
    const buyerKpp = String(getColumnValue(row, colIndex, ['kpp pembeli']) || '').trim()
      || extractKppLabel(buyerNpwp);
    
    const sellerIsImport = isNpwpEmptyOrImport(sellerNpwp);
    const buyerIsImport = isNpwpEmptyOrImport(buyerNpwp);
    const isImport = sellerIsImport || buyerIsImport;

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
      isImport,
      sellerIsImport,
      buyerIsImport,
      sellerDirector,
      buyerDirector,
      sellerKpp,
      buyerKpp,
    });
  }

  return rows;
}

export function parseDataPerusahaanSheet(sheet: xlsx.WorkSheet): { companies: string[]; companyMaster: InternalCompanyMaster[] } {
  const json: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  if (json.length <= 0) return { companies: [], companyMaster: [] };

  const headerRowIndex = findCompanyMasterHeaderRowIndex(json);
  if (headerRowIndex === -1) return { companies: [], companyMaster: [] };
  const headerRow = json[headerRowIndex];
  let compIdx = -1;
  let abbrIdx = -1;
  let groupIdx = -1;

  headerRow.forEach((col: any, index: number) => {
    if (col && typeof col === 'string') {
      const key = normalizedHeader(col);
      if (key === normalizedHeader(COLUMN_MAPS.DATA_PERUSAHAAN.company)) compIdx = index;
      if (key === normalizedHeader(COLUMN_MAPS.DATA_PERUSAHAAN.abbreviation)) abbrIdx = index;
      if (key === normalizedHeader(COLUMN_MAPS.DATA_PERUSAHAAN.group)) groupIdx = index;
    }
  });

  if (compIdx === -1) return { companies: [], companyMaster: [] };

  const companies: string[] = [];
  const companyMaster: InternalCompanyMaster[] = [];

  for (let i = headerRowIndex + 1; i < json.length; i++) {
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

function findCompanyMasterSheet(workbook: xlsx.WorkBook): string | null {
  const candidates = workbook.SheetNames.flatMap((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return [];
    const rows = readLeadingRows(sheet);
    if (findCompanyMasterHeaderRowIndex(rows) === -1) return [];

    const normalizedName = normalizedHeader(name);
    const priority = normalizedName === 'scdb'
      ? 0
      : normalizedName === 'data perusahaan'
        ? 1
        : normalizedName.includes('perusahaan')
          ? 2
          : 3;
    return [{ name, priority }];
  });

  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0]?.name ?? null;
}

export function parseWorkbook(buffer: ArrayBuffer): ParsedWorkbook {
  const workbook = xlsx.read(buffer, { type: 'array' });

  const companyMasterSheetName = findCompanyMasterSheet(workbook);
  const companyMasterSheet = companyMasterSheetName
    ? workbook.Sheets[companyMasterSheetName]
    : undefined;
  const dpResult = companyMasterSheet
    ? parseDataPerusahaanSheet(companyMasterSheet)
    : { companies: [], companyMaster: [] };
  if (dpResult.companyMaster.length === 0) {
    throw new Error(
      'Master perusahaan internal tidak ditemukan. Pastikan workbook memiliki sheet '
      + 'dengan kolom Perusahaan, Int. Pr, dan Grup (misalnya SCDB).'
    );
  }

  return {
    fm: workbook.Sheets['FM'] ? extractRows(workbook.Sheets['FM'], COLUMN_MAPS.FM) : [],
    fk: workbook.Sheets['FK'] ? extractRows(workbook.Sheets['FK'], COLUMN_MAPS.FK) : [],
    fmCrtx: workbook.Sheets['FM_CRTX'] ? extractRows(workbook.Sheets['FM_CRTX'], COLUMN_MAPS.FM_CRTX) : [],
    fkCrtx: workbook.Sheets['FK_CRTX'] ? extractRows(workbook.Sheets['FK_CRTX'], COLUMN_MAPS.FK_CRTX) : [],
    dataPerusahaan: dpResult.companies,
    companyMaster: dpResult.companyMaster
  };
}
