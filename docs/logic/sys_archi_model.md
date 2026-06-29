# 🧠 Arsitektur Spesifik Bagian: Model DSS Engine
> **Update:** 29 Juni 2026 — Isolasi Komponen Internal Python Decision Support System

## 1. Batasan & Fokus Ruang Lingkup

Dokumen ini menjelaskan rancangan internal layanan evaluasi agronomi **Model DSS** (`src/Model`) secara terisolasi. Fokus diarahkan pada validasi skema Pydantic v2, matriks keputusan AWD berjenjang, 5 mekanisme pertahanan (resilience layers), kalkulator skor prioritas, serta pipeline pengujian fuzz dan blackbox internal.

---

## 2. Diagram Arsitektur Internal Model DSS

```mermaid
graph TD
    subgraph FastAPI_Core ["⚡ FastAPI Entrypoint (app/main.py)"]
        Main["main.py\n(FastAPI App + CORS + Lifecycle)"]
        Router["router.py\n(POST /evaluate Endpoint)"]
        Main --> Router
    end

    subgraph Schema_Validation ["🛡️ Pydantic v2 Strict Shields (schemas.py)"]
        InputSchema["EvaluateRequest Schema\n• SubBlockInputPayload\n• WeatherForecastSnapshot\n• RuleProfilePayload\n• ManagementFlags"]
        OutputSchema["EvaluateResponse Schema\n• RecommendationResult[]\n• Priority Rank & Score"]
        Router --> InputSchema
    end

    subgraph Decision_Matrix ["⚙️ Core Engine Logic (engine.py)"]
        Engine["evaluate_field()\n(Iterasi & Evaluasi Per Sub-Block)"]
        
        subgraph Defense_Layers ["🛡️ 5 Defense Mechanisms"]
            L1["1. Hysteresis Guard\n(Cegah Ping-Pong Pompa Air)"]
            L2["2. Night Block\n(Snooze Irigasi Malam 18:00-05:00)"]
            L3["3. Pre-emptive Drain\n(Kuras Lahan Sebelum Hujan Lebat >50mm)"]
            L4["4. Snooze / Maintenance\n(Abaikan Jika Ada Flag Aktif)"]
            L5["5. Drought Override\n(Paksa Irigasi Saat Siaga Kekeringan)"]
        end

        InputSchema --> Engine
        Engine --> L1 --> L2 --> L3 --> L4 --> L5
    end

    subgraph Priority_Scorer ["🎯 Scorer & Ranking Engine (scorer.py)"]
        Scorer["compute_priority_score()\n(Bobot Defisit Air × Bobot Fase Tanam × Cuaca)"]
        L5 --> Scorer
        Scorer --> OutputSchema
    end

    subgraph Testing_Pipeline ["🧪 Internal Verification Suite"]
        TestDSS["test_dss.py\n(Unit Tests)"]
        Blackbox["blackbox_test_dss.py\n(Edge Cases Verification)"]
        Fuzz["fuzz_dss.py\n(640 Randomized Scenario Generator\n100% Pass Guaranteed)"]
        Engine -.-> Fuzz
    end
```

---

## 3. Komponen Utama Internal

### A. Strict Input Validation (`app/modules/decision_engine/schemas.py`)
Layanan ini dibangun di atas **Pydantic v2** dengan tipe data sangat ketat. Skema `EvaluateRequest` menjamin bahwa parameter agronomi seperti tinggi air (`water_level_cm`), ambang batas AWD (`awd_lower_threshold_cm`), dan intensitas hujan dipastikan bertipe angka valid. Jika terdapat data anomali atau *NaN*, request ditolak di pintu masuk sebelum membebani CPU engine keputusan.

### B. Matriks Keputusan 5-Dimensi (`engine.py`)
Inti dari DSS adalah fungsi `evaluate_field()`. Fungsi ini tidak sekadar melihat apakah air di sawah sedang kering atau basah, melainkan mengevaluasi matrix 5-dimensi secara simultan:
1. **Kondisi Air Lahan aktual vs Target optimal.**
2. **Fase Pertumbuhan Padi (HST):** Vegetatif, Primordia, atau Pematangan.
3. **Prediksi Cuaca BMKG:** Apakah akan ada kejadian hujan lebat dalam waktu dekat.
4. **Kondisi Sumber Air (Depleted / Normal).**
5. **Flag Intervensi Manusia (Maintenance / Snooze).**

### C. 5 Mekanisme Pertahanan (Resilience Layers)
Untuk mencegah kesalahan rekomendasi yang merugikan petani atau memboroskan listrik pompa, engine melewati 5 filter berurutan:
- **Hysteresis Guard:** Memberi *buffer* toleransi (misal $\pm 1$ cm) agar pompa tidak mati-nyala berulang kali saat tinggi air berada pas di batas ambang.
- **Night Block:** Menunda rekomendasi irigasi rutin di larut malam (18:00–05:00) kecuali terjadi kondisi darurat kekeringan ekstrem.
- **Pre-emptive Drain:** Mengeluarkan rekomendasi `DRAIN` (buang air) jika BMKG memprediksi hujan lebat ($>50$ mm) dalam 12 jam ke depan, guna menyediakan kapasitas tampung sawah.
- **Snooze / Maintenance Override:** Menghentikan semua evaluasi pada petak yang sedang mengalami perbaikan tanggul atau penyemprotan pupuk.
- **Drought Override:** Mengabaikan blok malam dan aturan AWD standar jika tinggi air menyentuh batas kritis siaga kekeringan (`drought_alert_cm`).

### D. Priority Scorer (`scorer.py`)
Setelah jenis rekomendasi (`IRRIGATE`, `DRAIN`, `MAINTAIN`) ditentukan untuk setiap petak, modul ini menghitung `priority_score` (angka desimal). Petak dengan defisit air paling parah pada fase primordia (fase paling sensitif air) akan diberi skor tertinggi agar diprioritaskan oleh sistem routing air.

### E. Fuzz Testing Pipeline (`fuzz_dss.py`)
Keandalan engine diuji secara otomatis menggunakan generator skenario acak (`fuzz_dss.py`). Skrip ini membangkitkan 640 kombinasi ekstrem (air -15cm hingga +20cm, cuaca badai/kering, HST 0 hingga 120). Seluruh 640 skenario lulus tanpa *unhandled exception*, memastikan stabilitas di production.
