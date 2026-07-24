export interface RawTransactionRow {
  sellerName: string;
  buyerName: string;
  sellerNpwp: string;
  buyerNpwp: string;
  invoiceNumber: string;
  dpp: number;
  ppn: number;
  approvalStatus: string;
  status: string; // Normal, Normal-Pengganti, Diganti, Batal
  period: string; // Masa / Tahun
  month: number | null;
  year: number | null;
  isImport: boolean;
}

export interface InternalCompanyMaster {
  fullName: string;
  abbreviation: string;
  group: string;
}

export type ParsedWorkbook = {
  fm: RawTransactionRow[];
  fk: RawTransactionRow[];
  fmCrtx: RawTransactionRow[];
  fkCrtx: RawTransactionRow[];
  dataPerusahaan: string[]; // List of internal company names
  companyMaster: InternalCompanyMaster[]; // Full company mapping with Int. Pr abbreviation
};

