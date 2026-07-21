# Product Requirements Document (PRD)

# Sales Connection Explorer (MVP)

Version: 3.0 (Frontend-Only MVP)

## 1. Product Overview

### Vision

Sales Connection Explorer adalah aplikasi React yang memvisualisasikan
hubungan transaksi antar perusahaan menggunakan satu sumber data statis
yaitu **Sales Connection.xlsx**.

Aplikasi ini **bukan** ERP, **bukan** CRUD, dan **bukan** sistem
operasional. Seluruh data bersifat read-only, diproses di frontend,
kemudian divisualisasikan menjadi interactive network graph untuk
analisis hubungan bisnis dan supply chain.

## 2. MVP Scope

-   Data source tunggal: Sales Connection.xlsx
-   Parsing Excel di frontend
-   Tidak menggunakan backend
-   Tidak menggunakan database
-   Tidak menggunakan REST API
-   Tidak ada login
-   Tidak ada upload dataset
-   Tidak ada CRUD

Tujuan MVP adalah memvalidasi UX dan efektivitas visualisasi graph.

## 3. Business Goals

-   Visualisasi hubungan Penjual → Pembeli
-   Analisis supply chain
-   Identifikasi supplier & customer
-   Menemukan distributor utama
-   Eksplorasi hubungan perusahaan secara visual

## 4. Data Source

Workbook: - FM - FK - FM_CRTX - FK_CRTX - Data Perusahaan

Business Rules: - Data Perusahaan = master perusahaan internal - PT
Software Farmer Indonesia = Distributor - CV Berkah Cahaya Abadi =
Special External

## 5. Flow

Sales Connection.xlsx → React → Excel Parser → Normalization → Graph
Builder → Interactive Graph

## 6. Technology

-   ReactJS
-   TypeScript
-   Cytoscape.js
-   xlsx

## 7. Features

-   Network Explorer
-   Focus Mode
-   Layer Manager
-   Company Explorer
-   Relationship Detail
-   Company Detail
-   Statistics
-   Legend

## 8. Graph

Node: - Internal - External - Distributor - Special External

Edge: - Seller → Buyer - Smart Merge duplicate relationship - Invoice
Count - DPP - PPN - Approval - Dataset Source

## 9. Layer Manager

Support: - FM - FK - FM_CRTX - FK_CRTX

Setiap layer dapat diaktifkan/dinonaktifkan secara independen.

## 10. Focus Mode

Saat node dipilih: - Auto center - Auto zoom - Blur background - Fade
node lain - Highlight chain - Company Detail Panel

## 11. Company Explorer

Search company → Focus Mode → Detail Panel.

## 12. Relationship Detail

Klik edge: - Seller - Buyer - Invoice Count - DPP - PPN - Approval -
Dataset - Period

## 13. Statistics

-   Total Company
-   Internal
-   External
-   Distributor
-   Relationship Count
-   Top Supplier
-   Top Customer
-   Most Connected Company

## 14. Business Rules

1.  Semua data berasal dari Sales Connection.xlsx.
2.  Read-only.
3.  Penjual → Pembeli.
4.  Smart Merge duplicate edge.
5.  Layer independen.
6.  Data Perusahaan = internal master.

## 15. Suggested Project Structure

``` text
src/
 ├── assets/data/
 ├── parsers/
 ├── graph/
 ├── components/
 ├── hooks/
 ├── pages/
 └── utils/
```

## 16. Future Roadmap

Phase 1: - Static Excel - Frontend Only

Phase 2: - Upload Excel - Dataset Management

Phase 3: - Backend - Database - API

## 17. Success Criteria

-   Hubungan perusahaan mudah dipahami melalui graph.
-   Supply chain dapat dieksplorasi tanpa membaca tabel Excel.
-   Focus Mode dan Layer Manager menjadi fitur utama MVP.
