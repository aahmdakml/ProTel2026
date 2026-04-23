# Smart AWD — Intelligent Irrigation & Precision Mapping Platform

Smart AWD adalah platform sistem pendukung keputusan (DSS) berbasis IoT dan GIS untuk pengelolaan irigasi sawah menggunakan metode **Alternate Wetting and Drying (AWD)**. Platform ini menggabungkan monitoring sensor air secara real-time dengan citra drone resolusi tinggi (Orthophoto) untuk pemetaan petak sawah yang presisi.

## 🚀 Fitur Utama

- **Real-time Monitoring**: Visualisasi tingkat ketinggian air dan status sensor IoT di setiap petak sawah.
- **Decision Support System (DSS)**: Rekomendasi irigasi otomatis berdasarkan fase pertumbuhan tanaman dan ambang batas AWD.
- **2D Precision Mapping**: Integrasi citra drone (Orthophoto) sebagai base-layer peta lahan.
- **Irregular Polygon Drawing**: Fitur menggambar batas petak sawah (sub-blocks) secara bebas sesuai kontur asli lahan.
- **Orthomosaic Management**: Manajemen aset citra udara dan konversi otomatis ke format Cloud Optimized GeoTIFF (COG).

---

## 🏗️ Arsitektur Sistem

Proyek ini terdiri dari tiga komponen utama:

1.  **BackEnd**: Node.js/Express (TypeScript) — API utama, manajemen master data, autentikasi, dan koordinasi aset.
2.  **FrontEnd**: React (Vite + Tailwind CSS) — Dashboard interaktif dan alat pemetaan berbasis OpenLayers.
3.  **Model**: FastAPI (Python) — Engine pemrosesan citra udara, server tile (TiTiler), dan logika DSS kompleks.

---

## 🛠️ Instalasi & Persiapan

### Prasyarat
- Node.js v18+
- Python 3.11+
- PostgreSQL (dengan ekstensi PostGIS & TimescaleDB)
- Cloudflare R2 (atau S3-compatible storage)

---

### 1. BackEnd Setup

```bash
cd BackEnd
npm install
cp .env.example .env
# Sesuaikan isi .env (DATABASE_URL, JWT_SECRET, R2_CONFIG)
npm run db:push     # Setup skema database
npm run seed:admin  # Buat user admin default
npm run dev         # Jalankan server development
```

### 2. FrontEnd Setup

```bash
cd FrontEnd
npm install
# Buat file .env jika perlu (VITE_API_URL default ke http://localhost:3000)
npm run dev
```

### 3. Model Service Setup

```bash
cd Model
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Sesuaikan isi .env (DATABASE_URL, R2_ENDPOINT)
uvicorn src.main:app --reload
```

---

## ⚙️ Konfigurasi Environment

### Backend (`.env`)
| Variabel | Deskripsi |
| :--- | :--- |
| `DATABASE_URL` | Koneksi PostgreSQL (PostGIS) |
| `JWT_SECRET` | Secret key untuk token keamanan |
| `R2_ENDPOINT` | Endpoint Cloudflare R2 untuk penyimpanan citra |

### Model Service (`.env`)
| Variabel | Deskripsi |
| :--- | :--- |
| `AWS_ACCESS_KEY_ID` | R2 Access Key untuk akses citra udara |
| `AWS_SECRET_ACCESS_KEY` | R2 Secret Key |
| `SERVER1_URL` | URL callback ke API utama |

---

## 📄 Dokumentasi Tambahan

- **[Dokumentasi Teknis](dokumentasi%20teknis%20sementara.md)**: Detail skema database dan alur logika sistem.
- **[Sistem Full Overview](system_full.md)**: Gambaran menyeluruh kapabilitas platform.

## 🤝 Kontribusi

Push ke repository ini harus melalui pull request dan telah diuji secara lokal. Pastikan skema database tetap sinkron menggunakan `drizzle-kit`.

---
*Developed for Smart Agriculture Management.*
