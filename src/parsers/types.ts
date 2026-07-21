export interface RawTransactionRow {
  sellerName: string;
  buyerName: string;
  invoiceNumber: string;
  dpp: number;
  ppn: number;
  approvalStatus: string;
  period: string; // Masa / Tahun
}

export type ParsedWorkbook = {
  fm: RawTransactionRow[];
  fk: RawTransactionRow[];
  fmCrtx: RawTransactionRow[];
  fkCrtx: RawTransactionRow[];
  dataPerusahaan: string[]; // List of internal company names
};
