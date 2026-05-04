<div align="center">

# 🌾 ProTel — Smart AWD Precision Agriculture Platform

**Platform Sistem Pendukung Keputusan (DSS) berbasis IoT & GIS untuk pengelolaan irigasi sawah menggunakan metode Alternate Wetting and Drying (AWD)**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+PostGIS+TimescaleDB-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)

</div>

---

## 📋 Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Setup Detail](#setup-detail)
- [Environment Variables](#environment-variables)
- [Database Scripts](#database-scripts)
- [Struktur Proyek](#struktur-proyek)
- [Kontribusi](#kontribusi)

---

## 🎯 Tentang Proyek

**ProTel (Precision Telemetry)** adalah platform monitoring dan DSS untuk pertanian padi berbasis AWD. Sistem mengintegrasikan:

- **Sensor IoT** (AWD Water Level Sensor) yang mengukur ketinggian air secara real-time
- **Decision Support System** berbasis aturan agronomis dan data cuaca BMKG
- **Peta 2D Presisi** dari citra drone (Orthophoto/Orthomosaic)
- **Rekomendasi Otomatis** untuk tindakan irigasi/drainase per petak sawah

> **Metode AWD (Alternate Wetting and Drying)** terbukti menghemat air 15-30% sekaligus mempertahankan hasil panen setara irigasi terus-menerus.

---

## ✨ Fitur Utama

### 📊 Dashboard & Monitoring
- Ringkasan status lahan, peringatan aktif, dan kondisi sensor real-time
- Statistik siklus tanam aktif dan rata-rata ketinggian air per field

### 🗺️ Field Map 2D
- Visualisasi spasial petak sawah (sub-block) menggunakan **OpenLayers**
- Overlay citra drone (Orthomosaic / Cloud Optimized GeoTIFF)
- Klik poligon → Slide-out drawer riwayat telemetri per petak
- Grafik historis multi-parameter: Tinggi Air, Suhu, Kelembapan

### 🤖 DSS (Decision Support System)
- Rekomendasi irigasi/drainase otomatis berbasis fase pertumbuhan padi
- 8 fase pertumbuhan × 4 varietas (Early/Medium Early/Medium/Late)
- Skor prioritas dan tingkat keyakinan (High/Medium/Low)
- Riwayat rekomendasi dan log feedback operator

### ✅ Penugasan Operasional
- Daftar tugas lapangan aktif untuk operator/petani
- Filter per jenis tindakan (Pengairan/Drainase/Pantau/Waspada)
- Modal konfirmasi dengan catatan lapangan
- Riwayat tindakan lengkap dengan tabel terstruktur

### 🔧 Master Data
- Manajemen Lahan Sawah (Fields) dengan polygon GeoJSON
- Profil Aturan DSS (Rule Profiles) per bucket varietas & fase
- Siklus Tanam (Crop Cycles) dengan advance phase workflow
- Hardware Device & Assignment ke sub-block

### 👤 Profil & Pengaturan
- Edit profil pengguna & ganti password
- Pengaturan sistem: URL eksternal (BMKG, Cloudflare R2, Decision Engine)
- Manajemen API key per administrator

---

## 🏗️ Arsitektur Sistem

```
┌──────────────────────────────────────────────────────────┐
│                      CLIENT BROWSER                       │
│              React + Vite + OpenLayers                    │
│                   (FrontEnd — port 5173)                  │
└────────────────────────┬─────────────────────────────────┘
                         │ REST API (JSON)
┌────────────────────────▼─────────────────────────────────┐
│                    EXPRESS API SERVER                      │
│            Node.js + TypeScript + Drizzle ORM             │
│                   (BackEnd — port 3000)                   │
│                                                           │
│  Modules: auth · master-data · telemetry · recommendations│
│           dashboard · map-visual · orthomosaic · archive  │
│           assignments · system-settings · scheduler       │
└──────────┬─────────────────────────┬─────────────────────┘
           │                         │
┌──────────▼──────────┐   ┌──────────▼─────────────────────┐
│  PostgreSQL 16       │   │   Python Model Service          │
│  + PostGIS           │   │   FastAPI + TiTiler             │
│  + TimescaleDB       │   │   (Model — port 8000)           │
│  (4 schema: mst/trx/ │   │                                 │
│   sys/logs, 41 tbl)  │   │  Decision Engine · GDAL/Rasterio│
└─────────────────────┘   └─────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, OpenLayers, Recharts |
| **Backend** | Node.js 20, Express, TypeScript, Drizzle ORM, Zod, Pino |
| **Database** | PostgreSQL 16 + PostGIS + TimescaleDB |
| **Model/AI** | Python 3.11, FastAPI, GDAL, Rasterio, TiTiler |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Auth** | JWT (Access + Refresh Token) |
| **Deployment** | Docker + Docker Compose |

---

## ⚡ Quick Start

### Prasyarat

- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://docker.com)
- [Python 3.11+](https://python.org)

### 1. Clone

```bash
git clone <repository-url>
cd ProTel/src
```

### 2. Jalankan Database via Docker

```bash
# Di root direktori (ada docker-compose.yml)
docker-compose up -d

# Tunggu ~10 detik hingga TimescaleDB siap
docker-compose ps
```

### 3. Setup Backend (sekali jalan)

```bash
cd BackEnd
npm install
cp .env.example .env
# Edit .env → isi DATABASE_URL, JWT_SECRET
```

```bash
# Setup database: schema + seed reference data + dummy dev data
npm run db:setup:dev

# Buat user admin
ADMIN_PASSWORD=RahasiaKuat123! npm run seed:admin
```

```bash
# Jalankan server
npm run dev
```

### 4. Setup Frontend

```bash
cd ../FrontEnd
npm install
npm run dev
```

### 5. Akses Aplikasi

| Service | URL |
|---|---|
| Frontend Dashboard | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| API Health Check | http://localhost:3000/health |

---

## 📦 Setup Detail

### Backend

```bash
cd BackEnd
npm install
cp .env.example .env
```

Isi minimal di `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smartawd_db
JWT_SECRET=<output dari: openssl rand -hex 32>
```

#### Database Scripts

| Command | Fungsi |
|---|---|
| `npm run db:migrate` | Buat schema dari nol (schema.sql → 41 tabel) |
| `npm run db:seed` | Seed data referensi wajib (idempotent) |
| `npm run db:seed:dev` | Seed dummy data development |
| `npm run db:setup` | `migrate` + `seed` (untuk production) |
| `npm run db:setup:dev` | `migrate` + `seed` + `seed:dev` (untuk development) |
| `npm run db:reset` | ⚠️ DEV ONLY: Drop semua & recreate |
| `npm run seed:admin` | Buat user `system_admin` pertama |
| `npm run db:studio` | Buka Drizzle Studio (GUI DB) |

#### Workflow Database (Developer Baru)

```
database baru  →  npm run db:setup:dev  →  npm run seed:admin  →  npm run dev
```

### Frontend

```bash
cd FrontEnd
npm install
npm run dev       # Development server → http://localhost:5173
npm run build     # Production build
```

Buat `.env` jika backend tidak di localhost:

```env
VITE_API_URL=http://localhost:3000
```

### Model Service (Python)

```bash
cd Model
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # Mac/Linux

pip install -r requirements.txt
cp .env.example .env
uvicorn src.main:app --reload --port 8000
```

---

## 🔑 Environment Variables

### Backend (`BackEnd/.env`)

| Variable | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | ✅ | Minimal 32 karakter (generate: `openssl rand -hex 32`) |
| `PORT` | | Default: `3000` |
| `NODE_ENV` | | `development` / `production` |
| `CORS_ORIGIN` | | Default: `http://localhost:5173` |
| `DECISION_ENGINE_URL` | | URL Model Service, default: `http://localhost:8000` |
| `R2_ENDPOINT` | | Cloudflare R2 endpoint untuk orthomosaic |
| `R2_ACCESS_KEY_ID` | | R2 API Token ID |
| `R2_SECRET_ACCESS_KEY` | | R2 API Token Secret |
| `R2_BUCKET_NAME` | | Nama bucket R2 |

### Admin Seed (`npm run seed:admin`)

```bash
ADMIN_EMAIL=admin@smartawd.id \
ADMIN_PASSWORD=RahasiaKuat123! \
ADMIN_NAME="System Administrator" \
npm run seed:admin
```

---

## 📁 Struktur Proyek

```
src/
├── BackEnd/                    # Express API Server
│   ├── database/
│   │   ├── schema.sql          # Schema utama (41 tabel, PostGIS, TimescaleDB)
│   │   └── migrations/         # Migration files terurut
│   ├── src/
│   │   ├── db/schema/          # Drizzle ORM schema (mst.ts, trx.ts, logs.ts)
│   │   ├── modules/            # Feature modules
│   │   │   ├── auth/           # JWT authentication
│   │   │   ├── master-data/    # Fields, sub-blocks, devices, cycles, rules
│   │   │   ├── telemetry/      # IoT data ingest & query
│   │   │   ├── recommendations/# DSS output + assignments
│   │   │   ├── dashboard/      # Aggregated stats
│   │   │   ├── map-visual/     # Map layer data
│   │   │   ├── orthomosaic/    # Drone image management
│   │   │   └── system-settings/# Admin config
│   │   ├── scripts/            # Database scripts
│   │   │   ├── migrate.ts      # Schema migration runner
│   │   │   ├── reset.ts        # DEV: drop & recreate
│   │   │   ├── seed.ts         # Reference data seed
│   │   │   ├── seed-dev.ts     # Development dummy data
│   │   │   └── seed-admin.ts   # Admin user creation
│   │   └── middleware/         # Auth, RBAC, validation, error handling
│   ├── .env.example
│   ├── SETUP.md                # Panduan setup detail
│   └── package.json
│
├── FrontEnd/                   # React Dashboard
│   └── src/
│       ├── pages/
│       │   ├── dashboard.tsx
│       │   ├── monitoring/
│       │   │   ├── map.tsx     # 2D field map + telemetry charts
│       │   │   └── sub-blocks.tsx
│       │   ├── recommendations/
│       │   │   ├── dss.tsx     # DSS output & alerts
│       │   │   └── history.tsx
│       │   ├── master/         # CRUD master data
│       │   ├── tasks.tsx       # Operational assignments
│       │   ├── profile.tsx
│       │   └── settings.tsx
│       └── layout/             # Sidebar, Header, MainLayout
│
└── Model/                      # Python DSS & Ortho Service
    └── src/
        └── main.py             # FastAPI entry point
```

---

## 🗄️ Skema Database

Database menggunakan 4 schema PostgreSQL:

| Schema | Keterangan | Tabel |
|---|---|---|
| `mst` | Master / Reference data | users, fields, sub_blocks, devices, rule_profiles, crop_cycles, ... |
| `trx` | Transactional data | telemetry_records (hypertable), recommendations, alerts, ... |
| `sys` | System internals | decision_jobs, scheduler, engine_configs, integration_configs |
| `logs` | Audit & observability | api_requests, auth_logs, activity_logs, data_change_audit |

> `telemetry_records` adalah **TimescaleDB hypertable** — dipartisi otomatis per waktu untuk query time-series yang efisien.

---

## 🔐 Role & Akses

| Role | Keterangan |
|---|---|
| `system_admin` | Akses penuh semua fitur & settings |
| `field_manager` | Kelola field tertentu, lihat semua data |
| `operator` | Lihat monitoring & respons tugas lapangan |

---

## 🚨 Troubleshooting

**Schema "mst" sudah ada saat `db:migrate`**
```bash
# Gunakan reset (DEV) atau skip jika sudah punya data
npm run db:reset   # ⚠️ HAPUS SEMUA DATA!
```

**Koneksi database gagal**
```bash
docker ps                    # Pastikan container running
docker-compose logs db       # Lihat log database
```

**`ADMIN_PASSWORD` env var wajib diisi**
```bash
ADMIN_PASSWORD=RahasiaKuat123! npm run seed:admin
```

**Frontend tidak bisa connect ke API**
```bash
# Pastikan CORS_ORIGIN di backend .env sesuai
CORS_ORIGIN=http://localhost:5173
```

---

## 🤝 Kontribusi

1. Buat branch baru: `git checkout -b feature/nama-fitur`
2. Lakukan perubahan & test lokal
3. Pastikan schema tetap sinkron jika ada perubahan DB
4. Buat Pull Request ke branch `main`

> **Penting**: Jangan commit file `.env` ke repository. Gunakan `.env.example` sebagai template.

---

<div align="center">

**Dikembangkan untuk Smart Agriculture Management**

*ProTel v1.0 — 2026*

</div>
