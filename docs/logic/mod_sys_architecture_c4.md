# 🏗️ Arsitektur Sistem (C4 Model) — Smart AWD
> **Update:** 29 Juni 2026 — Ditulis ulang berdasarkan inspeksi langsung source code aktual

---

## 1. Dua Server Terpisah

Berdasarkan kode sumber, sistem terdiri dari **dua server utama** yang disebut:
- **Server 1** = BackEnd Node.js/Express (`src/BackEnd`) → Port **3000**
- **Server 2** = Model Service Python/FastAPI (`src/Model`) → Port **8000**

Ditambah **satu proyek GIS terpisah** (`gis_risang/ricemesh-gis-processing`) → Port **8001** (default dari `GISPROC_API_BASE_URI`).

---

## 2. Diagram C4 — Arsitektur Aktual

```mermaid
graph TD
    %% ═══════════════ ENTITAS EKSTERNAL ═══════════════
    Operator(["👤 Operator / Petani\n(Browser)"])
    Drone(["🚁 DJI Drone\n(Upload foto JPG)"])
    
    subgraph Hardware ["📡 Perangkat IoT — RiceMesh Network"]
        STM32_TX["STM32 Node Transmitter\n(HC-SR04 ultrasonik)\n×3 unit"]
        STM32_RX["STM32 Node Receiver\n(BMP280 suhu+tekanan)"]
        ESP8266["ESP8266 Gateway\n(WiFi + MQTT publisher)"]
        STM32_TX -->|"nRF24L01+ RF 2.4GHz"| STM32_RX
        STM32_RX -->|"UART 115200 baud"| ESP8266
    end

    BMKG(["⛈️ BMKG Open API\n(api.bmkg.go.id/prakiraan-cuaca\nper adm4_code kelurahan)"])

    %% ═══════════════ INFRASTRUKTUR DOCKER (GIS) ═══════════════
    subgraph Docker_GIS ["🐳 Docker — GIS Processing Cluster\n(gis_risang/ricemesh-gis-processing)"]
        EMQX["EMQX Broker\n(emqx/emqx:5.8)\nPort 1883 TCP\nPort 8083 WebSocket\nPort 18083 Dashboard"]
        Redis["Redis 7.2\nPort 6379\n(ARQ Job Queue +\nMQTT message cache)"]
        MongoDB["MongoDB 7.0\nPort 27017\n(Video/Drone assets)"]
    end

    %% ═══════════════ SERVER 1: BACKEND NODE.JS ═══════════════
    subgraph Server1 ["⚙️ SERVER 1 — BackEnd (Node.js/Express)\nsrc/BackEnd → Port 3000"]
        MQTT_Listener["📡 mqtt.service.ts\n(Internal MQTT subscriber)\nSubscribe ke: sensor/data\nKonversi d→cm via kalibrasi"]
        Scheduler["🕐 Scheduler (node-cron)\n5 jobs terdaftar:\n• state_builder: */10\n• stale_flag: */15\n• decision_cycle: */30\n• bmkg_sync: 0 */3\n• hst_updater: 0 0"]
        API_Routes["🛣️ API Routes (Express)\n/health, /auth, /fields\n/sub-blocks, /devices\n/embankments, /crop-cycles\n/ingest/batch, /telemetry\n/recommendations, /alerts\n/assignments, /dashboard\n/orthomosaic, /map-layers\n/system-settings, dll"]
        Engine_Client["🔗 engine-client.service.ts\n(Kirim payload ke Server 2\nvia POST DECISION_ENGINE_URL/evaluate)\nTimeout: 30 detik"]
        Routing_Svc["🗺️ routing.service.ts\n(Orkestrasi Floyd-Warshall)\nPanggil GIS: POST /api/floydwarshall/run\nlalu /api/floydwarshall/matrix"]
        State_Builder["📊 state-builder.service.ts\n(Hitung state + K-NN interpolasi\nper sub-block)"]
    end

    %% ═══════════════ SERVER 2: MODEL PYTHON DSS ═══════════════
    subgraph Server2 ["🧠 SERVER 2 — Model Service (Python/FastAPI)\nsrc/Model → Port 8000"]
        DSS_Engine["🤖 Decision Engine\n(POST /evaluate)\nRule-based AWD logic\n5 defense layers\n640 fuzz test pass"]
    end

    %% ═══════════════ SERVER 3: GIS PROCESSING (Python) ═══════════════
    subgraph Server3 ["📐 SERVER 3 — GIS Processing (Python/FastAPI)\ngis_risang/ricemesh-gis-processing → Port 8001"]
        GIS_API["🔗 FastAPI Server\n(src/server/server.py)"]
        GIS_MQTT["📡 MQTT Listener\n(aiomqtt — subscribe\ndari EMQX broker)\nCache payload ke Redis"]
        GIS_Routes["🛣️ Routers:\n• /api/floydwarshall/run\n• /api/floydwarshall/reconstruct\n• /api/floydwarshall/matrix\n• /api/video-ops/*\n• /webodm/*\n• /api/mqtt/*\n• /api/redis/*\n• /api/job-log/*"]
        ARQ_Worker["⏱️ ARQ Worker\n(arq arq_worker.settings.WorkerSettings)\nJobs: upload_video, parse_video\ndownload_parsed_frames\nprocess_webodm_video\nmax_jobs=10, timeout=2jam"]
        Device_Bootstrap["🔧 device_bootstrap.py\n(Startup: login ke Server 1\nGET /devices → ambil semua topic\nlalu subscribe MQTT)"]
    end

    %% ═══════════════ DATABASE ═══════════════
    subgraph Database ["🗄️ Database — Supabase Cloud"]
        PG["PostgreSQL 16 + PostGIS\n+ TimescaleDB\n(Schema: mst, trx, sys, logs)\nDrizzle ORM di Server 1"]
    end

    %% ═══════════════ CLOUD STORAGE ═══════════════
    subgraph Cloud ["☁️ Cloud Storage"]
        R2["Cloudflare R2\n(Object Storage S3-compatible)\nCOG .tif orthomosaic"]
        TiTiler["🗺️ TiTiler\n(COG tile server)\nServe XYZ Tiles"]
    end

    subgraph WebODM_Cluster ["🏗️ WebODM\n(Docker — Lokal)"]
        WebODM["WebODM\n(Fotogrametri Drone)"]
    end

    %% ═══════════════ FRONTEND ═══════════════
    FE["🖥️ FrontEnd\n(React 18 + Vite + OpenLayers)\nPort 5173"]

    %% ═══════════════ ALIRAN DATA ═══════════════

    %% IoT → EMQX → Server1 MQTT Listener
    ESP8266 -->|"Publish JSON: {device:[{id,d}], temperature, pressure}\nTopic: sensor/data"| EMQX
    EMQX -->|"Subscribe MQTT\n(mqtt.connect via MQTT_URL)"| MQTT_Listener

    %% GIS Server juga subscribe EMQX (lewat device_bootstrap)
    Server1 -->|"Startup: GET /auth/login + GET /devices\n(ambil daftar MQTT topic)"| Device_Bootstrap
    Device_Bootstrap -->|"Subscribe semua device topic\n(aiomqtt)"| EMQX
    EMQX -->|"Forward message per topic\n→ cache ke Redis"| GIS_MQTT

    %% Operator → FE → Server1
    Operator -->|"Browser — HTTP"| FE
    FE <-->|"REST API (JSON)\nPort 3000"| API_Routes

    %% BMKG → Server1
    BMKG -->|"HTTP GET setiap 3 jam\n(per adm4_code)"| Scheduler

    %% Drone → WebODM → R2 → TiTiler → FE
    Drone -->|"Upload 300+ foto JPG\n(via GIS /webodm/task)"| GIS_Routes
    GIS_Routes <-->|"Manage projects & tasks"| WebODM
    WebODM -->|"Export COG .tif"| R2
    R2 -->|"S3 Byte-Range Read"| TiTiler
    TiTiler -->|"Serve XYZ Tiles"| FE

    %% Server1 cron: decision cycle
    Scheduler -->|"*/30 menit:\nrefresh state → kirim payload"| Engine_Client
    Engine_Client -->|"POST /evaluate\n(payload: sub_blocks + weather + flags)"| DSS_Engine
    DSS_Engine -->|"JSON response:\nrecommendations[]"| Engine_Client
    Engine_Client -->|"Trigger routing setelah save recs"| Routing_Svc
    Routing_Svc -->|"POST /api/floydwarshall/run\n(nodes[], edges[], directed=true)"| GIS_Routes
    GIS_Routes -->|"POST /api/floydwarshall/matrix\n(source, target index)"| GIS_Routes

    %% State builder
    Scheduler -->|"*/10 menit"| State_Builder
    State_Builder <-->|"Read/Write state"| PG

    %% Video ops: ARQ worker
    GIS_Routes -->|"Enqueue ARQ job\n(upload_video, parse_video)"| Redis
    Redis -->|"Dequeue & execute"| ARQ_Worker
    ARQ_Worker <-->|"Read/Write video assets"| MongoDB

    %% DB connections
    MQTT_Listener <-->|"DB lookup: device+calibration\ninsert telemetry_records"| PG
    API_Routes <-->|"Read/Write semua entity master\n& transaksional"| PG
    Engine_Client <-->|"Read sub_block_current_states\nWrite irrigation_recommendations"| PG
    GIS_Routes -->|"Enqueue Floyd-Warshall compute"| Redis
```

---

## 3. Koreksi Penting vs Dokumentasi Sebelumnya

| Aspek | ❌ Dokumentasi Lama (Salah) | ✅ Aktual (Benar) |
|---|---|---|
| **MQTT Broker** | "Mosquitto" | **EMQX 5.8** (via Docker, port 1883/8083/18083) |
| **GIS Port** | "Port 8003" | **Port 8001** (`GISPROC_API_BASE_URI=http://localhost:8001`) |
| **GIS Database** | "Redis untuk queue Floyd-Warshall" | **MongoDB** untuk video assets, **Redis** untuk ARQ queue & MQTT cache |
| **GIS Fungsi** | "Hanya Floyd-Warshall" | Floyd-Warshall + **Video Ops** (upload/parse drone video) + WebODM management + MQTT listener |
| **Ingest IoT** | "Backend subscribe MQTT, batch insert" | Backend subscribe `sensor/data`, konversi raw→cm, insert via `processBatch()`. **GIS JUGA subscribe** semua device topic dari EMQX setelah login ke Server 1 saat startup. |
| **ARQ Worker** | "Floyd-Warshall worker" | ARQ Worker di GIS bertugas **video processing** (upload_video, parse_video, process_webodm_video). **Floyd-Warshall SYNCHRONOUS** — dipanggil langsung di-thread oleh `/api/floydwarshall/run` tanpa ARQ. |
| **FrontEnd calling GIS** | "FE tidak akses GIS" | `/webodm/*` route di GIS — **FE bisa langsung** manage WebODM projects. |
| **Framework** | "Node.js + NestJS" | **Node.js + Express** (bukan NestJS) |
| **Device Bootstrap** | Tidak ada di docs lama | GIS service **login ke Server 1** saat startup, ambil semua device topics, lalu subscribe ke EMQX. |

---

## 4. Detail Aliran Keputusan AWD (Decision Cycle — tiap 30 menit)

```mermaid
sequenceDiagram
    participant Cron as Scheduler (Server 1)
    participant EC as engine-client.service
    participant DB as PostgreSQL
    participant BMKG as BMKG API
    participant DSS as Server 2 (DSS /evaluate)
    participant GIS as Server 3 (/api/floydwarshall)

    Cron->>EC: runDecisionCycleJob() - setiap 30 menit
    EC->>DB: INSERT decision_jobs {status: 'pending'}
    EC->>DB: buildFieldStates() - refresh state semua sub-block
    EC->>DB: SELECT fields, sub_blocks, crop_cycles, rule_profiles
    EC->>DB: SELECT management_events (snooze, override flags)
    EC->>DB: SELECT weather_forecast_snapshots (latest, is_stale)
    EC->>DSS: POST /evaluate (payload lengkap JSON)
    DSS-->>EC: recommendations[] {type, score, command_text}
    EC->>DB: INSERT irrigation_recommendations
    EC->>DB: UPDATE decision_jobs {status: 'completed'}
    EC->>GIS: POST /api/floydwarshall/run (nodes, edges)
    GIS-->>EC: {dist[][], successor[][]}
    EC->>GIS: POST /api/floydwarshall/matrix (source_idx, target_idx)
    GIS-->>EC: {path[], weight}
    EC->>DB: UPDATE irrigation_recommendations SET route_path_ids
```

---

## 5. Detail GIS Processing Service (`ricemesh-gis-processing`)

GIS service ini adalah proyek independen di `gis_risang/` dengan arsitektur internal sendiri:

```
ricemesh-gis-processing/
├── docker-compose.yml  ← Start: MongoDB, Redis, EMQX MQTT broker
├── src/
│   ├── server/
│   │   ├── server.py           ← FastAPI app dengan lifespan
│   │   ├── routers/
│   │   │   ├── floyd_warshall_route.py  ← POST /api/floydwarshall/*
│   │   │   ├── videoOps_route.py        ← POST /api/video-ops/*
│   │   │   ├── webodm_route.py          ← /webodm/* (manage WebODM)
│   │   │   ├── mqtt_route.py            ← GET /api/mqtt (status)
│   │   │   ├── redis_route.py           ← GET /api/redis (cache)
│   │   │   └── job_log_route.py         ← GET /api/job-log
│   │   ├── controllers/
│   │   └── services/
│   ├── modules/
│   │   ├── floyd_warshall.py   ← Algoritma APSP murni Python
│   │   ├── mqtt_listener.py    ← aiomqtt subscriber (async loop)
│   │   ├── device_bootstrap.py ← Login ke Server 1, fetch device topics
│   │   ├── mqtt_emqx.py        ← EMQX HTTP API wrapper
│   │   ├── parsevid.py         ← Frame extraction (OpenCV)
│   │   ├── tiling.py           ← Image tiling utilities
│   │   └── segmentation/       ← FastSAM model (plot detection)
│   ├── arq_worker/
│   │   ├── settings.py         ← WorkerSettings (4 tasks: video ops)
│   │   └── tasks/
│   │       └── videoOps_task.py ← upload_video, parse_video, dll
│   └── db/
│       ├── connection.py        ← Motor (AsyncMongoClient) + Beanie
│       ├── gridfs_ops.py        ← GridFS binary operations
│       └── models/              ← Beanie Document models
└── main.py  ← Test/debug script (bukan server)
```

**Startup sequence GIS Server:**
1. `server.py` lifespan: connect MongoDB → init DB → connect Redis pool
2. `fetch_device_topics()`: HTTP login ke `RICEMESH_API_HOST` (Server 1) → GET `/devices` → kumpulkan semua MQTT topic
3. `start_mqtt_listener(topics, redis)`: spawn asyncio Task — subscribe EMQX → cache messages ke Redis pada key `mqtt_message:<topic>`

---

## 6. Environment Variables — Mapping Aktual

### Server 1 (BackEnd) — `.env`
```env
DATABASE_URL=postgresql://...    # Supabase Cloud
JWT_SECRET=...                   # Min 32 char
DECISION_ENGINE_URL=http://localhost:8000  # Server 2
GISPROC_API_BASE_URI=http://localhost:8001  # Server 3
MQTT_URL=mqtt://localhost:1883   # EMQX
BMKG_BASE_URL=https://api.bmkg.go.id/publik/prakiraan-cuaca
R2_ENDPOINT=...                  # Cloudflare R2
```

### Server 3 (GIS Processing) — `.env`
```env
WEBODM_ROOT=http://localhost:8000    # WebODM admin URL (BEDA dengan Server 2!)
MONGO_BASE_ADDRESS=localhost:27017   # MongoDB
DATABASE=ricemesh
REDIS_HOST=localhost                 # Redis ARQ + cache
REDIS_PORT=6379
EMQX_MQTT_HOST=localhost             # EMQX broker
EMQX_MQTT_PORT=1883
EMQX_MQTT_USER=admin
EMQX_MQTT_PASS=public
RICEMESH_API_HOST=http://localhost:3000  # → Server 1 untuk bootstrap
RICEMESH_API_EMAIL=admin@smartawd.id
RICEMESH_API_PASS=DevPassword123!
```

> ⚠️ **Port Conflict Warning:** `WEBODM_ROOT=http://localhost:8000` dan `DECISION_ENGINE_URL=http://localhost:8000` mengarah ke port yang sama. Di deployment nyata, **WebODM** dan **Server 2 (DSS)** harus diberi port berbeda.

---

## 7. Startup Order yang Benar

```
1. ✅ Supabase DB (cloud — selalu tersedia)
2. ✅ docker compose up (di gis_risang/ricemesh-gis-processing/)
   → MongoDB, Redis, EMQX start
3. ✅ Server 2 (Model DSS): uvicorn app.main:app --port 8000
4. ✅ Server 1 (BackEnd): npm run dev → connects DB, start MQTT listener, start scheduler
5. ✅ Server 3 (GIS): uvicorn server.server:gisProc --port 8001
   → Startup: auto-login Server 1, fetch topics, subscribe EMQX
6. ✅ ARQ Worker (opsional, untuk video ops): arq arq_worker.settings.WorkerSettings
7. ✅ FrontEnd: npm run dev (port 5173)
```
