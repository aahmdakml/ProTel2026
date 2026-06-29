# 🧠 Dokumentasi Teknis: Model Service (Python DSS & TiTiler)
> **Update:** 29 Juni 2026 — Disesuaikan dengan kode sumber aktual (TiTiler sudah dipisah, DSS standalone)

## 1. Ikhtisar (Overview)

**Model Service** (`d:\PROTEL\src\Model`) adalah layanan *Microservice* analitik berbasis **Python 3.11** yang berfungsi khusus sebagai **Decision Support System (DSS) Engine** untuk Smart AWD. 

> ⚠️ **Catatan Penting:** Berdasarkan kode sumber terkini (`main.py`), **TiTiler dan COG Processor telah dipisahkan** dari Model Service ini. TiTiler kemungkinan berjalan sebagai layanan terpisah atau modul standalone. Model Service ini sekarang murni hanya menangani DSS evaluation.

**Stack:** Python 3.11 · FastAPI · Pydantic v2 · Uvicorn · asyncpg

---

## 2. Struktur Direktori Aktual

```text
Model/
├── .env                   ← Konfigurasi aktif (sudah ada)
├── .env.example
├── .python-version        ← Python 3.11.x
├── pyproject.toml
├── requirements.txt
├── app/
│   ├── __init__.py
│   ├── main.py            ← FastAPI entry point (ASGI Uvicorn)
│   ├── config.py          ← Pydantic BaseSettings dari .env
│   ├── db.py              ← asyncpg connection pool (direct DB access)
│   └── modules/
│       └── decision_engine/
│           ├── __init__.py
│           ├── engine.py      ← Core AWD rule-based logic
│           ├── router.py      ← FastAPI router: POST /evaluate
│           ├── schemas.py     ← Pydantic models (request & response)
│           └── scorer.py      ← Priority score calculation
├── blackbox_test_dss.py   ← Uji fungsional terstruktur
├── fuzz_dss.py            ← Fuzz testing (150+ skenario acak)
├── massive_test_dss.py    ← Massive combinatorial test (640 skenario)
└── test_dss.py            ← Unit tests
```

---

## 3. FastAPI Application (`main.py`)

```python
# Endpoint yang terdaftar:
POST /evaluate   ← DSS evaluation (via decision_router)
GET  /health     ← Health check + DB connection status
GET  /docs       ← Swagger UI (development mode only)
GET  /redoc      ← ReDoc UI (development mode only)
```

### Lifespan Events:
- **Startup:** Inisialisasi `asyncpg` connection pool ke PostgreSQL.
- **Shutdown:** Tutup koneksi pool dengan bersih.

### CORS Policy:
- Hanya mengizinkan request dari `SERVER1_URL` (backend Node.js) dan `http://localhost:3000`.
- Methods: `GET`, `POST` saja.

---

## 4. Kontrak Data (Pydantic Schemas)

### Input: `EvaluateRequest`
```python
class EvaluateRequest(BaseModel):
    job_id: str
    field_id: str
    weather: WeatherContext          # Hasil parsing BMKG dari Node.js
    active_warnings: list[WeatherWarning]
    sub_blocks: list[SubBlockInput]

class WeatherContext(BaseModel):
    is_stale: bool                   # True jika data BMKG > 6 jam
    peak_intensity_mm: float         # Puncak curah hujan (mm)
    rain_events: list[RainEvent]     # Daftar kejadian hujan 12 jam ke depan

class RainEvent(BaseModel):
    starts_at: datetime
    ends_at: datetime
    hours_until_rain: float          # Berapa jam lagi hujan datang
    duration_hours: float            # Durasi hujan
    total_mm: float
    peak_intensity_mm: float
    intensity_label: str             # "light"|"moderate"|"heavy"|"extreme"

class SubBlockInput(BaseModel):
    id: str
    management_flags: ManagementFlags
    state: SubBlockState
    rule_profile: RuleProfile | None
    crop_cycle: CropCycleInfo | None

class ManagementFlags(BaseModel):
    snooze_dss: bool = False         # Tunda semua alarm
    is_source_depleted: bool = False # Sumber air kering

class SubBlockState(BaseModel):
    water_level_cm: float | None     # None = no data
    state_source: str                # "observed"|"estimated"|"no_data"
    freshness_status: str            # "fresh"|"stale"|"no_data"

class RuleProfile(BaseModel):
    awd_lower_threshold_cm: float    # Batas bawah AWD (mulai irigasi)
    awd_upper_target_cm: float       # Batas atas AWD (mulai drainase)
    drought_alert_cm: float          # Emergency drought threshold
    rain_delay_mm: float             # Hujan di atas ini → tunda irigasi
```

### Output: `EvaluateResponse`
```python
class EvaluateResponse(BaseModel):
    recommendations: list[RecommendationOutput]

class RecommendationOutput(BaseModel):
    sub_block_id: str
    recommendation_type: str        # "irrigate"|"drain"|"maintain"|"observe"|"skip"
    command_template_code: str      # eg. "IRRIGATE_CRITICAL", "DRAIN_EXCESS"
    priority_score: float           # 0.0 - 1.1 (kritis mendapat skor > 1.0)
    priority_rank: int              # Urutan prioritas (1 = paling mendesak)
    confidence_level: str           # "high"|"medium"|"low"
    reasoning: str                  # Penjelasan singkat keputusan
```

---

## 5. Hierarki Logika `engine.py` (Rule-Based Engine)

DSS bekerja secara **sequential checks** per sub-block. Urutan evaluasi penting — check pertama yang triggered akan menjadi output akhir.

### Tahap 0: Snooze & Management Override
```
IF management_flags.snooze_dss == True:
    → OBSERVE (Alarm Dijeda Petani)
IF management_flags.is_source_depleted == True AND tindakan == IRRIGATE:
    → OBSERVE (Irigasi Dibatalkan: Sumber Air Kering)
```

### Tahap 1: Penilaian Data
```
IF state_source == "no_data" OR water_level_cm is None:
    → OBSERVE (NO_DATA — Periksa sensor)
IF rule_profile is None:
    → OBSERVE (NO_RULE — Tidak ada profil aturan)
```

### Tahap 2: Weather Warning Check (BMKG Extreme Events)
```
IF active_warnings contains SKIP_CYCLE:
    → SKIP (SKIP_AWD_EVENT — Tunda siklus AWD)
IF active_warnings contains DELAY_IRRIGATION:
    → OBSERVE (Badai Ekstrem — Tunda Irigasi)
```

### Tahap 3: Weather Veto Matrix (12-jam window)
Cek event hujan terdekat dalam 12 jam ke depan. Bandingkan dengan kondisi lahan:
```
if is_flooded AND is_heavy   → DRAIN (DRAIN_CRITICAL_RAIN)
if is_high AND is_heavy      → DRAIN (DRAIN_URGENT_RAIN)
if is_critical_dry           → BYPASS SEMUA VETO → tetap IRRIGATE_CRITICAL
if is_dry AND (imminent AND heavy) → OBSERVE (HOLD_RAIN_COMING)
if is_dry AND NOT imminent   → IRRIGATE (IRRIGATE_BEFORE_RAIN — isi sebelum hujan)
```

### Tahap 4: Time-of-Day Defense
```
IF waktu = 17:00 - 04:59 (Jam Malam) AND tindakan == IRRIGATE:
    IF NOT is_critical_dry:
        → OBSERVE (NIGHT_BLOCK — Tunda ke besok pagi)
IF waktu = 13:00 - 16:59 (Sore Hari) AND prediksi badai malam AND lahan normal:
    → DRAIN (PRE_EMPTIVE_AFTERNOON_DRAIN)
```

### Tahap 5: Threshold Evaluation (Reactive Mode)
```
wl ≤ drought_alert_cm    → IRRIGATE (IRRIGATE_CRITICAL)
wl ≤ awd_lower_cm        → IRRIGATE (IRRIGATE_THRESHOLD)
wl ≥ awd_upper_cm + 5.0  → DRAIN (DRAIN_EXCESS) [+5cm hysteresis]
wl < 0                   → MAINTAIN (MAINTAIN_DRY)
else                     → MAINTAIN (MAINTAIN_AWD_WET)
```

---

## 6. Perhitungan Prioritas (`scorer.py`)

Priority score digunakan untuk menentukan sub-block mana yang paling mendesak:

```python
# Formula dasar:
score = min(0.5 + (deficit / 30.0) * 0.5, 1.0)

# Multiplier untuk kondisi kritis:
if command == "IRRIGATE_CRITICAL":
    score = min(score * 2.0, 1.1)   # Skor melebihi 1.0 → rank pertama dijamin

# deficit = jarak antara water_level_cm dengan target optimal
```

---

## 7. Mekanisme Pertahanan (5 Defense Layers)

| # | Nama | Kondisi | Aksi |
|---|---|---|---|
| 1 | **Tolerance Hysteresis** | `wl > awd_upper + 5cm` | DRAIN_EXCESS (bukan langsung DRAIN setiap lewat upper) |
| 2 | **Night Block** | Pukul 17:00-04:59 + IRRIGATE | Ubah ke OBSERVE (kecuali IRRIGATE_CRITICAL) |
| 3 | **Pre-emptive Drain** | Sore hari + prediksi badai malam | DRAIN_PREPARE_RAIN |
| 4 | **Snooze Override** | `management_flags.snooze_dss = true` | OBSERVE sepenuhnya |
| 5 | **Drought Override** | `management_flags.is_source_depleted = true` | Batalkan IRRIGATE → OBSERVE |

---

## 8. Keandalan Pengujian

| Test File | Jenis Test | Skenario | Hasil |
|---|---|---|---|
| `test_dss.py` | Unit tests | ~30 kasus | ✅ 100% Pass |
| `blackbox_test_dss.py` | Black-box functional | ~50 skenario | ✅ 100% Pass |
| `fuzz_dss.py` | Fuzz (input acak) | 150+ skenario acak | ✅ 100% Pass |
| `massive_test_dss.py` | Combinatorial | 640 permutasi ekstrem | ✅ 100% Pass |

**Jaminan keamanan dari testing:**
- Tidak pernah DRAIN sawah yang airnya negatif (wl < 0).
- Selalu IRRIGATE_CRITICAL meskipun badai besar akan datang — tanaman tidak dibiarkan mati.
- Tidak pernah crash/exception pada input anomali berkat validasi Pydantic v2.

---

## 9. Setup & Deployment

```bash
# Aktivasi virtual environment
cd Model
.venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Jalankan service (Port 8000)
uvicorn app.main:app --port 8000 --reload

# Akses Swagger UI (development mode)
http://localhost:8000/docs
```

**Environment Variables (`Model/.env`):**

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SERVER1_URL` | URL Backend Node.js (untuk CORS whitelist) |
| `APP_ENV` | `development` / `production` |
| `PORT` | Default `8000` |
| `LOG_LEVEL` | `DEBUG` / `INFO` / `WARNING` |
| `AWS_S3_ENDPOINT` | Cloudflare R2 endpoint (untuk GDAL env) |
| `AWS_REGION` | Region R2 (biasanya `auto`) |
