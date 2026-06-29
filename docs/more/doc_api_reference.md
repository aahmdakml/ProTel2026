# 🌐 API Reference — Kontrak Endpoint Lengkap
> **Update:** 29 Juni 2026 — Disesuaikan dengan router aktual (15 modul, assignments, agronomic-treatments)

---

## Base URL
- **Backend API:** `http://localhost:3000`
- **Python DSS:** `http://localhost:8000` *(internal only)*
- **GIS Processing:** `http://localhost:8003` *(internal only)*

## Autentikasi
Semua endpoint (kecuali `/health` dan `/auth/login`) memerlukan header:
```
Authorization: Bearer <access_token>
```

---

## 1. System & Auth

### Health Check
- `GET /health`
- Tidak memerlukan auth.
- **Response:** `{ "status": "ok", "uptime": 1234, "db": "connected" }`

### Login
- `POST /auth/login`
- **Body:** `{ "email": "admin@smartawd.id", "password": "..." }`
- **Response:** `{ "access_token": "...", "refresh_token": "...", "user": {...} }`

### Refresh Token
- `POST /auth/refresh`
- **Body:** `{ "refresh_token": "..." }`

### Logout
- `POST /auth/logout`

---

## 2. Master Data — Fields

### List Fields
- `GET /fields` — (admin: semua, user: field yang diakses)
- **Query params:** `page`, `limit`

### Get Field Detail
- `GET /fields/:fieldId`

### Create Field *(system_admin only)*
- `POST /fields`
- **Body:**
```json
{
  "name": "Sawah Blok A",
  "adm4_code": "3204070001",
  "water_source_type": "irrigated",
  "area_hectares": 2.5,
  "decision_cycle_mode": "normal",
  "is_source_depleted": false
}
```

### Update Field *(system_admin only)*
- `PATCH /fields/:fieldId`

### Toggle Drought Status
- `PATCH /fields/:fieldId/drought-status`
- **Body:** `{ "is_source_depleted": true }`

### Assign User to Field
- `POST /fields/:fieldId/users`
- **Body:** `{ "user_id": "uuid", "field_role": "operator" }`

---

## 3. Master Data — Sub-blocks

### List Sub-blocks
- `GET /fields/:fieldId/sub-blocks`

### Create Sub-block
- `POST /fields/:fieldId/sub-blocks`
- **Body:** `{ "name": "Kotak A1", "code": "A1", "polygon_geom": { GeoJSON Polygon }, "elevation_m": 102.5 }`

### Import Sub-blocks dari GeoJSON *(bulk)*
- `POST /fields/:fieldId/sub-blocks/import`
- **Body:** `{ "geojson": { FeatureCollection }, "name_field": "nama", "code_field": "kode" }`

---

## 4. Master Data — Embankments (Pematang) ← BARU

### List Embankments
- `GET /fields/:fieldId/embankments`

### Create Embankment
- `POST /fields/:fieldId/embankments`
- **Body:** `{ "name": "Pematang AB", "code": "PAB", "polygon_geom": { GeoJSON Polygon }, "connected_sub_blocks": ["uuid-a", "uuid-b"] }`

### Import Embankments dari GeoJSON *(bulk)*
- `POST /fields/:fieldId/embankments/import`

### Update Embankment
- `PATCH /fields/:fieldId/embankments/:embankmentId`

---

## 5. Master Data — Devices

### List Devices
- `GET /devices` atau `GET /fields/:fieldId/devices`

### Create Device *(system_admin only)*
- `POST /devices`
- **Body:**
```json
{
  "device_code": "RiceMesh-001",
  "device_type": "awd_water_level",
  "connection_type": "wifi",
  "hardware_model": "ESP8266-NodeMCU",
  "field_id": "uuid"
}
```

### Assign Device ke Sub-block
- `POST /devices/:deviceId/assign`
- **Body:** `{ "sub_block_id": "uuid" }`

### Kalibrasi Sensor
- `POST /devices/:deviceId/calibrate`
- **Body:** `{ "sensor_max_distance_mm": 1400, "water_level_offset_cm": 0.5 }`

---

## 6. Master Data — Crop Cycles & Rule Profiles

### List Siklus Tanam
- `GET /fields/:fieldId/crop-cycles`

### Create Siklus Tanam
- `POST /fields/:fieldId/crop-cycles`
- **Body:** `{ "sub_block_id": "uuid", "bucket_code": "medium_early", "variety_name": "Ciherang", "planting_date": "2026-05-01", "rule_profile_id": "uuid" }`

### Advance Phase Siklus
- `POST /crop-cycles/:cycleId/advance-phase`

### List Rule Profiles
- `GET /rule-profiles`

---

## 7. Telemetry

### Batch Ingest Telemetri
- `POST /ingest/batch`
- Dipanggil oleh MQTT gateway (ESP8266) atau langsung oleh firmware.
- **Body:**
```json
[
  {
    "device_code": "RiceMesh-001",
    "water_level_raw_cm": 8.5,
    "water_level_cm": 8.2,
    "temperature_c": 29.6,
    "humidity_pct": 75.0,
    "event_timestamp": "2026-06-20T10:00:00Z"
  }
]
```

### History Telemetri Sub-block
- `GET /telemetry/sub-blocks/:subBlockId/history`
- **Query:** `from`, `to` (ISO timestamp), `limit`

---

## 8. Rekomendasi & Dashboard

### Status Semua Sub-block (untuk peta FE)
- `GET /fields/:fieldId/sub-blocks/status`
- **Response:** Array sub-block dengan state + rekomendasi aktif + `route_path_ids`
```json
{
  "success": true,
  "data": [{
    "sub_block_id": "uuid",
    "code": "A1",
    "water_level_cm": 8.5,
    "state": "fresh",
    "source": "observed",
    "active_recommendation": {
      "type": "DRAIN_EXCESS",
      "command_template_code": "DRAIN_EXCESS",
      "priority_score": 0.85,
      "route_path_ids": ["uuid-a1", "uuid-c2", "uuid-b3"]
    }
  }]
}
```

### List Rekomendasi Aktif
- `GET /fields/:fieldId/recommendations`

### Dashboard Summary
- `GET /dashboard`

---

## 9. Assignments (Task Management Operator) ← BARU

### Daftar Tugas Pending
- `GET /assignments/pending`
- Mengembalikan semua rekomendasi aktif yang belum ditindaklanjuti.

### Daftar Tugas Selesai
- `GET /assignments/completed`

### Konfirmasi / Tolak Tugas
- `POST /assignments/:assignmentId/action`
- **Body:** `{ "action": "completed" | "rejected", "notes": "Catatan lapangan..." }`

---

## 10. Python DSS Engine (Internal — Port 8000)
*Dipanggil oleh BackEnd, bukan langsung dari FrontEnd.*

### Evaluasi AWD Decision
- `POST /evaluate`
- **Payload:**
```json
{
  "job_id": "cron-xyz-123",
  "field_id": "uuid",
  "weather": {
    "is_stale": false,
    "peak_intensity_mm": 12.5,
    "rain_events": [{
      "starts_at": "2026-06-20T13:00:00Z",
      "ends_at": "2026-06-20T19:00:00Z",
      "hours_until_rain": 2.5,
      "duration_hours": 6,
      "total_mm": 15.0,
      "peak_intensity_mm": 12.5,
      "intensity_label": "heavy"
    }]
  },
  "active_warnings": [],
  "sub_blocks": [{
    "id": "uuid",
    "management_flags": { "snooze_dss": false, "is_source_depleted": false },
    "state": {
      "water_level_cm": -1.0,
      "state_source": "observed",
      "freshness_status": "fresh"
    },
    "rule_profile": {
      "awd_lower_threshold_cm": 2.0,
      "awd_upper_target_cm": 5.0,
      "drought_alert_cm": -5.0,
      "rain_delay_mm": 10.0
    },
    "crop_cycle": {
      "current_phase_code": "vegetative",
      "current_hst": 35,
      "bucket_code": "medium_early"
    }
  }]
}
```
- **Response:**
```json
{
  "recommendations": [{
    "sub_block_id": "uuid",
    "recommendation_type": "irrigate",
    "command_template_code": "IRRIGATE_CRITICAL",
    "priority_score": 1.1,
    "priority_rank": 1,
    "confidence_level": "high"
  }]
}
```

---

## 11. GIS Processing Service (Internal — Port 8003)
*Dipanggil oleh BackEnd setelah mendapat hasil DSS.*

### Trigger Floyd-Warshall
- `POST /floydwarshall/run`
- **Body:** `{ "field_id": "uuid", "nodes": [...], "edges": [...] }`
- **Response (202 Accepted):** `{ "status": "enqueued", "job_id": "arq_task_987" }`

### Ambil Rute Spesifik
- `POST /floydwarshall/matrix`
- **Body:** `{ "field_id": "uuid", "source_idx": 0, "target_idx": 3 }`
- **Response:** `{ "route_indices": [0, 5, 2, 3] }`
