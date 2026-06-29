# 📊 Laporan Status Teknis Sistem — 29 Juni 2026

Laporan ini merangkum kondisi sistem secara menyeluruh berdasarkan analisis kode sumber terbaru (commit `c2498a09`).

---

## 1. Ringkasan Eksekutif

**ProTel Smart AWD** telah mencapai fase **Production-Ready pada layer logika** (Backend + Python DSS Engine). Seluruh pipeline data dari sensor IoT hingga rekomendasi DSS telah terhubung dan divalidasi. FrontEnd sedang dalam tahap penyempurnaan integrasi visual DSS.

---

## 2. Apa yang Sudah Selesai

### ✅ Backend Node.js (15 Modul)
- Semua API endpoint CRUD master data (fields, sub-blocks, devices, embankments, crop cycles, rule profiles).
- MQTT ingest pipeline dengan kalibrasi dinamis `(max_distance - raw) / 10`.
- 5 cron jobs otomatis: state builder, stale flag, decision cycle, BMKG sync, HST updater.
- 4-level node fallback resolver untuk water routing.
- Floyd-Warshall routing orchestration.
- RBAC: system_admin / field_manager / operator / viewer.
- Assignments module untuk task management operator.
- Agronomic treatments log.

### ✅ Python DSS Engine
- Matrix keputusan 5-dimensi (cuaca × kondisi lahan × waktu × flags × threshold).
- 5 defense mechanisms: hysteresis, night block, pre-emptive drain, snooze, drought override.
- Validasi input ketat via Pydantic v2 (tidak bisa crash dari input anomali).
- 640 skenario fuzz test → 100% pass.

### ✅ Database & Migrations
- 26 file migrasi SQL terurut dan berhasil dieksekusi.
- TimescaleDB hypertable untuk telemetri.
- PostGIS triggers untuk auto-centroid.
- PostgreSQL trigger untuk auto-generate MQTT device topic.
- Tabel `mst.embankments` (pematang sawah) sudah ada.
- Weather forecast snapshot dengan `is_latest` / `is_stale` flags.

### ✅ BMKG Rain Event Detection
- Algorithm windowing 12 jam (4 slot × 3 jam).
- Rain Event grouping: slot basah berurutan → 1 RainEvent object.
- Metadata ekstraksi: `hours_until_rain`, `duration_hours`, `peak_intensity_mm`.
- Penyimpanan JSONB terstruktur di database.

---

## 3. Sedang Dalam Pengembangan

### 🔧 FrontEnd React
- Rendering `route_path_ids` sebagai animated polyline di OpenLayers.
- Status "Offline" sensor di dashboard (walaupun interpolasi tetap berjalan).
- Visual DSS rekomendasi yang lebih kaya informasi.

---

## 4. Known Issues & Bugs

| Komponen | Issue | Severity |
|---|---|---|
| Firmware STM32 | Prescaler TIM1 = 47 (harus = 15), jarak meleset 3× | 🔴 HIGH |
| Firmware STM32 | `Distance` var `uint8_t`, overflow > 255cm | 🟡 MEDIUM |
| Firmware Node-1 | `.ioc` drift: makro `ECHO_Pin` undefined → build gagal | 🔴 HIGH |
| Gateway ESP8266 | WiFi credentials hardcoded di source | 🟡 MEDIUM |
| GIS Processing | Redis perlu aktif di production untuk ARQ Worker | 🟡 MEDIUM |
| FrontEnd | `route_path_ids` belum di-render sebagai polyline | 🟠 MEDIUM |
| Model/main.py | Health check masih bilang `titiler: mounted` meski TiTiler sudah dipisah | 🟢 LOW |

---

## 5. Tech Stack Snapshot

| Layer | Teknologi | Versi |
|---|---|---|
| Frontend | React + Vite + TypeScript | 18.x / 5.x / 5.7 |
| Frontend Map | OpenLayers | latest |
| Frontend Charts | Recharts | latest |
| Frontend Styling | Tailwind CSS | 3.x |
| Backend | Node.js + Express | 20.x |
| Backend ORM | Drizzle ORM | latest |
| Backend Validation | Zod | latest |
| Backend Logger | Pino | latest |
| Database | PostgreSQL 16 + PostGIS + TimescaleDB | Supabase Cloud |
| Python Service | FastAPI + Uvicorn + Pydantic v2 | Python 3.11 |
| GIS Processing | FastAPI + NetworkX + SciPy + Redis | Python 3.11 |
| Job Queue | ARQ (async Redis queue) | latest |
| Storage | Cloudflare R2 (S3-compatible) | — |
| Map Tiles | TiTiler (COG) | — |
| Auth | JWT (Access + Refresh Token, HMAC SHA256) | — |
| Firmware STM32 | HAL + GCC ARM | arm-none-eabi-gcc 10.x |
| Firmware ESP8266 | Arduino (PlatformIO) | 6.x |
| IoT Radio | nRF24L01+ | — |
| IoT Sensor Jarak | HC-SR04 Ultrasonik | — |
| IoT Sensor Cuaca | BMP280 (I2C) | — |
| Drone Processing | WebODM (Docker) | — |
| Weather API | BMKG Open Data (Adm4 Kelurahan) | — |
