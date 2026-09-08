import { describe, expect, it } from 'vitest'

import type { ParsedWorkbook, RawTransactionRow } from '../parsers/types'
import { normalize } from './normalizer'

function transaction(sellerName: string, buyerName: string, year: number): RawTransactionRow {
  return {
    sellerName,
    buyerName,
    sellerNpwp: '',
    buyerNpwp: '',
    invoiceNumber: '',
    dpp: 100,
    ppn: 11,
    approvalStatus: 'Approved',
    status: 'Normal',
    period: `1 / ${year}`,
    month: 1,
    year,
    isImport: false,
  }
}

function workbook(rows: RawTransactionRow[]): ParsedWorkbook {
  return {
    fm: [],
    fk: rows,
    fmCrtx: [],
    fkCrtx: [],
    dataPerusahaan: [
      'PT MSP',
      'CV SUNDALAYA ARJUNA PERMAI',
      'CV SAP',
    ],
    companyMaster: [
      {
        fullName: 'CV SUNDALAYA ARJUNA PERMAI',
        abbreviation: 'CV SAP',
        group: '',
      },
    ],
  }
}

describe('normalize company identities', () => {
  it('keeps an unlisted company external when its initials match a master abbreviation', () => {
    const parsed = workbook([
      transaction('PT MSP', 'CV SOLUSI ARYA PRIMA', 2020),
    ])

    const withExternal = normalize(parsed, 'active', 'with-external', 2020, 2020)
    const solusiAryaPrima = withExternal.nodes.find(
      ({ fullName }) => fullName === 'CV SOLUSI ARYA PRIMA',
    )

    expect(solusiAryaPrima?.id).toBe('cv solusi arya prima')
    expect(solusiAryaPrima?.nodeType).toBe('external')
    expect(withExternal.nodes.some(({ id }) => id === 'cv sap')).toBe(false)

    const internalOnly = normalize(parsed, 'active', 'internal-only', 2020, 2020)
    expect(internalOnly.nodes.some(({ id }) => id === 'cv sap')).toBe(false)
    expect(internalOnly.edges).toHaveLength(0)
  })

  it('still resolves the listed SAP company to its master abbreviation', () => {
    const parsed = workbook([
      transaction('PT MSP', 'CV SUNDALAYA ARJUNA PERMAI', 2023),
    ])

    const graph = normalize(parsed, 'active', 'internal-only', 2023, 2023)
    const sap = graph.nodes.find(({ id }) => id === 'cv sap')

    expect(sap?.fullName).toBe('CV SUNDALAYA ARJUNA PERMAI')
    expect(sap?.nodeType).toBe('internal')
  })

  it('marks only the import endpoint of a transaction', () => {
    const importRow = transaction('GLOBAL SUPPLIER', 'PT MSP', 2024)
    importRow.sellerIsImport = true
    importRow.buyerIsImport = false
    importRow.isImport = true

    const graph = normalize(workbook([importRow]), 'active', 'with-external', 2024, 2024)
    const supplier = graph.nodes.find(({ id }) => id === graph.edges[0]?.source)
    const buyer = graph.nodes.find(({ id }) => id === 'pt msp')

    expect(supplier?.isImport).toBe(true)
    expect(buyer?.isImport).toBeUndefined()
  })
})
