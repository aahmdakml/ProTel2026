# ⚙️ Dokumentasi Teknis: BackEnd (Node.js API Server)
> **Update:** 29 Juni 2026 — Disesuaikan dengan source code aktual v1.0

## 1. Ikhtisar (Overview)

**BackEnd** (`d:\PROTEL\src\BackEnd`) adalah *pusat saraf* sistem Smart AWD. Ini adalah Express API server berbasis TypeScript yang bertindak sebagai **Orchestrator** — mengorkestrasi aliran data antara sensor IoT, database, Python DSS engine, dan FrontEnd.

**Stack:** Node.js 20 · Express · TypeScript · Drizzle ORM · Zod Validation · Pino Logger

---

## 2. Struktur Direktori Lengkap

```text
BackEnd/
├── database/
│   └── migrations/          ← 26 file SQL migration (Drizzle-generated)
├── src/
│   ├── app.ts               ← Inisialisasi Express, registrasi semua router
│   ├── server.ts            ← Entry point HTTP server (port 3000)
│   ├── config/
│   │   └── index.ts         ← Parsing & validasi semua env variables
│   ├── db/
│   │   ├── client.ts        ← Koneksi pool pg (drizzle + native pg)
│   │   ├── geometry.ts      ← Custom PostGIS geometry types untuk Drizzle
│   │   └── schema/
│   │       ├── mst.ts       ← Schema master: users, fields, sub_blocks,
│   │       │                   embankments, devices, calibrations,
│   │       │                   crop_cycles, rule_profiles, map_layers,
│   │       │                   flow_paths, irrigation_points, system_settings
│   │       ├── trx.ts       ← Schema transaksi: telemetry_records,
│   │       │                   sub_block_states, sub_block_current_states,
│   │       │                   irrigation_recommendations, alerts,
│   │       │                   management_events, weather_forecast_snapshots
│   │       └── index.ts     ← Re-export semua schema
│   ├── middleware/
│   │   ├── auth.middleware.ts    ← JWT verify, inject req.user
│   │   ├── rbac.middleware.ts    ← requireFieldAccess(), requireSystemRole()
│   │   ├── validate.middleware.ts← Zod schema validation wrapper
│   │   └── error.middleware.ts   ← Global error handler (AppError class)
│   ├── modules/             ← 15 modul bisnis
│   │   ├── health/
│   │   ├── auth/
│   │   ├── master-data/     ← Fields, Sub-blocks, Devices, Embankments,
│   │   │                       Flow Paths, Crop Cycles, Rule Profiles,
│   │   │                       Irrigation Points
│   │   ├── telemetry/
│   │   │   ├── ingest.router.ts  ← POST /ingest/batch
│   │   │   └── query.router.ts   ← GET /telemetry/sub-blocks/:id/history
│   │   ├── recommendations/
│   │   │   ├── recommendations.router.ts
│   │   │   └── assignments.router.ts ← NEW: task management operator
│   │   ├── agronomic-treatments/    ← NEW: log intervensi manual
│   │   ├── decision-engine/
│   │   │   ├── engine-client.service.ts ← HTTP POST ke Python DSS
│   │   │   ├── node-resolver.ts         ← 4-level fallback water level
│   │   │   └── routing.service.ts       ← Floyd-Warshall orchestration
│   │   ├── scheduler/
│   │   │   ├── scheduler.service.ts     ← node-cron job registry
│   │   │   └── jobs/
│   │   │       ├── state-builder.job.ts  ← */10 * * * *
│   │   │       ├── stale-flag.job.ts     ← */15 * * * *
│   │   │       ├── decision-cycle.job.ts ← */30 * * * *
│   │   │       ├── bmkg-sync.job.ts      ← */180 * * * * (3 jam)
│   │   │       └── hst-updater.job.ts    ← Hitung HST harian
│   │   ├── state-builder/
│   │   │   ├── state-builder.service.ts  ← Orkestrasi state building
│   │   │   └── estimator.ts              ← K-NN neighbor interpolation
│   │   ├── weather/
│   │   │   ├── bmkg.service.ts           ← Fetch & parse BMKG API
│   │   │   └── bmkg.types.ts             ← Types: WeatherSlot, RainEvent
│   │   ├── dashboard/
│   │   ├── map-visual/
│   │   ├── orthomosaic/
│   │   ├── archive/
│   │   └── system-settings/
│   ├── scripts/             ← CLI scripts database management
│   │   ├── migrate.ts       ← Jalankan pending SQL migrations
│   │   ├── reset.ts         ← DEV: drop & recreate semua tabel
│   │   ├── seed.ts          ← Seed data referensi wajib (idempotent)
│   │   ├── seed-dev.ts      ← Seed dummy data development
│   │   └── seed-admin.ts    ← Buat user system_admin pertama
│   └── shared/
│       ├── types/index.ts   ← Shared TypeScript types
│       └── utils/
│           ├── logger.util.ts     ← Pino structured logger
│           ├── response.util.ts   ← successResponse() helper
│           ├── pagination.util.ts ← parsePagination() + buildPaginationMeta()
│           ├── crypto.util.ts     ← bcrypt hashing utils
│           └── time.util.ts       ← Time formatting utilities
└── package.json
```

---

## 3. Environment Variables Wajib

| Variable | Wajib | Default | Keterangan |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string (Supabase) |
| `JWT_SECRET` | ✅ | — | Min. 32 karakter |
| `PORT` | | `3000` | HTTP server port |
| `NODE_ENV` | | `development` | `development` / `production` |
| `CORS_ORIGIN` | | `http://localhost:5173` | Multiple origins: comma-separated |
| `DECISION_ENGINE_URL` | | `http://localhost:8000` | URL Python DSS service |
| `GIS_SERVICE_URL` | | `http://localhost:8003` | URL GIS Processing service |
| `BMKG_BASE_URL` | | `https://api.bmkg.go.id/publik/prakiraan-cuaca` | Base URL API BMKG |
| `R2_ENDPOINT` | | — | Cloudflare R2 endpoint |
| `R2_ACCESS_KEY_ID` | | — | R2 Access Key |
| `R2_SECRET_ACCESS_KEY` | | — | R2 Secret Key |
| `R2_BUCKET_NAME` | | `awd-orthomosaic` | Nama bucket R2 |

---

## 4. Mekanisme Komponen Inti

### A. MQTT Telemetry Ingestion (`/modules/telemetry/ingest.router.ts`)
Gateway menerima data dari ESP8266 (melalui broker MQTT). Setiap device terdaftar di database dengan **MQTT topic unik** yang dibangkitkan otomatis via PostgreSQL trigger.

**Payload format:**
```json
{
  "device_code": "RiceMesh-N1",
  "water_level_raw_cm": 8.5,
  "water_level_cm": 8.2,
  "temperature_c": 29.6,
  "humidity_pct": 75.0,
  "event_timestamp": "2026-06-20T10:00:00Z"
}
```
Data langsung di-`BATCH INSERT` ke `trx.telemetry_records` (TimescaleDB hypertable) tanpa komputasi apapun, menjaga throughput ingest tetap tinggi.

### B. State Builder (`/modules/state-builder/`)
State builder berjalan tiap **10 menit** melalui cron job. Alurnya:
1. Ambil telemetri terbaru per sub-block dari `trx.telemetry_records`.
2. Tentukan *freshness status*: **Fresh** (< 2 jam), **Stale** (2-8 jam), **No Data** (> 8 jam).
3. Jika `no_data`: jalankan `estimator.ts` — K-NN interpolasi dari tetangga terdekat yang masih fresh.
4. Tulis hasilnya ke 2 tabel sekaligus:
   - `trx.sub_block_states` (history record baru)
   - `trx.sub_block_current_states` (upsert — update jika sudah ada)

### C. Cron Job Scheduler (4 Job Aktif)

| Job | Jadwal | Tugas |
|---|---|---|
| `state-builder.job` | `*/10 * * * *` | Bangun/update state semua sub-block |
| `stale-flag.job` | `*/15 * * * *` | Flag sensor mati/tidak ada data |
| `decision-cycle.job` | `*/30 * * * *` | Kirim state + rule ke Python DSS, proses hasilnya |
| `bmkg-sync.job` | setiap 3 jam | Sinkronkan prakiraan cuaca BMKG ke DB |
| `hst-updater.job` | harian | Hitung & update HST (Hari Setelah Tanam) tiap siklus |

### D. Node Fallback Resolver (`node-resolver.ts`)
Sebelum data dikirim ke Python GIS untuk kalkulasi Floyd-Warshall, setiap node harus memiliki nilai ketinggian air yang valid. Node Resolver menerapkan **4-level jaring pengaman**:

```
Level 1: Data terukur asli (state_source = 'observed')
    ↓ Gagal?
Level 2: Data hasil interpolasi K-NN (state_source = 'estimated')
    ↓ Gagal?
Level 3: Rata-rata semua sub-block dalam field yang sama
    ↓ Gagal?
Level 4: ABORT — field ini dilewati dari routing cycle
```

### E. Water Routing Orchestrator (`routing.service.ts`)
Setelah DSS mengeluarkan rekomendasi, BackEnd:
1. Identifikasi sub-block `DRAIN` tertinggi dan `IRRIGATE` terendah berdasarkan `priority_score`.
2. Ekstrak koordinat centroid PostGIS tiap sub-block.
3. Bangun *directed graph* (nodes + edges) berdasarkan ketinggian (`elevation_m`).
4. `POST /run` ke GIS Processing Service.
5. Polling hasil Floyd-Warshall dari Redis.
6. Konversi indeks hasil ke UUID array sub-blocks.
7. Simpan ke `trx.irrigation_recommendations.route_path_ids`.

### F. Embankments Module (`/modules/master-data/`)  ← BARU
Tabel `mst.embankments` merepresentasikan **pematang sawah** (galengan) secara fisik. Setiap embankment:
- Menyimpan polygon geometry GeoJSON (sama seperti sub-block).
- Memiliki `connected_sub_blocks` (JSONB array UUID) — sub-block mana saja yang terhubung secara fisik melalui pematang ini.
- `unique_code` di-generate otomatis: format `{code}_{id}`.

### G. Assignments Module (`/assignments`)  ← BARU
Mengubah rekomendasi DSS menjadi **tugas lapangan konkret** bagi operator:
- `GET /assignments/pending` — Daftar tugas yang belum dikerjakan.
- `GET /assignments/completed` — Riwayat tugas yang sudah selesai.
- `POST /assignments/:id/action` — Operator konfirmasi / tolak tugas dengan catatan lapangan.

---

## 5. RBAC (Role-Based Access Control)

| Role | Akses |
|---|---|
| `system_admin` | Akses penuh semua endpoint & system-settings |
| `field_manager` (per-field) | Kelola field yang ditugaskan, lihat semua data |
| `operator` (per-field) | Baca monitoring, respons assignment lapangan |
| `viewer` (per-field) | Read-only akses data field |

Middleware `requireFieldAccess('viewer' | 'operator' | 'manager')` diterapkan di semua route yang field-spesifik.

---

## 6. Database Migrations (Aktif per 29 Juni 2026)

| File | Perubahan |
|---|---|
| `0000_initial_schema.sql` | Schema awal (41+ tabel, PostGIS, TimescaleDB) |
| `0004_fix_state_tables.sql` | Restrukturisasi state tables |
| `0005_sensor_max_distance.sql` | Tambah kolom `sensor_max_distance_mm` di sensor_calibrations |
| `0006_routing_enrichment.sql` | Tambah `route_path_ids`, `priority_score` di recommendations |
| `0007_add_bmkg_flags.sql` | Flag `is_latest`, `is_stale` di weather_forecast_snapshots |
| `0007_add_embankments.sql` | Buat tabel `mst.embankments` + `unique_code` di sub_blocks |
| `0008_embankments_connected_sub_blocks.sql` | Tambah `connected_sub_blocks` JSONB ke embankments |
| `0010_add_irrigation_points_name_assigned_sub_blocks.sql` | Enrichment irrigation points |
| `0011_add_elevation_calibration_and_pressure.sql` | Kalibrasi elevasi sub-block |
| `0013_add_parent_station_to_devices.sql` | Hierarki device: parent station |
| `0014_update_device_type_check.sql` | Perluas enum device_type |
| `0015_sync_irrigation_recommendations.sql` | Sync recommendations |

---

## 7. Pengembangan Lanjutan (To-Do)
1. Implementasi WebSocket/SSE di BackEnd untuk *push notification* real-time ke FrontEnd (status sensor mati, alert baru, dll.).
2. Endpoint `GET /recommendations/:fieldId` yang menyertakan `route_path_ids` dalam format siap-render untuk FrontEnd.
3. Rate limiting MQTT ingest untuk mencegah flood dari device malfungsi.
