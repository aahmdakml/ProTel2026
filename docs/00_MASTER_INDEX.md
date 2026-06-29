# 📚 ProTel Smart AWD — Master Documentation Index
> **Terakhir diperbarui:** 29 Juni 2026 | **Versi Sistem:** 1.0 Production-Ready

Dokumen ini adalah pintu masuk ke seluruh dokumentasi teknis ProTel. Setiap file direferensikan dengan path relatif dari folder `/docs/`.

---

## 📂 Struktur Dokumentasi

```
docs/
├── 00_MASTER_INDEX.md                ← (ini) Navigasi utama
│
├── protel_smart_awd_technical_documentation.md   ← Ikhtisar sistem tingkat tinggi
│
├── logic/                            ← Dokumentasi logika & algoritma inti
│   ├── dss_logic_flow.md             ← Alur keputusan DSS AWD (Mermaid Flowchart)
│   ├── smart_awd_resilience_logic.md ← 5 mekanisme pertahanan DSS
│   ├── mod_sys_architecture_c4.md    ← Arsitektur sistem C4 (diagram)
│   ├── mod_be_scheduler_state.md     ← Cron jobs & state builder
│   ├── mod_be_telemetry_ingestion.md ← Pipeline MQTT → DB
│   ├── mod_be_node_resolver.md       ← 4-level fallback resolver
│   ├── mod_be_routing_orchestrator.md← Floyd-Warshall orchestration
│   ├── mod_model_dss_engine.md       ← Python DSS engine detail
│   ├── mod_model_titiler_cog.md      ← TiTiler COG tile server
│   ├── mod_fe_openlayers_map.md      ← FrontEnd map module
│   ├── mod_fe_state_manager.md       ← FrontEnd state management
│   ├── mod_gis_apsp_algorithm.md     ← APSP (Floyd-Warshall) GIS
│   ├── mod_gis_arq_worker.md         ← ARQ Redis async worker
│   └── mod_pipeline_webodm.md        ← WebODM drone pipeline
│
├── per_folders/                      ← Dokumentasi per-komponen
│   ├── doc_backend.md                ← BE: Node.js Express API
│   ├── doc_frontend.md               ← FE: React + OpenLayers
│   ├── doc_model_dss.md              ← Model: Python DSS + TiTiler
│   ├── doc_database.md               ← Database schema & ERD
│   ├── doc_gis_processing.md         ← GIS Processing service
│   ├── doc_arq_worker.md             ← ARQ background worker
│   └── doc_webodm_cloud.md           ← WebODM & Cloudflare R2
│
├── more/                             ← Referensi teknis detail
│   ├── doc_api_reference.md          ← API Endpoints & kontrak data
│   ├── doc_database_erd.md           ← ERD lengkap dengan relasi
│   ├── doc_deployment_setup.md       ← Panduan setup & deployment
│   └── doc_firmware_iot.md           ← Firmware RiceMesh IoT
│
└── progres akmal/                    ← Changelog & progress notes
    ├── update_dan_perubahan.md       ← Rekap semua perubahan & update
    ├── weather_forecast_dss.md       ← BMKG Rain Event Detection
    └── laporan_pekerjaan_hari_ini.md ← Daily progress log
```

---

## 🚀 Quick Start — Baca Ini Dulu

| Kalau Anda adalah... | Mulai dari sini |
|---|---|
| Developer baru | [Ikhtisar Sistem](protel_smart_awd_technical_documentation.md) → [Arsitektur C4](logic/mod_sys_architecture_c4.md) → [Setup Deployment](more/doc_deployment_setup.md) |
| Backend Dev | [doc_backend.md](per_folders/doc_backend.md) → [Scheduler & State](logic/mod_be_scheduler_state.md) → [API Reference](more/doc_api_reference.md) |
| Frontend Dev | [doc_frontend.md](per_folders/doc_frontend.md) → [OpenLayers Map](logic/mod_fe_openlayers_map.md) |
| ML / DSS Engineer | [DSS Logic Flow](logic/dss_logic_flow.md) → [Resilience Logic](logic/smart_awd_resilience_logic.md) → [DSS Engine](per_folders/doc_model_dss.md) |
| IoT / Firmware Engineer | [Firmware IoT](more/doc_firmware_iot.md) → [Telemetry Ingestion](logic/mod_be_telemetry_ingestion.md) |
| Database / Infra | [Database Schema](per_folders/doc_database.md) → [ERD Diagram](more/doc_database_erd.md) |

---

## ⚡ Status Sistem (per 29 Juni 2026)

| Komponen | Status | Catatan |
|---|---|---|
| BackEnd Node.js | ✅ Production-Ready | Express + Drizzle ORM, 15 modul aktif |
| Python DSS Engine | ✅ Production-Ready | 100% pass fuzz test (640 skenario) |
| FrontEnd React | 🔧 Active Development | DSS visual sedang disempurnakan |
| Firmware RiceMesh | ⚠️ Known Bugs | Prescaler TIM1 perlu diperbaiki |
| GIS Processing | ✅ Siap | Floyd-Warshall via ARQ/Redis |
| BMKG Integration | ✅ Production-Ready | Rain Event Detection + 12-jam window |
| Database Migrations | ✅ 15 migrasi aktif | Embankments & routing enrichment terbaru |
