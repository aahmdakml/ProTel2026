# 📡 Dokumentasi Firmware IoT — RiceMesh Network
> **Update:** 29 Juni 2026 — Disesuaikan dengan README aktual Firmware/

## 1. Gambaran Umum

RiceMesh adalah **jaringan sensor nirkabel multi-node** yang digunakan di area persawahan untuk mengukur ketinggian air, suhu, dan tekanan secara real-time. Karena area sawah sering minim sinyal WiFi/seluler, sistem menggunakan protokol radio **nRF24L01+ (2.4 GHz)** sebagai transport layer lokal sebelum data dikirim ke internet via ESP8266.

**Arsitektur ringkas:**
```
[Node 1-3: STM32 + HC-SR04 + nRF24]
           ↓ Radio RF 2.4GHz
[Receiver: STM32 + nRF24 + BMP280]
           ↓ UART 115200
[Gateway: ESP8266 + WiFi]
           ↓ MQTT (publish JSON)
[Backend Node.js: Subscribe → Kalibrasi → DB Insert]
```

---

## 2. Hardware Components

| Komponen | MCU | Sensor | Komunikasi |
|---|---|---|---|
| Node-1 Transmitter | STM32F030C8T6 (LQFP48) | HC-SR04 (ultrasonik) | nRF24L01+ RF |
| Node-2 Transmitter | STM32F103C8T6 (Blue Pill) | HC-SR04 (ultrasonik) | nRF24L01+ RF |
| Node-3 Transmitter | STM32F103C8T6 (Blue Pill) | HC-SR04 (ultrasonik) | nRF24L01+ RF |
| Receiver | STM32F030C8T6 (LQFP48) | BMP280 via I2C (suhu & tekanan) | nRF24L01+ + UART TX → ESP8266 |
| Gateway | ESP8266 NodeMCU | — | WiFi + MQTT |

---

## 3. Pin Mapping

### Node Transmitter (sama untuk semua 3 node)

| Pin | Fungsi |
|---|---|
| PA3 | nRF24 CSN (Chip Select, SPI) |
| PA4 | nRF24 CE (Chip Enable) |
| PA5 | SPI1 SCK |
| PA6 | SPI1 MISO |
| PA7 | SPI1 MOSI |
| PA8 | TIM1 CH1 Input Capture — ECHO HC-SR04 |
| PA9/PA10 | USART1 TX/RX (belum dipakai di aplikasi) |
| PB1 | TRIG HC-SR04 (output) |
| PB5 | LED indikator transmisi berhasil |

### Receiver (STM32F030)

| Pin | Fungsi |
|---|---|
| PA3-PA7 | nRF24 SPI (sama dengan transmitter) |
| PA9/PA10 | USART1 TX → ESP8266 RX (115200 baud) |
| PB1 | TRIG HC-SR04 (opsional, jika receiver ikut ukur) |
| PB5 | LED indikator data diterima |
| PB6/PB7 | I2C1 SCL/SDA → BMP280 (alamat 0x76) |

---

## 4. Konfigurasi Radio nRF24L01+

| Parameter | Nilai |
|---|---|
| Channel | 90 |
| Data rate | 1 Mbps |
| TX Power | 0 dBm |
| Payload size | 32 byte (fixed) |
| Auto-ACK | Aktif (semua pipe) |
| Auto-Retransmit | Delay=4, maksimum 10 kali |
| CRC | Nonaktif |
| Address width | 5 byte |

**Alamat pipe per node:**

| Pipe | Node | Alamat (HEX) |
|---|---|---|
| 1 | Node-1 | `AA 44 33 22 11` |
| 2 | Node-2 | `BB 44 33 22 11` |
| 3 | Node-3 | `CC 44 33 22 11` |

---

## 5. Format Data

### Payload Radio (Transmitter → Receiver)
Format string 32-byte: `"N{node_id} d:{raw_ticks}"`
- Contoh: `"N1 d:412"`, `"N2 d:389"`, `"N3 d:407"`
- `d` = nilai mentah `Difference` (tick timer TIM1), **belum dikonversi ke cm**.
- Konversi dilakukan di sisi **BackEnd** (tidak di firmware).

### Output JSON Receiver → ESP8266 (via UART)
Dikirim tiap 1 detik, diakhiri `\n`:
```json
{"device":[
  {"d":412,"temperature":"29.63","pressure":"1006.53"},
  {"d":null,"temperature":"29.63","pressure":"1006.53"},
  {"d":407,"temperature":"29.63","pressure":"1006.53"}
]}
```
- `d`: raw tick dari node. `null` = node belum pernah kirim data.
- `temperature`: °C (dari BMP280).
- `pressure`: hPa (dari BMP280).
- BMP280 gagal dibaca → kedua field jadi `null` (JSON tetap valid).

### Kalibrasi Water Level di BackEnd
BackEnd melakukan konversi tick → ketinggian air setelah menerima data:
```
water_level_cm = (sensor_max_distance_mm - raw_distance_mm) / 10
```
Nilai `sensor_max_distance_mm` diambil dari `mst.sensor_calibrations` (default: 1400mm).

---

## 6. MQTT Topics (Gateway ESP8266)

Broker default: `10.58.34.24:1883` (tanpa autentikasi).

| Topik | Isi |
|---|---|
| `topic_awd1_67` | Payload JSON lengkap (string mentah) |
| `topic_awd1_67/sensors/N1/d` | Jarak raw Node 1 |
| `topic_awd1_67/sensors/N2/d` | Jarak raw Node 2 |
| `topic_awd1_67/sensors/N3/d` | Jarak raw Node 3 |
| `topic_awd1_67/sensors/bmp280/temperature` | Suhu (°C) |
| `topic_awd1_67/sensors/bmp280/pressure` | Tekanan (hPa) |
| `topic_awd1_67/status` | `esp8266-gateway-online` (retained) |

> ⚠️ MQTT topic yang dipakai BackEnd Node.js adalah topic yang di-generate PostgreSQL trigger (`field/{field_id}/sensor/{device_code}`), **bukan** topic ESP8266 di atas. Topic ESP8266 di atas adalah untuk monitoring lokal di lapangan dan perlu disesuaikan dengan konfigurasi backend di production.

---

## 7. HTTP Monitoring Gateway (ESP8266)

Berjalan di port 80, auto-refresh 2 detik:

| Endpoint | Deskripsi |
|---|---|
| `/` | Dashboard HTML (status WiFi, MQTT, JSON terakhir, counter) |
| `/json` | Payload JSON terbaru (`application/json`) |
| `/status` | Info kesehatan gateway (JSON) |

---

## 8. Build & Flash Instructions

### STM32 Nodes (transmitter & receiver)
```bash
# Prasyarat: arm-none-eabi-gcc dan openocd di PATH
# Kompilasi
make

# Flash via ST-Link (sekaligus)
./build_flash.sh

# Flash manual
openocd -f bluepill.cfg -c "program build/RiceMesh-v4-f030.elf verify reset exit"

# Bersihin build
make clean
```

**CPUTAPID di bluepill.cfg:**
- Node-1 & Receiver (F030): `0x0bb11477`
- Node-2/3 (F103 clone): `0x2ba01477`

### ESP8266 Gateway (PlatformIO)
```bash
cd MQTT-Transmitter/ricemesh-data-show

# Edit kredensial sebelum flash:
# src/main.cpp → WIFI_SSID, WIFI_PASS, MQTT_BROKER

pio run                    # kompilasi
pio run --target upload    # flash ke board
pio device monitor         # serial monitor 115200
```

---

## 9. Known Bugs & Limitations

| # | Komponen | Masalah | Solusi |
|---|---|---|---|
| 1 | Semua STM32 | **Prescaler TIM1 salah:** Set ke `47` (untuk 48MHz), padahal SYSCLK=16MHz. Efek: tick=3µs bukan 1µs → jarak meleset ~3×. | Ubah `Prescaler = 47` → `Prescaler = 15` di `MX_TIM1_Init()` |
| 2 | Node-1 & Receiver | **Drift .ioc:** PA8 sudah diassign ke TIM1_CH1 di `.ioc`, tapi CubeMX belum di-regenerate. Makro `ECHO_Pin` tidak terdefinisi → build gagal. | Tambah definisi makro manual ATAU regenerate dari CubeMX |
| 3 | Node-1 | **Tidak ada timeout echo HC-SR04:** Jika echo tidak pernah datang, `Is_First_Captured` stuck di 1. | Tambah timeout dengan `HAL_GetTick()` |
| 4 | Semua transmitter | **`Distance` bertipe `uint8_t`:** Overflow diam-diam jika jarak > 255cm (HC-SR04 bisa sampai ~400cm). | Ganti ke `uint16_t` |
| 5 | Semua STM32 | **`Error_Handler()` cuma spin forever** tanpa diagnostik. | Tambahkan output UART untuk debugging |
| 6 | Gateway ESP8266 | **Kredensial WiFi hardcoded** di source. | Pindahkan ke config header terpisah atau NVS storage |

---

## 10. Quick Start Checklist

1. ✅ Build & flash ketiga Node Transmitter.
2. ⚠️ **Fix prescaler TIM1** ke `Prescaler = 15` sebelum flash.
3. ✅ Build & flash Node Receiver.
4. ✅ Sambungkan UART TX (PA9) Receiver ke RX ESP8266 pada 115200 baud + ground bersama.
5. ✅ Update `WIFI_SSID`, `WIFI_PASS`, `MQTT_BROKER` di ESP8266 firmware.
6. ✅ Flash ESP8266 via PlatformIO.
7. ✅ Verifikasi: buka `http://<ip-esp8266>/` — pastikan JSON muncul dan counter MQTT naik.
8. ✅ Verifikasi di BackEnd: cek log ingest saat data masuk.
