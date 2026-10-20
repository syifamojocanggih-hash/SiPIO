# SiPIO - Sistem Pemantau Ikan Otomatis (IoT)

Sistem Pakan Ikan Otomatis Berbasis IoT dengan Sensor Suhu Air (DS18B20), Level Air (Float Switch), Motor Servo Feeder, dan Kamera Pemantau (ESP32-CAM) yang terintegrasi dengan backend FastAPI dan dashboard PWA React.

Struktur proyek SiPIO dirancang modular dan rapi:

```text
SiPIO/
├── frontend/                     # Antarmuka PWA Dashboard (React 19 + Vite)
│   ├── src/                      # Komponen UI, Design Tokens, WebSocket Client, Formatters
│   ├── public/                   # Ikon PWA (192x192, 512x512), Manifest, Foto Kamera
│   ├── index.html                # Shell HTML & Meta PWA
│   ├── vite.config.js            # Konfigurasi Vite, Proxy & Workbox Service Worker
│   └── package.json              # Dependensi frontend
│
├── backend/                      # Layanan Backend FastAPI, WebSocket & MQTT Bridge
│   ├── main.py                   # Server FastAPI (REST API PRD v1.3, WebSocket /ws, MQTT Broker)
│   ├── database.py               # SQLAlchemy ORM Tangguh (MySQL dengan fallback otomatis SQLite)
│   ├── requirements.txt          # Dependensi Python
│   └── package.json              # Script npm runner untuk backend
│
├── hardware/                     # Perangkat Keras, Firmware & Dokumentasi Kalibrasi
│   ├── esp8266_feeder/           # Node Feeder: DS18B20 + Float Switch + Servo + Safety Interlock
│   ├── esp32_cam/                # Node Kamera: OV2640 Snapshot + HTTP Multipart Uploader
│   ├── pcb/                      # Desain PCB Cetak: Skematik Vektor SVG, BOM & Panduan Fabrikasi
│   └── CALIBRATION_AND_TEST_LOG.md # Lembar Hasil Uji Kalibrasi & Validasi (PRD Bagian 14 & 18)
│
├── DESIGN.md                     # Dokumentasi Design System (White & Blue High Contrast)
├── package.json                  # Root Workspace Script Runner
└── README.md                     # Dokumentasi panduan proyek
```

---

## Cara Menjalankan Proyek

Anda dapat masuk langsung ke masing-masing folder ataupun menjalankannya langsung dari folder utama (root):

### Opsi 1: Jalankan Langsung dari Root (Rekomendasi)

* **Aktifkan Frontend Dashboard (Vite PWA)**:
  ```bash
  npm run frontend
  ```
  *Buka browser:* `http://localhost:5173/`

* **Aktifkan Backend FastAPI & WebSocket**:
  ```bash
  npm run backend
  ```
  *Layanan backend aktif di:* `http://localhost:8000/`  
  *Dokumentasi Interaktif Swagger UI:* `http://localhost:8000/docs`  
  *WebSocket Telemetri:* `ws://localhost:8000/ws` (alias `/ws/telemetry`)

* **Build Bundle PWA Siap Produksi**:
  ```bash
  npm run build
  ```

---

## Arsitektur Koneksi Backend & IoT Broker

### 1. Saluran Komunikasi Frontend <-> Backend
- **WebSocket Streaming (`/ws` atau `/ws/telemetry`)**: Mengalirkan data suhu DS18B20, level air float switch, kekuatan sinyal RSSI, dan event eksekusi pakan secara real-time.
- **REST API Endpoints (PRD Bagian 12)**:
  - `GET /api/status` - Status perangkat feeder01, koneksi MQTT, dan telemetri terakhir.
  - `GET /api/telemetry?from=&to=` - Riwayat pembacaan sensor suhu dan level air.
  - `POST /api/feed` - Perintah pakan manual dengan proteksi safety interlock lokal.
  - `GET /api/feed/logs` (alias `/api/logs`) - Riwayat audit log eksekusi pakan pelet.
  - `GET /api/schedules` & `POST /api/schedules` - Manajemen jadwal pakan LittleFS/EEPROM.
  - `GET /api/thresholds` & `PUT /api/thresholds` - Pengaturan ambang batas suhu dan batas jeda pakan.
  - `GET /api/alerts` & `PUT /api/alerts/{id}/ack` - Pemantauan dan konfirmasi peringatan darurat.
  - `GET /api/camera/latest?area=kolam|hopper` - Snapshot foto terbaru dari ESP32-CAM.
  - `POST /api/camera/upload` - Endpoint penerima unggahan multipart foto ESP32-CAM.

### 2. Integrasi Broker MQTT Perangkat Keras
Backend mendukung topik standar **PRD Versi 1.3** (`fish/feeder01/*`) dan topik alias (`sipio/*`):
- **Langganan (Subscribe)**:
  - `fish/feeder01/telemetry` - Telemetri suhu DS18B20, status level air, dan RSSI.
  - `fish/feeder01/status` - Status online/offline LWT (*Last Will and Testament*) feeder.
  - `fish/feeder01/cam/status` - Status online/offline modul ESP32-CAM.
  - `fish/feeder01/event/feed` - Konfirmasi eksekusi pakan sukses dari servo.
  - `fish/feeder01/event/skip` - Laporan penundaan pakan jika level air rendah atau suhu di luar batas.
- **Publikasi (Publish)**:
  - `fish/feeder01/cmd/feed` - Perintah putar servo motor (`{"duration_ms": 2000, "source": "manual"}`).
  - `fish/feeder01/cfg/schedule` - Sinkronisasi jadwal pakan mandiri ke memori LittleFS.
  - `fish/feeder01/cfg/thresholds` - Sinkronisasi ambang keselamatan suhu & jeda pakan.

> **Catatan Uji Mandiri:** Jika broker MQTT fisik atau database MySQL belum aktif, backend FastAPI secara otomatis beralih ke penyimpanan lokal SQLite dan mengaktifkan jembatan telemetri mandiri, sehingga pengujian end-to-end tetap berjalan lancar!

---

## Dokumentasi Perangkat Keras & Validasi Praktikum

1. **Firmware ESP8266 Feeder**: Baca panduan di [`hardware/esp8266_feeder/README.md`](hardware/esp8266_feeder/README.md)
2. **Firmware ESP32-CAM**: Baca panduan di [`hardware/esp32_cam/README.md`](hardware/esp32_cam/README.md)
3. **Dokumentasi & Skema PCB**: Skematik vektor dan panduan fabrikasi di [`hardware/pcb/README.md`](hardware/pcb/README.md)
4. **Catatan Kalibrasi & Validasi**: Hasil pengujian 8 aspek PRD di [`hardware/CALIBRATION_AND_TEST_LOG.md`](hardware/CALIBRATION_AND_TEST_LOG.md)
