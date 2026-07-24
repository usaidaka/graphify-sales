# Delta Spec: Excel Parser

## Delta Requirements

### ADDED Requirements

- `excel-parser` SHALL parse invoice `Status` (`Normal`, `Normal-Pengganti`, `Diganti`, `Batal`) from worksheets.
- `excel-parser` SHALL parse `NPWP Pembeli` and `NPWP Penjual` fields and evaluate if a transaction is an `import` transaction.
- `excel-parser` SHALL parse company abbreviation (`Int. Pr`) from the `Data Perusahaan` worksheet.
