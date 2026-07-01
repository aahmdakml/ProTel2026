# DSS Real Flow — Smart AWD Decision Engine
**Berdasarkan implementasi kode nyata** | `engine.py` · `engine-client.service.ts` · `scorer.py`
*Diperbarui: 2026-07-01*

---

> Dokumen ini menggambarkan alur kerja **nyata** DSS (Decision Support System) ProTel Smart AWD
> dari trigger scheduler hingga rekomendasi tersimpan ke database, lengkap dengan semua parameter
> yang dipertimbangkan di setiap cabang keputusan.

---

## 1. Alur Pipeline End-to-End (Sistem Penuh)

```mermaid
flowchart TD
    A([🕐 Cron Scheduler]) --> B{Cycle Mode?}

    B -->|siaga| C[Setiap 30 menit]
    B -->|normal| D[Setiap 60 menit\n hanya jam:00]

    C & D --> E[decision-cycle.job.ts\nrunDecisionCycleForField]

    E --> F[📦 Buat decision_job\nstatus = pending]

    F --> G[🔁 State Builder\nbuildFieldStates]

    subgraph SB["State Builder — setiap 10 menit paralel"]
        G --> G1[Query telemetry_records\nORDER BY event_timestamp DESC]
        G1 --> G2{Data tersedia\ndalam 8 jam?}
        G2 -->|Ya, < 2 jam| G3[stateSource = observed\nfreshnessStatus = fresh]
        G2 -->|Ya, 2–8 jam| G4[stateSource = observed\nfreshnessStatus = stale]
        G2 -->|Tidak| G5[Estimasi dari tetangga\nvia Floyd-Warshall successor]
        G5 --> G6[Weighted avg:\nfresh neighbor = 1.0\nstale neighbor = 0.5\nconfidence = freshCount/usable]
        G6 --> G7[stateSource = estimated]
        G2 -->|> 8 jam / null| G8[stateSource = no_data\nfreshnessStatus = no_data]
        G3 & G4 & G7 & G8 --> G9[(sub_block_current_states\nUPSERT per sub-block)]
    end

    G9 --> H[Load Context DB]

    subgraph LD["Load Data — engine-client.service.ts"]
        H --> H1[mst.fields\nwater_source_type\noperator_count\nis_source_depleted]
        H --> H2[mst.sub_blocks\nid · code · elevation_m\npolygon_geom · area_m2]
        H --> H3[trx.sub_block_current_states\nwater_level_cm\nstate_source · freshness_status\ninterpolation_confidence]
        H --> H4[mst.crop_cycles\nbucket_code · phase_code\ncurrent_hst · variety_name]
        H --> H5[mst.irrigation_rule_profiles\nawd_upper_target_cm\ndrought_alert_cm\npriority_weight\nrain_delay_mm]
        H --> H6[trx.management_events\nevent_type · flag_expires_at\nattention_flag_text]
        H --> H7[trx.agronomic_treatments\ntarget_water_level_cm\noverride_expires_at]
        H --> H8[mst.flow_paths\nfloyd_warshall_matrix]
        H --> H9[trx.weather_forecast_snapshots\nrain_events JSON\nprecipitation_mm · bmkg_category]
        H --> H10[trx.weather_warning_snapshots\nwarning_type · warning_level\ndss_action]
    end

    H1 & H2 & H3 & H4 & H5 & H6 & H7 & H8 & H9 & H10 --> I

    I[🔧 Build Rule Profile per Sub-Block] --> I1{Ada crop_cycle?}
    I1 -->|Ya| I2[Lookup rule:\n1. cycle.ruleProfileId\n2. bucket+phase isDefault\n3. bucket+phase\n4. global isDefault]
    I1 -->|Tidak| I3[rule_profile = null]
    I2 --> I4{Ada agronomic\ntreatment aktif?}
    I4 -->|Ya| I5[OVERRIDE:\nawd_upper_target = targetWaterLevelCm\nawd_lower_threshold = targetWaterLevelCm - 1]
    I4 -->|Tidak| I6[Pakai rule normal\nawd_lower_threshold = -15.0\n⚠️ hardcoded]

    I3 & I5 & I6 --> J

    I2 -->|Selalu| J_mgmt
    J_mgmt[Build Management Flags:\nevent_type = snooze_dss\njika eventType = maintenance\nDAN flagText contains 'Pematang']

    J_mgmt --> J[📡 POST ke Python Model Service\nlocalhost:8000/api/evaluate]
```

---

## 2. Alur Engine Python — `_evaluate_sub_block` (Per Sub-Block)

```mermaid
flowchart TD
    START([⚙️ _evaluate_sub_block\nSatu sub-block masuk]) --> S0

    %% STEP 0.5 — Snooze
    S0{Step 0.5\nAda management_flag\nevent_type = snooze_dss?}
    S0 -->|Ya| R_SNOOZE([🔇 OBSERVE\nSNOOZE_DSS\nscore=0.0])
    S0 -->|Tidak| S1

    %% STEP 1 — Weather Warning
    S1{Step 1\nAda active_warnings?}
    S1 -->|dss_action =\nDELAY_IRRIGATION| R_SKIP_WARN([👁️ OBSERVE\nSKIP_RAINFALL_WARNING\nscore=0.1])
    S1 -->|dss_action =\nSKIP_CYCLE| R_SKIP_CRIT([🚫 SKIP_AWD_EVENT\nSKIP_WARNING_CRITICAL\nscore=0.05])
    S1 -->|Tidak ada /\nnone| S2

    %% STEP 2 — Rule Profile
    S2{Step 2\nrule_profile = null?}
    S2 -->|Ya| R_NORULE([👁️ OBSERVE\nNO_RULE_PROFILE\nscore=0.1\nconfidence=LOW])
    S2 -->|Tidak| S3

    %% STEP 3 — Data Check
    S3{Step 3\nwater_level_cm = null\nATAU state_source = no_data?}
    S3 -->|Ya| R_NODATA([👁️ OBSERVE\nNO_DATA\nscore=0.2\nconfidence=LOW])
    S3 -->|Tidak, wl tersedia| S4

    %% STEP 4 — Rain Event
    S4[Step 4\nAmbil rain_event terdekat\nsort by hours_until_rain ASC]
    S4 --> S4A{Ada upcoming_event?}

    S4A -->|Tidak| S5
    S4A -->|Ya| CALC_FLAGS

    CALC_FLAGS[Hitung Flags Rain:\nis_heavy = peak_mm ≥ 8.0\nis_sustained = duration_h ≥ 6\nis_imminent = hours_until < 3\ntotal_mm = upcoming.total_mm]

    CALC_FLAGS --> CALC_WL[Hitung Status Air:\nis_flooded = wl > upper + 2.0\nis_high = wl ≥ upper\nis_dry = wl ≤ lower\nis_critical_dry = wl ≤ drought_alert]

    CALC_WL --> RAIN_BRANCH

    RAIN_BRANCH{Kondisi air\nvs hujan?}

    %% RAIN: FLOODED
    RAIN_BRANCH -->|is_flooded = True| FLOOD_CHK
    FLOOD_CHK{is_heavy?}
    FLOOD_CHK -->|Ya| R_DRAIN_CRIT([🔴 DRAIN\nDRAIN_CRITICAL_RAIN\nscore=1.0])
    FLOOD_CHK -->|Tidak| RAIN_CONT1

    %% RAIN: HIGH
    RAIN_BRANCH -->|is_high = True| HIGH_CHK
    HIGH_CHK{is_heavy?}
    HIGH_CHK -->|Ya| HIGH_IMM{is_imminent?}
    HIGH_IMM -->|Ya| R_DRAIN_URG([🔴 DRAIN\nDRAIN_URGENT_RAIN\nscore=0.9])
    HIGH_IMM -->|Tidak| R_DRAIN_SEG([🔴 DRAIN\nDRAIN_SEGERA_RAIN\nscore=0.9])
    HIGH_CHK -->|Tidak| HIGH_PREP{not is_imminent\nOR is_sustained?}
    HIGH_PREP -->|Ya| R_DRAIN_PREP1([🟠 DRAIN\nDRAIN_PREPARE_RAIN\nscore=0.7])
    HIGH_PREP -->|Tidak| RAIN_CONT1[→ lanjut ke Step 5]

    %% RAIN: CRITICAL DRY
    RAIN_BRANCH -->|is_critical_dry = True| R_PASS[pass → lanjut Step 5\n⚠️ tidak ditahan cuaca]

    %% RAIN: DRY
    RAIN_BRANCH -->|is_dry = True| DRY_CHK
    DRY_CHK{is_imminent\nAND is_heavy?}
    DRY_CHK -->|Ya| R_HOLD_RAIN([👁️ OBSERVE\nHOLD_RAIN_COMING\nscore=0.2])
    DRY_CHK -->|Tidak| DRY_CHK2{not imminent\nAND not sustained\nAND not heavy?}
    DRY_CHK2 -->|Ya| R_IRR_BEFORE([💧 IRRIGATE\nIRRIGATE_BEFORE_RAIN\nscore=0.8])
    DRY_CHK2 -->|Tidak| DRY_CHK3{is_sustained?}
    DRY_CHK3 -->|Ya| R_HOLD_SUS([👁️ OBSERVE\nHOLD_SUSTAINED_RAIN\nscore=0.2])
    DRY_CHK3 -->|Tidak| RAIN_CONT1

    %% RAIN: NORMAL (else branch)
    RAIN_BRANCH -->|Normal\ntidak flooded/high/dry/critical| NORMAL_RAIN
    NORMAL_RAIN[Cek jam WIB] --> AFT_CHK
    AFT_CHK{is_afternoon?\n13:00 ≤ jam < 17:00}
    AFT_CHK -->|Ya dan is_heavy| R_DRAIN_PREP2([🟠 DRAIN\nDRAIN_PREPARE_RAIN\nscore=0.8\nPre-emptive Sore])
    AFT_CHK -->|Tidak| NORM_RAIN2{is_imminent\nOR is_heavy\nOR is_sustained\nOR total_mm ≥ 2.0?}
    NORM_RAIN2 -->|Ya| R_HOLD_FORE([👁️ OBSERVE\nHOLD_RAIN_FORECAST\nscore=0.15])
    NORM_RAIN2 -->|Tidak| RAIN_CONT1

    %% STEP 5 — Threshold Evaluation
    S5[Step 5\nEvaluasi Level Air vs Threshold\nCek jam malam WIB]
    RAIN_CONT1 --> S5
    R_PASS --> S5

    S5 --> NIGHT_CALC[is_night = jam ≥ 17\nATAU jam < 5]

    NIGHT_CALC --> CRIT_CHK

    %% DROUGHT ALERT — bypass night
    CRIT_CHK{wl ≤ drought_alert_cm?\nAbaikan jam malam!}
    CRIT_CHK -->|Ya| CRIT_SRC{is_source_depleted?}
    CRIT_SRC -->|Ya| R_DROUGHT([👁️ OBSERVE\nDROUGHT_OVERRIDE\nscore=0.2])
    CRIT_SRC -->|Tidak| R_IRRCRIT([🚨 IRRIGATE\nIRRIGATE_CRITICAL\nscore = calc_priority\nbx2.0 boost])

    CRIT_CHK -->|Tidak| THRESH_CHK

    %% AWD LOWER THRESHOLD
    THRESH_CHK{wl ≤ awd_lower_threshold_cm\n= -15.0 hardcoded}
    THRESH_CHK -->|Ya| THRESH_SRC{is_source_depleted?}
    THRESH_SRC -->|Ya| R_DROUGHT2([👁️ OBSERVE\nDROUGHT_OVERRIDE\nscore=0.2])
    THRESH_SRC -->|Tidak| NIGHT_CHK{is_night?}
    NIGHT_CHK -->|Ya| R_NIGHTHOLD([👁️ OBSERVE\nDELAY_NIGHT_IRRIGATION\nscore=0.2])
    NIGHT_CHK -->|Tidak| R_IRRTHRESH([💧 IRRIGATE\nIRRIGATE_THRESHOLD\nscore = calc_priority x1.0])

    THRESH_CHK -->|Tidak| UPPER_CHK

    %% AWD UPPER + TOLERANCE
    UPPER_CHK{wl ≥ awd_upper_target_cm\n+ DRAIN_TOLERANCE_CM\n= upper + 5.0?}
    UPPER_CHK -->|Ya| R_DRAINEXC([🟡 DRAIN\nDRAIN_EXCESS\nscore=0.5\nconfidence=MEDIUM])

    %% DEFAULT: MAINTAIN
    UPPER_CHK -->|Tidak\nwl dalam range AWD| R_MAINTAIN([✅ MAINTAIN_DRY\nMAINTAIN_AWD_DRY\nscore=0.3])

    %% Style
    classDef observe fill:#94a3b8,color:#fff,stroke:#475569
    classDef irrigate fill:#3b82f6,color:#fff,stroke:#1d4ed8
    classDef drain fill:#ef4444,color:#fff,stroke:#b91c1c
    classDef drain_warn fill:#f97316,color:#fff,stroke:#c2410c
    classDef maintain fill:#22c55e,color:#fff,stroke:#15803d
    classDef skip fill:#8b5cf6,color:#fff,stroke:#6d28d9

    class R_SNOOZE,R_SKIP_WARN,R_NORULE,R_NODATA,R_HOLD_RAIN,R_HOLD_SUS,R_HOLD_FORE,R_DROUGHT,R_DROUGHT2,R_NIGHTHOLD observe
    class R_IRR_BEFORE,R_IRRCRIT,R_IRRTHRESH irrigate
    class R_DRAIN_CRIT,R_DRAIN_URG,R_DRAIN_SEG,R_DRAINEXC drain
    class R_DRAIN_PREP1,R_DRAIN_PREP2 drain_warn
    class R_MAINTAIN maintain
    class R_SKIP_CRIT skip
```

---

## 3. Alur Scorer & Routing Post-Engine

```mermaid
flowchart TD
    ENG[Python Engine\nhasil: list RecommendationOutput\nper sub-block] --> SC

    subgraph SCORE["scorer.py — score_and_rank"]
        SC[Sort semua rekomendasi] --> SC1
        SC1[Kriteria 1:\nrecommendation_type priority\nIRRIGATE=0 DRAIN=1\nMAINTAIN_WET=2 MAINTAIN_DRY=3\nOBSERVE=4 SKIP=5]
        SC1 --> SC2[Kriteria 2:\npriority_score DESC\n0.0 – 1.0]
        SC2 --> SC3[Assign priority_rank\n1-based, 1 = paling urgent]
    end

    SC3 --> SAVE[💾 Simpan ke DB\ntrx.irrigation_recommendations\npriority_rank · priority_score\ncommand_template_code\ncommand_text · reason_summary\nconfidence_level · valid_until]

    SAVE --> ROUTING

    subgraph ROUTE["routing.service.ts — Floyd-Warshall Routing\ndijalankan setImmediate async"]
        ROUTING[Ambil rekomendasi IRRIGATE\ndan DRAIN dari job ini] --> R1
        R1[Load sub_blocks\nelevation_m · elevation_calibration\npolygon_geom centroid EWKT\narea_m2] --> R2
        R2[Load irrigation_points\nsource dan drain points] --> R3
        R3[Load embankments\nconnected_sub_blocks\natau fields.irrigation_edges] --> R4
        R4[Load sub_block_current_states\nwater_height per node\noptimal_height per rule] --> R5

        R5[Build nodes array:\nwater_height · optimal_height\nelevation · area] --> R6
        R6[Build edges array:\nu · v · centroid_u · centroid_v] --> R7

        R7[POST GIS /api/floydwarshall/run\ndirected=true\nbobot = elevation + defisit air] --> R8

        R8[Terima dist matrix\ndan successor matrix] --> R9

        R9{Untuk setiap\ntarget IRRIGATE\ncari source terdekat} --> R10
        R10[POST GIS /api/floydwarshall/matrix\nsource=bestSrcIdx\ntarget=tgtIdx] --> R11
        R11[Terima path UUID\ndan routing_score] --> R12
        R12[UPDATE recommendation:\nroute_path_ids\nfrom_sub_block_id\ncommand_text enriched]

        R9 --> R13{Untuk setiap\nsource DRAIN\ncari target terdekat}
        R13 --> R14[POST GIS /api/floydwarshall/matrix] --> R15
        R15[UPDATE recommendation:\nroute_path_ids\nto_sub_block_id\ncommand_text enriched]
    end

    ROUTING --> DONE([✅ Decision Cycle Selesai\ndecision_job.status = completed])
```

---

## 4. Priority Score Formula

```mermaid
flowchart LR
    subgraph FORMULA["_calc_priority — engine.py:294"]
        F1["deficit = abs(wl - threshold)"]
        F1 --> F2["score = min(0.5 + deficit/30 × 0.5, 1.0)"]
        F2 --> F3["return score × boost"]
    end

    subgraph BOOST["Boost Values"]
        B1["IRRIGATE_CRITICAL → boost = 2.0"]
        B2["IRRIGATE_THRESHOLD → boost = 1.0"]
    end

    subgraph FIXED["Nilai Tetap"]
        FX1["DRAIN_CRITICAL_RAIN = 1.0"]
        FX2["DRAIN_URGENT/SEGERA = 0.9"]
        FX3["IRRIGATE_BEFORE_RAIN = 0.8"]
        FX4["DRAIN_PREPARE_RAIN = 0.7–0.8"]
        FX5["DRAIN_EXCESS = 0.5"]
        FX6["MAINTAIN_AWD_DRY = 0.3"]
        FX7["NO_DATA / OBSERVE = 0.1–0.2"]
        FX8["SNOOZE_DSS = 0.0"]
    end
```

---

## 5. Parameter Lengkap yang Dipertimbangkan

### Input Parameters ke Engine

| Kategori | Parameter | Tipe | Sumber |
|---|---|---|---|
| **Field Context** | `water_source_type` | string | mst.fields |
| | `is_source_depleted` | boolean | mst.fields |
| | `operator_count` | integer | mst.fields |
| **Sub-Block State** | `water_level_cm` | float / null | trx.sub_block_current_states |
| | `state_source` | observed / estimated / no_data | trx.sub_block_current_states |
| | `freshness_status` | fresh / stale / no_data | trx.sub_block_current_states |
| | `interpolation_confidence` | 0.0–1.0 | Estimator (neighbor avg) |
| **Rule Profile** | `awd_upper_target_cm` | float | mst.irrigation_rule_profiles |
| | `awd_lower_threshold_cm` | float | **Hardcoded = -15.0** |
| | `drought_alert_cm` | float / null | mst.irrigation_rule_profiles |
| | `priority_weight` | float | mst.irrigation_rule_profiles *(tidak dipakai engine saat ini)* |
| | `rain_delay_mm` | float | mst.irrigation_rule_profiles |
| **Agronomic Override** | `target_water_level_cm` | float | trx.agronomic_treatments |
| | `override_expires_at` | timestamp | trx.agronomic_treatments |
| **Crop Cycle** | `phase_code` | string | mst.crop_cycles |
| | `bucket_code` | string | mst.crop_cycles |
| | `current_hst` | integer | mst.crop_cycles |
| **Management** | `event_type = snooze_dss` | boolean check | trx.management_events |
| | `flag_expires_at` | timestamp | trx.management_events |
| **Weather** | `rain_events[].peak_intensity_mm` | float | BMKG → weather_forecast_snapshots |
| | `rain_events[].hours_until_rain` | float | BMKG processed |
| | `rain_events[].duration_hours` | integer | BMKG processed |
| | `rain_events[].total_mm` | float | BMKG processed |
| **Warning** | `warning_type` | string | trx.weather_warning_snapshots |
| | `dss_action` | delay_irrigation / skip_cycle / none | trx.weather_warning_snapshots |
| **Jam Operasional** | `WIB hour` | integer 0–23 | datetime.now(WIB) realtime |

### Konstanta Engine (Hardcoded di engine.py)

| Konstanta | Nilai | Keterangan |
|---|---|---|
| `NIGHT_BLOCK_START_HOUR` | 17 | Jam awal blokir irigasi malam |
| `NIGHT_BLOCK_END_HOUR` | 5 | Jam akhir blokir irigasi malam |
| `DRAIN_TOLERANCE_CM` | 5.0 cm | Histeresis drain = upper + 5 |
| `is_heavy` threshold | ≥ 8.0 mm / 3-jam | Dari peak_intensity_mm rain event |
| `is_imminent` threshold | < 3 jam | Dari hours_until_rain |
| `is_sustained` threshold | ≥ 6 jam | Dari duration_hours |
| `is_wet` threshold (BMKG) | ≥ 2.0 mm | Dari tp field BMKG per slot 3-jam |
| `HEAVY_THRESHOLD` (BMKG) | ≥ 8.0 mm | Dari peak per slot 3-jam |
| `is_flooded` threshold | upper + 2.0 cm | Dalam konteks rain evaluation |
| `pre-emptive drain window` | 13:00–16:59 | Jam aktif DRAIN_PREPARE_RAIN |
| `awd_lower_threshold_cm` | -15.0 | Hardcoded pengganti kolom DB yang dihapus |

---

## 6. Override Priority Tree

```mermaid
flowchart TD
    O1["🔇 SNOOZE_DSS\nOverride #1 — Absolut\nTidak ada yang bisa bypass ini"] -->|Kalah oleh| O2

    O2["⚠️ WEATHER WARNING\nOverride #2\nDELAY_IRRIGATION atau SKIP_CYCLE\nDari BMKG warning aktif"] -->|Kalah oleh| O3

    O3["❌ NO RULE PROFILE\nGuard #1\nTidak bisa evaluasi tanpa rule"] -->|Kalah oleh| O4

    O4["📡 NO DATA\nGuard #2\nTidak ada water level measurement"] -->|Kalah oleh| O5

    O5["🌧️ RAIN EVENT LOGIC\nStep 4 — 9 cabang keputusan\nBerdasarkan kombinasi air + hujan"] -->|Kalah oleh| O6

    O6["🚨 DROUGHT ALERT\nBypass malam!\nwl ≤ drought_alert_cm\nPaling mendesak, ignores night block"] -->|Kalah oleh| O7

    O7["💧 AWD THRESHOLD\nwl ≤ lower_threshold = -15 cm\nDitahan night block"] -->|Kalah oleh| O8

    O8["🌊 DRAIN EXCESS\nwl ≥ upper + 5 cm\nHisteresis terpenuhi"] -->|Kalah oleh| O9

    O9["✅ MAINTAIN_AWD_DRY\nDefault — air dalam rentang aman\nTidak ada tindakan perlu"]

    style O1 fill:#dc2626,color:#fff
    style O2 fill:#ea580c,color:#fff
    style O3 fill:#7c3aed,color:#fff
    style O4 fill:#7c3aed,color:#fff
    style O5 fill:#0284c7,color:#fff
    style O6 fill:#dc2626,color:#fff
    style O7 fill:#2563eb,color:#fff
    style O8 fill:#b45309,color:#fff
    style O9 fill:#16a34a,color:#fff
```

---

## 7. Threshold Visual (Rule Profile Default — Fase Vegetatif)

```
Water Level (cm)
                    ▲
          +∞        │
                    │  ← Banjir ekstrem
          +10       │──────────────────── is_flooded = True   (upper + 2 cm)
                    │  [DRAIN saat hujan berat]
           +5       │══════════════════════ awd_upper_target_cm (fase vegetatif)
                    │  ← Zona aman AWD kering
                    │  MAINTAIN_AWD_DRY
             0      │──────────────────── Permukaan tanah
                    │  ← AWD kering
          -15       │══════════════════════ awd_lower_threshold_cm (HARDCODED)
                    │  [IRRIGATE_THRESHOLD jika siang]
                    │  [DELAY_NIGHT_IRRIGATION jika malam]
          -25       │══════════════════════ drought_alert_cm (fase veg early/late)
                    │  [IRRIGATE_CRITICAL — bypass malam!]
          -∞        │

          Note fase reproductive: upper = +10 cm, drought_alert = -12 cm (early)
          Note drain tolerance: DRAIN_EXCESS muncul saat wl ≥ +5 + 5 = +10 cm (vegetatif)
```

---

## 8. Scheduler — Cron Jobs Pendukung DSS

```mermaid
gantt
    title Jadwal Cron Jobs DSS (dalam 1 jam)
    dateFormat mm
    axisFormat %M menit

    section State Builder
    state-builder.job (tiap 10 menit)     : 00, 10m
    state-builder.job                      : 10, 10m
    state-builder.job                      : 20, 10m
    state-builder.job                      : 30, 10m
    state-builder.job                      : 40, 10m
    state-builder.job                      : 50, 10m

    section Stale Flag
    stale-flag.job (tiap 15 menit)        : 00, 15m
    stale-flag.job                         : 15, 15m
    stale-flag.job                         : 30, 15m
    stale-flag.job                         : 45, 15m

    section Decision Cycle
    decision-cycle.job normal (jam:00)    : 00, 5m
    decision-cycle.job siaga (jam:30)     : 30, 5m
```

| Job | Interval | Fungsi |
|---|---|---|
| `state-builder.job` | Tiap 10 menit | Refresh `sub_block_current_states` dari telemetry terbaru |
| `stale-flag.job` | Tiap 15 menit | Update `freshness_status`: fresh→stale (>2jam), stale→no_data (>8jam) |
| `bmkg-sync.job` | Tiap 3 jam | Fetch prakiraan cuaca BMKG, simpan ke `weather_forecast_snapshots` |
| `decision-cycle.job` | Tiap 30 menit | Trigger evaluasi DSS (normal=60min, siaga=30min) |
| `hst-updater.job` | Tiap tengah malam | Increment `current_hst` berdasarkan `planting_date` |

---

*Sumber: `engine.py` · `engine-client.service.ts` · `scorer.py` · `estimator.ts` · `bmkg.service.ts` · `scheduler.service.ts` · `stale-flag.job.ts` · `hst-updater.job.ts` · `seed.ts`*
