import { describe, expect, it } from 'vitest';
import * as xlsx from 'xlsx';
import { normalize } from '../graph/normalizer';
import { extractKppLabel, parseWorkbook } from './index';

function workbookBuffer(
  sheets: Array<{ name: string; rows: unknown[][] }>
): ArrayBuffer {
  const workbook = xlsx.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), name);
  });
  return xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

describe('extractKppLabel', () => {
  it('reads the KPP code from formatted and compact legacy NPWP values', () => {
    expect(extractKppLabel('62.141.374.9-412.000')).toBe('KPP 412');
    expect(extractKppLabel('621413749412000')).toBe('KPP 412');
  });

  it('does not invent a KPP code for the 16 digit NPWP format', () => {
    expect(extractKppLabel('0951682582061000')).toBe('');
  });
});

describe('parseWorkbook company master discovery', () => {
  it('uses SCDB instead of an unrelated Display sheet', () => {
    const parsed = parseWorkbook(workbookBuffer([
      {
        name: 'Display',
        rows: [
          ['Dashboard transaksi'],
          ['Penjual', 'Pembeli', 'Tahun'],
          ['PT A', 'PT B', 2026],
        ],
      },
      {
        name: 'SCDB',
        rows: [
          ['Master perusahaan internal'],
          ['No.', 'Perusahaan', 'Int. Pr', 'Grup'],
          [1, 'PT Internal Satu', 'PT IS', 'A'],
          [2, 'CV Internal Dua', 'CV ID', 'B'],
        ],
      },
    ]));

    expect(parsed.companyMaster).toEqual([
      { fullName: 'PT Internal Satu', abbreviation: 'PT IS', group: 'A' },
      { fullName: 'CV Internal Dua', abbreviation: 'CV ID', group: 'B' },
    ]);
    expect(parsed.dataPerusahaan).toEqual([
      'PT Internal Satu', 'PT IS', 'CV Internal Dua', 'CV ID',
    ]);
  });

  it('discovers a renamed master sheet from its headers', () => {
    const parsed = parseWorkbook(workbookBuffer([{
      name: 'MASTER BARU',
      rows: [
        ['perusahaan', 'int. pr', 'grup'],
        ['PT Internal', 'PT INT', 'Internal'],
      ],
    }]));

    expect(parsed.companyMaster).toHaveLength(1);
    expect(parsed.companyMaster[0].abbreviation).toBe('PT INT');
  });

  it('fails clearly when the internal company master is missing', () => {
    const buffer = workbookBuffer([{
      name: 'Display',
      rows: [['Penjual', 'Pembeli'], ['PT A', 'PT B']],
    }]);

    expect(() => parseWorkbook(buffer)).toThrow(
      /Master perusahaan internal tidak ditemukan/
    );
  });

  it('feeds SCDB membership into graph node classification', () => {
    const parsed = parseWorkbook(workbookBuffer([
      {
        name: 'SCDB',
        rows: [
          ['No.', 'Perusahaan', 'Int. Pr', 'Grup'],
          [1, 'PT Internal Satu', 'PT IS', 'A'],
        ],
      },
      {
        name: 'FM',
        rows: [
          ['Laporan transaksi'],
          [
            'Penjual', 'Pembeli', 'NPWP Penjual', 'NPWP Pembeli',
            'No. Faktur / Dokumen', 'DPP', 'PPN', 'Status Approval',
            'Status', 'Masa', 'Tahun',
          ],
          [
            'PT Software Farmer Indonesia', 'PT Internal Satu',
            '01.000.000.0-001.000', '02.000.000.0-002.000',
            'INV-1', 100, 11, 'Approved', 'Normal', 1, 2026,
          ],
        ],
      },
    ]));

    const graph = normalize(parsed, 'active', 'with-external', 2026, 2026);
    const internal = graph.nodes.find(({ companyName }) => companyName === 'PT IS');

    expect(internal?.nodeType).toBe('internal');
    expect(graph.edges).toHaveLength(1);
  });
});
