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

## 7. GIS Processing Service (Termasuk Docker Infrastructure)

Service GIS (`gis_risang/ricemesh-gis-processing`) mencakup:
- **Docker Compose:** Start EMQX (MQTT Broker), Redis, MongoDB — **wajib untuk seluruh sistem**
- **FastAPI Server:** Floyd-Warshall API + Video Ops + WebODM management (port **8001**)
- **ARQ Worker:** Background video processing (upload/parse frame drone video)

> ⚠️ **PENTING:** EMQX broker berjalan DI DALAM Docker GIS project ini. Tanpa `docker compose up`, BackEnd tidak bisa menerima data MQTT dari ESP8266!

```bash
# Prasyarat: Docker Desktop berjalan

# Start semua infrastruktur (EMQX, Redis, MongoDB)
cd d:\PROTEL\gis_risang\ricemesh-gis-processing
docker compose up -d         # Start EMQX (1883), Redis (6379), MongoDB (27017)

# Setup Python GIS
python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Mac/Linux
pip install -e .[dev]        # atau: uv sync

# Jalankan FastAPI service (Port 8001)
cd src
uvicorn server.server:gisProc --reload --port 8001

# Jalankan ARQ Worker (di terminal terpisah) — untuk video processing drone
arq arq_worker.settings.WorkerSettings
```

**Environment GIS `.env` penting:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
EMQX_MQTT_HOST=localhost
EMQX_MQTT_PORT=1883
EMQX_MQTT_USER=admin
EMQX_MQTT_PASS=public
RICEMESH_API_HOST=http://localhost:3000   # Server 1 — untuk device bootstrap
RICEMESH_API_EMAIL=admin@smartawd.id
RICEMESH_API_PASS=DevPassword123!
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

Urutan startup yang WAJIB diikuti:
1. ✅ **GIS Docker:** `docker compose up -d` di `gis_risang/ricemesh-gis-processing/` → start EMQX, Redis, MongoDB
2. ✅ Pastikan Supabase database accessible
3. ✅ Jalankan **Server 2 (Python DSS):** `uvicorn app.main:app --port 8000`
4. ✅ Jalankan **Server 1 (BackEnd Node.js):** `npm run dev` → auto-connect EMQX, start scheduler
5. ✅ Jalankan **Server 3 (GIS FastAPI):** `uvicorn server.server:gisProc --port 8001` → auto-login Server 1, fetch device topics, subscribe EMQX
6. ✅ (Opsional) Jalankan **ARQ Worker** (untuk video drone): `arq arq_worker.settings.WorkerSettings`
7. ✅ Jalankan **FrontEnd React:** `npm run dev` (port 5173)

> ⚠️ Server 3 HARUS start setelah Server 1 — karena Server 3 login ke Server 1 untuk fetch device topics saat startup.

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
