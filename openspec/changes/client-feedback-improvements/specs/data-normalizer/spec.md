# Delta Spec: Data Normalizer

## Delta Requirements

### ADDED Requirements

- `data-normalizer` SHALL resolve company names using the `Int. Pr` abbreviation from `Data Perusahaan` sheet as canonical node IDs and display names.
- `data-normalizer` SHALL merge transaction rows featuring full company names and short names into the single canonical abbreviation node.
- `data-normalizer` SHALL classify both `PT Software Farmer Indonesia` (or `PT SFI`) AND `CV / PT Berkah Cahaya Abadi` (or `PT BCA`) as `special-external` node types.
- `data-normalizer` SHALL tag transaction rows with NPWP values of `'-'`, `'0'`, or empty strings as `isImport = true`.
- `data-normalizer` SHALL partition transaction rows by invoice status into two universes: `active` (`Normal`, `Normal-Pengganti`) and `cancelled-replaced` (`Diganti`, `Batal`).

### MODIFIED Requirements

- `data-normalizer` SHALL filter nodes and edges based on active UI `scopeFilter` (`with-external` vs `internal-only`) and `universeMode` (`active` vs `cancelled-replaced`).
