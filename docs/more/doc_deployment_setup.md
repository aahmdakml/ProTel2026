# 📦 Deployment & Setup Guide
> **Update:** 29 Juni 2026 — Disesuaikan dengan arsitektur Supabase Cloud (Serverless DB)

## 1. Prasyarat

| Tool | Versi Minimum | Kegunaan |
|---|---|---|
| Node.js | 20.x LTS | BackEnd API server |
| npm | 10.x | Package manager |
| Python | 3.11+ | Model Service & GIS Processing |
| Git | 2.x | Version control |
| Supabase Account | — | Cloud PostgreSQL database |
| Cloudflare R2 Account | — | Object storage (citra drone COG) |

**Opsional (untuk GIS Processing):**
- Redis (untuk ARQ job queue Floyd-Warshall)
- Docker (untuk WebODM fotogrametri drone)

---

## 2. Clone & Persiapan

```bash
git clone https://github.com/aahmdakml/ProTel2026.git
cd ProTel2026/src
```

---

## 3. Setup Database (Supabase)

> Proyek ini menggunakan arsitektur **Serverless DB** — tidak perlu Docker lokal untuk database!

1. Buat project baru di [supabase.com](https://supabase.com).
2. Di dashboard Supabase, aktifkan ekstensi:
   - **PostGIS** (Settings → Extensions → Enable PostGIS)
   - **TimescaleDB** (Settings → Extensions → Enable TimescaleDB)
3. Ambil **Connection String** (Project Settings → Database → URI).

---

## 4. BackEnd Setup

```bash
cd BackEnd
npm install
cp .env.example .env
```

Isi file `.env`:
```env
# Database (Supabase connection string)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres

# Auth
JWT_SECRET=<random_string_min_32_chars>  # Generate: openssl rand -hex 32

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# External Services
DECISION_ENGINE_URL=http://localhost:8000
GIS_SERVICE_URL=http://localhost:8003
BMKG_BASE_URL=https://api.bmkg.go.id/publik/prakiraan-cuaca

# Cloudflare R2 (untuk orthomosaic drone)
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=YOUR_R2_KEY
R2_SECRET_ACCESS_KEY=YOUR_R2_SECRET
R2_BUCKET_NAME=awd-orthomosaic
```

```bash
# Jalankan migrasi database + seed data referensi + dummy dev data
npm run db:setup:dev

# Buat akun admin pertama
ADMIN_EMAIL=admin@smartawd.id \
ADMIN_PASSWORD=RahasiaKuat123! \
ADMIN_NAME="System Administrator" \
npm run seed:admin

# Jalankan development server
npm run dev
# → Backend berjalan di http://localhost:3000
# → Health check: http://localhost:3000/health
```

---

## 5. FrontEnd Setup

```bash
cd ../FrontEnd
npm install

# Opsional: jika backend tidak di localhost
echo "VITE_API_URL=http://localhost:3000" > .env

npm run dev
# → Dashboard berjalan di http://localhost:5173
```

---

## 6. Model Service (Python DSS) Setup

```bash
cd ../Model

# Buat & aktifkan virtual environment
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # Mac/Linux

pip install -r requirements.txt

cp .env.example .env
```

Isi `Model/.env`:
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
SERVER1_URL=http://localhost:3000
APP_ENV=development
PORT=8000
LOG_LEVEL=INFO
AWS_S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
AWS_VIRTUAL_HOSTING=FALSE
AWS_REGION=auto
```

```bash
uvicorn app.main:app --reload --port 8000
# → DSS Engine berjalan di http://localhost:8000
# → Swagger UI: http://localhost:8000/docs (development mode)
```

---

## 7. GIS Processing Service (Opsional)

Service ini (`d:\PROTEL\gis_risang\ricemesh-gis-processing`) adalah komponen **opsional** yang diperlukan untuk fitur Water Routing (Floyd-Warshall). Jika tidak dijalankan, sistem tetap berfungsi untuk DSS evaluation — hanya fitur routing air di peta yang tidak aktif.

```bash
# Prasyarat: Redis harus berjalan
redis-server

# Setup GIS Processing (di repo terpisah)
cd d:\PROTEL\gis_risang\ricemesh-gis-processing
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Jalankan FastAPI service
uvicorn src.main:app --reload --port 8003

# Jalankan ARQ Worker (di terminal terpisah)
python -m arq src.arq_worker.worker.WorkerSettings
```

---

## 8. Firmware RiceMesh IoT (Hardware)

```bash
# Node Pengirim (STM32)
cd Firmware/RiceMesh-Transmitter/RiceMesh-Node-1
make
./build_flash.sh     # Flash via ST-Link

# Node Penerima (STM32)
cd ../../RiceMesh-Receiver/RiceMesh-v4-f030-rx
make && ./build_flash.sh

# Gateway MQTT (ESP8266 - PlatformIO)
cd ../../MQTT-Transmitter/ricemesh-data-show
# Edit src/main.cpp: isi WIFI_SSID, WIFI_PASS, MQTT_BROKER
pio run --target upload
```

> ⚠️ **PENTING — Bug Firmware yang Diketahui:**
> Prescaler TIM1 di semua STM32 node di-set ke `47` (cocok untuk 48MHz), padahal SYSCLK = 16MHz.
> **Efek:** Pembacaan jarak HC-SR04 meleset ~3×.
> **Fix:** Ubah ke `Prescaler = 15` di fungsi `MX_TIM1_Init()` setiap node sebelum flash.

---

## 9. Service URLs Summary

| Service | URL Default | Port |
|---|---|---|
| BackEnd API | http://localhost:3000 | 3000 |
| FrontEnd Dashboard | http://localhost:5173 | 5173 |
| Python DSS Engine | http://localhost:8000 | 8000 |
| DSS Swagger UI | http://localhost:8000/docs | — |
| GIS Processing | http://localhost:8003 | 8003 |
| MQTT Broker | localhost:1883 | 1883 |

---

## 10. Urutan Startup yang Benar

Untuk sistem berjalan dengan baik, urutan startup yang disarankan:
1. ✅ Pastikan Supabase database accessible
2. ✅ Jalankan MQTT Broker (Mosquitto)
3. ✅ Jalankan Redis (jika menggunakan GIS routing)
4. ✅ Jalankan BackEnd Node.js
5. ✅ Jalankan Python DSS Service
6. ✅ (Opsional) Jalankan GIS Processing + ARQ Worker
7. ✅ Jalankan FrontEnd React

Helper scripts tersedia di root `/src`:
```bash
./0-dev-docker.sh   # Start Docker services (MQTT, Redis, dll.)
./1-dev-be.sh       # Start BackEnd
./2-dev-fe.sh       # Start FrontEnd
./3-model-dss.sh    # Start Python Model Service
```

---

## 11. Troubleshooting Umum

**BackEnd tidak bisa connect ke database:**
```bash
# Cek format DATABASE_URL
# Pastikan IP Supabase tidak di-block firewall
# Test koneksi:
psql $DATABASE_URL -c "SELECT version();"
```

**DSS Engine tidak bisa dipanggil dari BackEnd:**
```bash
# Cek apakah Python service berjalan
curl http://localhost:8000/health

# Cek DECISION_ENGINE_URL di BackEnd .env
# Cek CORS: SERVER1_URL di Model .env harus = URL BackEnd
```

**Error PostGIS / TimescaleDB tidak tersedia:**
```bash
# Aktifkan ekstensi via Supabase dashboard:
# Project Settings → Database → Extensions
# Cari "PostGIS" dan "TimescaleDB" → Enable
```

**MQTT tidak menerima data sensor:**
```bash
# Cek broker MQTT berjalan
mosquitto_sub -h localhost -t "#" -v   # Monitor semua topik

# Cek topic format device: field/{field_id}/sensor/{device_code}
# Cek BackEnd .env: MQTT_BROKER_URL
```
