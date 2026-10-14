# SiPIO — Sistem Pemantau Ikan Otomatis (IoT)

Struktur proyek SiPIO dipisahkan menjadi 2 folder utama (**Frontend** dan **Backend**) agar pengelolaan, aktivasi, dan pengujian layanan menjadi lebih rapi dan modular:

```text
SiPIO/
├── frontend/               # Antarmuka PWA Dashboard (React 19 + Vite)
│   ├── src/                # Komponen UI, Design Tokens, WebSocket Client
│   ├── public/             # Ikon PWA, Manifest, Tangkapan Layar Kamera
│   ├── index.html          # Shell HTML & Meta PWA
│   ├── vite.config.js      # Konfigurasi Vite, Proxy & Workbox Service Worker
│   └── package.json        # Dependensi frontend
│
├── backend/                # Layanan Backend FastAPI, WebSocket & MQTT Bridge
│   ├── main.py             # Server FastAPI (REST API, WebSocket /ws/telemetry, MQTT Broker)
│   ├── requirements.txt    # Dependensi Python (FastAPI, Uvicorn, WebSockets, Paho-MQTT)
│   ├── src/server.js       # Fallback server Node.js Express alternatif
│   └── package.json        # Script npm runner untuk backend
│
├── DESIGN.md               # Dokumentasi Design System (White & Blue High Contrast)
├── package.json            # Root Workspace Script Runner
└── README.md               # Dokumentasi panduan proyek
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
  *WebSocket Telemetri:* `ws://localhost:8000/ws/telemetry`

* **Build Bundle PWA Siap Produksi**:
  ```bash
  npm run build
  ```

---

## Arsitektur Koneksi Backend & IoT Broker

### 1. Saluran Komunikasi Frontend $\leftrightarrow$ Backend
- **WebSocket Streaming (`/ws/telemetry`)**: Mengalirkan data suhu DS18B20, level air float switch, dan sinyal RSSI secara bi-directional setiap kali sensor berubah atau setiap 3 detik.
- **REST API Endpoints**:
  - `GET /api/health` — Cek status sistem, koneksi broker MQTT, dan jumlah klien WS terhubung.
  - `GET /api/telemetry` — Data pembacaan sensor terkini.
  - `POST /api/feed` — Perintah pakan dengan proteksi sensor level air (otomatis menolak jika air surut).
  - `GET /api/schedules` & `POST /api/schedules` — Manajemen jadwal pakan LittleFS.
  - `GET /api/logs` — Riwayat audit feeding trail.

### 2. Integrasi Broker MQTT Perangkat Keras
Backend terhubung ke broker MQTT (Mosquitto/HiveMQ) dengan topik standar:
- **Langganan (Subscribe)**:
  - `sipio/feeder/telemetry` — Telemetri dari mikrokontroler ESP8266 (`temp`, `level_ok`, `rssi`).
  - `sipio/feeder/status` — Status online/offline LWT (*Last Will and Testament*) feeder.
  - `sipio/camera/status` — Status online/offline ESP32-CAM.
- **Publikasi (Publish)**:
  - `sipio/feeder/command` — Perintah putar servo motor (`{"action": "feed", "duration_ms": 2000}`).
  - `sipio/feeder/schedules` — Sinkronisasi array jadwal pakan ke penyimpanan LittleFS modul ESP.

> **Catatan Uji Mandiri:** Jika broker MQTT fisik belum aktif, backend FastAPI secara otomatis menjalankan simulasi mandiri (*self-simulated telemetry bridge*) sehingga antarmuka dashboard frontend tetap dapat diuji secara live 100% tanpa kendala!
