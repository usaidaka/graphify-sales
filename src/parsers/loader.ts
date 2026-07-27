import { parseWorkbook } from './index';
import { ParsedWorkbook } from './types';

const DEFAULT_SHEET_ID = '1hvuBOeExzVvQn59dUuHKVA2HtFl5riT4-p8g2csT664';
export const GOOGLE_SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
export const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';
export const GOOGLE_SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_URL || `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=xlsx`;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleaned = base64.replace(/^"|"$/g, '').trim();
  const binaryString = window.atob(cleaned);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function isXlsxBuffer(buffer: ArrayBuffer): boolean {
  const arr = new Uint8Array(buffer);
  return arr.length > 4 && arr[0] === 0x50 && arr[1] === 0x4B;
}

export async function loadExcelData(): Promise<ParsedWorkbook> {
  // 1. Ambil dari Google Apps Script Web App jika VITE_GOOGLE_SCRIPT_URL terdefinisi
  if (GOOGLE_SCRIPT_URL) {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL);
      if (!response.ok) {
        throw new Error(`Gagal menghubungi Google Apps Script Web App (${response.status} ${response.statusText})`);
      }
      const text = await response.text();
      if (text.startsWith('<') || text.includes('<!DOCTYPE') || text.includes('Sign in')) {
        throw new Error('Akses Google Apps Script ditolak: Pastikan pengaturan "Who has access" pada Web App diset ke "Anyone".');
      }
      const arrayBuffer = base64ToArrayBuffer(text);
      if (!isXlsxBuffer(arrayBuffer)) {
        throw new Error('Data dari Google Apps Script berupa halaman login/otorisasi, bukan file Excel. Mohon update kode Google Apps Script dan lakukan re-authorization.');
      }
      return parseWorkbook(arrayBuffer);
    } catch (error: any) {
      console.error("Gagal mengambil data dari Apps Script Web App:", error);
      throw new Error(`Gagal memuat data dari Google Spreadsheet: ${error.message || error}`);
    }
  }

  // 2. Mengambil via Direct Export Link jika VITE_GOOGLE_SCRIPT_URL kosong
  try {
    const response = await fetch(GOOGLE_SHEET_URL);
    if (!response.ok) {
      throw new Error(`Gagal mengunduh Google Spreadsheet (${response.status} ${response.statusText})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    if (!isXlsxBuffer(arrayBuffer)) {
      throw new Error('Data yang diunduh dari Google Spreadsheet bukan file Excel valid. Pastikan izin spreadsheet diset ke "Anyone with the link can view".');
    }
    return parseWorkbook(arrayBuffer);
  } catch (error: any) {
    console.error("Gagal mengambil data dari Google Spreadsheet Direct Link:", error);
    throw new Error(`Gagal memuat data dari Google Spreadsheet: ${error.message || error}`);
  }
}



