# SiPIO — Sistem Pemberi Pakan Ikan Otomatis (IoT)

Struktur proyek SiPIO telah dipisahkan menjadi 2 folder utama (**Frontend** dan **Backend**) agar pengelolaan, aktivasi, dan pengujian layanan menjadi lebih rapi dan modular:

```text
SiPIO/
├── frontend/               # Antarmuka PWA Dashboard (React 19 + Vite)
│   ├── src/                # Komponen UI, Design Tokens, Telemetri Hooks
│   ├── public/             # Ikon PWA, Manifest, Gambar Kamera Kolam
│   ├── index.html          # Shell HTML & Meta PWA
│   ├── vite.config.js      # Konfigurasi Vite & VitePWA Plugin
│   └── package.json        # Dependensi frontend
│
├── backend/                # Layanan Server IoT & REST API (Node.js + Express)
│   ├── src/
│   │   └── server.js       # Express Server (API Sensor, Servo Feed, SSE Stream)
│   ├── .env.example        # Konfigurasi Port & Koneksi Perangkat
│   └── package.json        # Dependensi backend
│
├── DESIGN.md               # Dokumentasi Design System (White & Blue High Contrast)
├── package.json            # Root Workspace Script Runner
└── README.md               # Dokumentasi panduan proyek
```

---

## Cara Menjalankan Proyek

Anda dapat masuk langsung ke masing-masing folder (`cd frontend` atau `cd backend`) ataupun menjalankannya langsung dari folder utama (root):

### Opsi 1: Masuk Langsung ke Folder (Sesuai Kebutuhan)

#### 1. Menjalankan Frontend (PWA Dashboard)
```bash
cd frontend
npm run dev
```
*Aplikasi frontend akan aktif di: `http://localhost:5173/`*

#### 2. Menjalankan Backend (IoT API Service)
```bash
cd backend
npm run dev
```
*Layanan backend akan aktif di: `http://localhost:5000/`*
*Endpoint cek kesehatan: `http://localhost:5000/api/health`*

---

### Opsi 2: Jalankan Langsung dari Root (Tanpa Perlu `cd`)

Dari folder utama `SiPIO`, Anda cukup menjalankan:

* **Aktifkan Frontend saja**:
  ```bash
  npm run frontend
  ```
* **Aktifkan Backend saja**:
  ```bash
  npm run backend
  ```
* **Build Bundle Frontend PWA**:
  ```bash
  npm run build
  ```

---

## Fitur Utama

1. **Frontend PWA (Simple White & Blue — Outdoor Ready)**:
   * Kontras tinggi (WCAG AAA) nyaman di bawah terik sinar matahari.
   * Mobile-first dengan *Bottom Navigation Bar* satu jempol.
   * Dukungan penuh offline cache & dialog panduan instalasi PWA (Android & iOS).
2. **Backend IoT Service**:
   * Endpoint monitoring suhu DS18B20 & float switch level air.
   * Kontrol putaran servo feeder manual & sinkronisasi jadwal otomatis ke LittleFS.
   * Real-time streaming telemetri via *Server-Sent Events (SSE)* di `/api/telemetry/stream`.
