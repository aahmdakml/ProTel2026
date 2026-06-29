# 📋 Changelog & Progress Report ProTel
> **Terakhir diperbarui:** 29 Juni 2026

Dokumen ini berisi rekapitulasi lengkap seluruh perubahan, penyempurnaan, dan perkembangan sistem dari awal pengembangan hingga saat ini.

---

## ✅ Sprint Terakhir (Commit: e69ea65f — 21 Juni 2026)

### Perubahan Terbaru (berdasarkan git log & source code)

#### 1. Pembersihan Repository (Clean Architecture)
- Commit `75c79762`, `107e16f5`, `ffe0efa1`, `38c8a431`: Hapus artefak build (`dist/` & `node_modules/`) dari repository. Repositori kini bersih — hanya source code yang di-track.
- Total: ~26.000 baris kode build artifact dihapus.

#### 2. Penyempurnaan Visualisasi DSS (Commit: `e69ea65f`, `455fbf60`)
- `FrontEnd/src/pages/master/fields.tsx`: Update tampilan peta field dengan integrasi data DSS.
- `FrontEnd/src/pages/monitoring/map.tsx`: Penyempurnaan rendering polygon OpenLayers + overlay rekomendasi DSS.
- `FrontEnd/src/pages/tasks.tsx`: Update UI task management operator lapangan (+62 baris baru).

#### 3. Update Logika Override DSS (Commit: `64a1f485`, `b51f829b`)
- "Override Obat" & "Doomsday Override": Penyesuaian parameter intervensi darurat pada engine DSS Python untuk menangani kondisi ekstrem.
- `BackEnd/src/modules/recommendations/recommendations.service.ts`: Perbaikan 44 baris logika output rekomendasi.

#### 4. Enrichment Master Data (Commit: `e69ea65f`)
- `BackEnd/src/db/schema/mst.ts`: Tambah 1 kolom baru.
- `BackEnd/src/modules/master-data/master-data.router.ts`: +24 endpoint baru.
- `BackEnd/src/modules/master-data/master-data.schema.ts`: +5 schema Zod baru.
- `BackEnd/src/modules/master-data/master-data.service.ts`: +32 fungsi service.

#### 5. Update Model Service Config
- `Model/app/config.py`: +1 konfigurasi environment variable baru.

---

## 📊 Rekap Semua Update Sebelumnya

### A. Infrastruktur & Konektivitas
- ✅ **Perbaikan DNS IPv6 Bug:** Tambah `dns.setDefaultResultOrder('ipv4first')` agar request ke BMKG API tidak gagal resolusi.
- ✅ **Sentralisasi BMKG URL:** Base URL BMKG sekarang diambil dari `BMKG_BASE_URL` di `.env`.
- ✅ **Per-Device MQTT Topic:** PostgreSQL trigger otomatis generate topic unik per device.

### B. Schema Database (Total: 26 Migration Files)
- ✅ `0004_fix_state_tables.sql` — Restrukturisasi tabel state (pisahkan history vs current).
- ✅ `0005_sensor_max_distance.sql` — Tambah `sensor_max_distance_mm` untuk kalibrasi dinamis IoT.
- ✅ `0006_routing_enrichment.sql` — Tambah `route_path_ids`, `priority_score` ke rekomendasi.
- ✅ `0006_add_field_id_to_states.sql` — Tambah `field_id` ke state tables untuk query efisien.
- ✅ `0007_add_bmkg_flags.sql` — Flag `is_latest` & `is_stale` di weather_forecast_snapshots.
- ✅ `0007_add_embankments.sql` — **Tabel baru:** `mst.embankments` (pematang sawah/galengan).
- ✅ `0008_embankments_connected_sub_blocks.sql` — Tambah `connected_sub_blocks[]` ke embankments.
- ✅ `0009_update_device_topic_naming.sql` — Update format MQTT topic device.
- ✅ `0010_add_irrigation_points_name_assigned_sub_blocks.sql` — Enrichment irrigation points.
- ✅ `0011_add_elevation_calibration_and_pressure.sql` — Kalibrasi elevasi + pressure sensor.
- ✅ `0012_aromatic_fallen_one.sql` — Schema tambahan untuk routing.
- ✅ `0013_add_parent_station_to_devices.sql` — Hierarki device (parent station).
- ✅ `0014_update_device_type_check.sql` — Perluas enum device_type.
- ✅ `0015_sync_irrigation_recommendations.sql` — Sinkronisasi recommendations.

### C. Evolusi BMKG Rain Event Detection
Mengubah logika lama (jumlah total curah hujan 24 jam) ke algoritma **Rain Event Detection** yang lebih presisi:
- **Windowing 12 Jam:** Hanya fokus 4 slot × 3 jam ke depan.
- **Rain Event Grouping:** Slot basah yang berurutan dikelompokkan menjadi satu "RainEvent" dengan metadata: durasi, puncak intensitas, jam_hingga_hujan.
- **Storage JSONB:** Event hasil parsing disimpan di `trx.weather_forecast_snapshots.full_response_json`.

### D. Evolusi DSS Python Engine
Dari evaluasi sederhana threshold → matrix keputusan multi-dimensi:
- **Matrix Veto Cuaca Bertingkat:** Silangkan kondisi lahan (5 level) × kehebatan badai (4 level).
- **5 Defense Mechanisms:** Hysteresis, Night Block, Pre-emptive Drain, Snooze Override, Drought Override.
- **Pengecualian Kritis:** `is_critical_dry` → abaikan semua veto cuaca → tetap IRRIGATE_CRITICAL.
- **Massive Testing:** 640 permutasi skenario ekstrem → 100% pass.

### E. Modul Baru BackEnd
- ✅ **`assignments` module:** `/assignments/pending`, `/assignments/completed`, `POST /:id/action`.
- ✅ **`agronomic-treatments` module:** Log intervensi agronomi manual lapangan.
- ✅ **`embankments` module:** CRUD pematang sawah + bulk import GeoJSON.
- ✅ **`telemetry/query` router:** Historical telemetry per sub-block.
- ✅ **`hst-updater` cron job:** Update HST harian otomatis.

### F. Routing String Humanisasi
BackEnd Routing Orchestrator kini menghasilkan instruksi human-readable:
- ❌ Lama: `"OPEN_GATE_TYPE_B_12L_SEC"`
- ✅ Baru: `"Buka pematang antara Kotak A dan Kotak B"`

---

## 🎯 Status Kesiapan Sistem (29 Juni 2026)

### ✅ Komponen Siap Production
| Komponen | Bukti Kesiapan |
|---|---|
| BackEnd Node.js API | 15 modul aktif, RBAC lengkap, error handling |
| Python DSS Engine | 640 skenario pass 100%, validasi Pydantic v2 |
| Database Schema | 26 migrasi terurut, PostGIS + TimescaleDB |
| BMKG Integration | Rain Event Detection + 12-jam windowing |
| Firmware RiceMesh | Tested di lapangan (ada known bug prescaler) |

### 🔧 Dalam Pengembangan Aktif
| Komponen | Status |
|---|---|
| FrontEnd DSS Visual | Sedang disempurnakan (OpenLayers polygon overlay) |
| Water Routing Arrows | FE perlu render `route_path_ids` sebagai polyline animasi |

### 📋 Roadmap Developer Selanjutnya

**Priority 1 — FrontEnd:**
1. Render `route_path_ids` sebagai animated polyline/arrow di OpenLayers (jalur aliran air).
2. Tampilkan status "Offline" sensor di dashboard meski interpolasi tetap berjalan.

**Priority 2 — Infrastruktur:**
1. Pastikan Redis berjalan di production untuk ARQ Worker GIS Floyd-Warshall.
2. Rate limiting MQTT ingest (proteksi dari device malfungsi).

**Priority 3 — DSS Expansion:**
1. Kasus ekstrem: seluruh lahan banjir → buang ke gorong-gorong utama.
2. Kasus ekstrem: seluruh lahan kering → sedot dari sumur pompa utama.

**Priority 4 — Firmware:**
1. Fix prescaler TIM1: `Prescaler = 47` → `Prescaler = 15` di semua STM32 nodes.
2. Fix `Distance` variable overflow: `uint8_t` → `uint16_t`.
