# 🗄️ Dokumentasi Database & Schema
> **Update:** 29 Juni 2026 — Disesuaikan dengan 26 file migrasi aktual & schema Drizzle ORM terbaru

## 1. Ikhtisar Arsitektur Database

Database ProTel menggunakan arsitektur **Polyglot Database** di atas **Supabase Cloud** (managed PostgreSQL 16):

| Ekstensi | Fungsi |
|---|---|
| **PostGIS** | Tipe data geometri: `GEOMETRY(Polygon)`, `GEOMETRY(Point)`. Query spasial: `ST_Centroid()`, `ST_Area()` |
| **TimescaleDB** | Hypertable time-series: `trx.telemetry_records` dipartisi otomatis per waktu |
| **pgcrypto** | `gen_random_uuid()` untuk semua primary key |

---

## 2. Empat Schema PostgreSQL

```
PostgreSQL Database
├── mst.*     ← Master / Reference Data (data tidak sering berubah)
├── trx.*     ← Transaksional (data aktif & time-series)
├── sys.*     ← System internals (job queue, engine config)
└── logs.*    ← Audit & observability (API logs, auth logs)
```

### Schema `mst` — Master Data

| Tabel | Baris Kunci | Deskripsi |
|---|---|---|
| `mst.rice_duration_buckets` | `bucket_code` PK | Referensi varietas padi (early/medium_early/medium/late) |
| `mst.growth_phases` | `phase_code` PK | 8 fase pertumbuhan padi |
| `mst.users` | `email` UNIQUE | User sistem dengan RBAC (system_admin/field_manager/operator) |
| `mst.fields` | `adm4_code` | Lahan sawah utama. Punya `irrigation_edges/nodes` JSON untuk routing manual |
| `mst.user_fields` | FK ke users + fields | Many-to-many: user dapat akses ke banyak field |
| `mst.sub_blocks` | `unique_code` GENERATED | Petak sawah (sub-divisi dari field). Polygon GeoJSON + auto-centroid |
| **`mst.embankments`** | `unique_code` GENERATED | **BARU:** Pematang/galengan sawah. Polygon + `connected_sub_blocks[]` |
| `mst.flow_paths` | FK ke fields | Cache matriks Floyd-Warshall per field |
| `mst.irrigation_points` | FK ke fields | Titik pompa/pintu air. `assigned_sub_blocks[]` |
| `mst.devices` | `device_code` UNIQUE | Perangkat IoT. Punya `topic` (auto-generated via DB trigger) |
| `mst.device_assignments` | FK device + sub_block | Riwayat penempatan device (historis) |
| `mst.sensor_calibrations` | FK ke devices | Parameter kalibrasi termasuk `sensor_max_distance_mm` (default 1400mm) |
| `mst.irrigation_rule_profiles` | FK bucket + phase | Profil aturan AWD: lower/upper threshold, drought alert |
| `mst.crop_cycles` | FK sub_block + field | Siklus tanam aktif. `current_hst` di-update harian |
| `mst.alert_configs` | FK field/sub_block | Konfigurasi threshold alert per lahan |
| `mst.map_layers` | FK ke fields | Metadata citra drone (COG key di R2) |
| `mst.system_settings` | singleton `id='global'` | Konfigurasi global sistem |

### Schema `trx` — Transaksional

| Tabel | Deskripsi |
|---|---|
| `trx.telemetry_records` | **TimescaleDB Hypertable.** Data sensor IoT. Kolom `event_timestamp` = partition key |
| `trx.sub_block_states` | History state per-run (setiap 10 menit = 1 baris baru) |
| `trx.sub_block_current_states` | **Upsert** state terkini (hanya 1 baris per sub-block) |
| `trx.irrigation_recommendations` | Keluaran DSS. Kolom `route_path_ids` JSONB = jalur air |
| `trx.management_events` | Event manual petani: `snooze_dss`, `drought_override` |
| `trx.weather_forecast_snapshots` | Snapshot prakiraan BMKG. `is_latest` & `is_stale` flag |
| `trx.weather_warning_snapshots` | Warning level aktif: `SKIP_CYCLE` / `DELAY_IRRIGATION` |
| `trx.integration_logs` | Log setiap panggilan ke API eksternal (BMKG, GIS, DSS) |

---

## 3. Drizzle ORM — Koneksi & Pattern

BackEnd menggunakan **Drizzle ORM** dengan client `drizzle-orm/pg-core` + `pg` (node-postgres).

```typescript
// db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: config.DATABASE_URL });
export const db = drizzle(pool, { schema: allSchemas });

// Contoh query
const fields = await db
  .select()
  .from(fieldsTable)
  .where(eq(fieldsTable.isActive, true))
  .orderBy(fieldsTable.name)
  .limit(20);
```

### Custom Geometry Types (`db/geometry.ts`)
Karena PostGIS menggunakan tipe `GEOMETRY` yang tidak ada di Drizzle standar, dibuat custom column types:
```typescript
export const geometryPolygon = (name: string) =>
  customType<{ data: string }>({ ... })(name);

export const geometryPoint = (name: string) =>
  customType<{ data: string }>({ ... })(name);
```
Data geometri disimpan dan dibaca sebagai WKT (Well-Known Text) atau GeoJSON text di layer TypeScript.

---

## 4. Triggers & Generated Columns

### Auto-Centroid Trigger
Setiap kali row baru diinsert atau `polygon_geom` diupdate di `mst.sub_blocks` atau `mst.embankments`, PostgreSQL trigger otomatis menghitung centroid:
```sql
CREATE TRIGGER trg_sub_blocks_centroid
  BEFORE INSERT OR UPDATE ON mst.sub_blocks
  FOR EACH ROW EXECUTE FUNCTION compute_centroid();

-- compute_centroid():
NEW.centroid := ST_Centroid(ST_GeomFromText(NEW.polygon_geom));
```

### Auto-Updated-At Trigger
Semua tabel yang memiliki `updated_at` menggunakan trigger `set_updated_at()`:
```sql
NEW.updated_at = now();
```

### Auto MQTT Topic Trigger
Saat device baru dibuat atau dipindah ke sub-block berbeda, PostgreSQL trigger otomatis generate MQTT topic:
```sql
-- Format: field/{field_id}/sensor/{device_code}
NEW.topic := 'field/' || NEW.field_id::text || '/sensor/' || NEW.device_code;
```

### Generated Column `unique_code`
```sql
-- Di mst.sub_blocks & mst.embankments:
unique_code TEXT GENERATED ALWAYS AS (
  COALESCE(code, 'nocode') || '_' || id::text
) STORED;
```

---

## 5. TimescaleDB Hypertable

`trx.telemetry_records` adalah **TimescaleDB Hypertable** yang dipartisi secara otomatis berdasarkan `event_timestamp`. Keuntungan:
- **Fast time-range queries:** `WHERE event_timestamp BETWEEN X AND Y` sangat cepat karena hanya membaca partisi relevan.
- **Automatic compression:** Partisi tua dikompresi otomatis.
- **Retention policies:** Data lama dapat dihapus otomatis (belum dikonfigurasi).

```sql
-- Buat hypertable
SELECT create_hypertable('trx.telemetry_records', 'event_timestamp',
  chunk_time_interval => INTERVAL '1 day');
```

---

## 6. Workflow Database Developer

### Tambah Kolom / Tabel Baru:
```bash
# 1. Edit schema Drizzle:
#    src/db/schema/mst.ts  atau  src/db/schema/trx.ts

# 2. Generate file migrasi SQL baru:
npm run db:generate

# 3. Review file SQL yang dihasilkan di database/migrations/

# 4. Jalankan migrasi:
npm run db:migrate
```

### Scripts Database Tersedia:
| Command | Fungsi |
|---|---|
| `npm run db:generate` | Generate file SQL migration dari perubahan schema Drizzle |
| `npm run db:migrate` | Jalankan semua migration SQL yang belum dieksekusi |
| `npm run db:seed` | Seed data referensi wajib (varietas padi, fase pertumbuhan) |
| `npm run db:seed:dev` | Seed dummy data development (fields, sub-blocks, dll.) |
| `npm run db:setup` | `migrate` + `seed` (untuk production) |
| `npm run db:setup:dev` | `migrate` + `seed` + `seed:dev` (untuk development) |
| `npm run db:reset` | ⚠️ DEV ONLY: Hapus semua tabel & reset ulang dari 0 |
| `npm run seed:admin` | Buat user `system_admin` pertama |

---

## 7. Indeks Kritis

| Tabel | Kolom Diindeks | Alasan |
|---|---|---|
| `trx.telemetry_records` | `(sub_block_id, event_timestamp DESC)` | Query sensor terbaru per sub-block (state builder) |
| `trx.sub_block_current_states` | `sub_block_id` UNIQUE | Upsert cepat, lookup O(1) |
| `mst.sub_blocks` | `field_id`, `unique_code` UNIQUE | List sub-blocks per field, import check |
| `mst.embankments` | `field_id`, `unique_code` UNIQUE | List embankments per field |
| `mst.devices` | `device_code` UNIQUE, `sub_block_id` | Device lookup saat MQTT ingest |
| `mst.sensor_calibrations` | `(device_id, is_active)` | Cepat ambil kalibrasi aktif saat ingest |
