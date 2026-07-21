import { parseWorkbook } from './index';
import { ParsedWorkbook } from './types';
import excelUrl from '@/assets/data/Sales Connection.xlsx?url';

export async function loadExcelData(): Promise<ParsedWorkbook> {
  try {
    const response = await fetch(excelUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Excel file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return parseWorkbook(arrayBuffer);
  } catch (error) {
    console.error("Error loading Excel data:", error);
    throw error;
  }
}
