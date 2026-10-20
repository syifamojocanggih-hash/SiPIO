# Panduan Firmware ESP32-CAM Node - SiPIO

Modul **ESP32-CAM** (AI-Thinker) bertugas mengambil foto berkala kondisi permukaan kolam ikan dan sisa pakan di wadah pelet (*hopper*), lalu mengunggahnya secara otomatis ke backend FastAPI SiPIO via HTTP POST Multipart.

---

## 1. Skema Pengkabelan Flashing (USB to TTL / FTDI)

Modul ESP32-CAM tidak memiliki chip USB-to-Serial terpasang, sehingga proses flashing memerlukan modul programmer eksternal (FTDI FT232RL, CP2102, atau CH340):

| Pin ESP32-CAM | Pin USB to TTL (FTDI) | Catatan Penting |
| :--- | :--- | :--- |
| `5V` | `5V` (atau `VCC 5V`) | **Wajib 5V minimal 1.5A** untuk mencegah *brownout* |
| `GND` | `GND` | Hubungkan ground bersama |
| `U0R` (`GPIO3` / RX) | `TXD` | Menyilang (RX $\rightarrow$ TX) |
| `U0T` (`GPIO1` / TX) | `RXD` | Menyilang (TX $\rightarrow$ RX) |
| `GPIO 0` | `GND` | **Jumper ke GND saat Flashing/Upload** |

> ⚠️ **PENTING SAAT FLASHING**:
> 1. Hubungkan pin **`GPIO 0` ke `GND`** sebelum menghubungkan kabel USB ke laptop.
> 2. Tekan tombol **RST (Reset)** pada ESP32-CAM satu kali untuk masuk ke *Download / Flashing Mode*.
> 3. Lakukan **Upload** dari Arduino IDE.
> 4. Setelah tulisan *"Done uploading / Leaving... Hard resetting via RTS pin..."* muncul di Arduino IDE:
>    - **Lepaskan kabel jumper `GPIO 0` dari `GND`**.
>    - Tekan tombol **RST** sekali lagi untuk menjalankan program secara normal.

---

## 2. Pengaturan di Arduino IDE

1. Pastikan Board Package ESP32 terinstal:
   - Masuk ke **File** $\rightarrow$ **Preferences**, pastikan URL board manager berikut ada:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
2. Konfigurasi menu **Tools**:
   - **Board**: `AI Thinker ESP32-CAM`
   - **CPU Frequency**: `240MHz (WiFi/BT)`
   - **Flash Frequency**: `80MHz`
   - **Flash Mode**: `QIO`
   - **Partition Scheme**: `Huge APP (3MB No OTA/1MB SPIFFS)`
   - **Core Debug Level**: `None` (atau `Info`)
   - **PSRAM**: `Enabled` *(Sangat krusial untuk resolusi VGA 640x480)*
   - **Upload Speed**: `115200` atau `921600`
   - **Port**: Port COM FTDI yang terdeteksi (contoh: `COM4`)

---

## 3. Langkah Konfigurasi & Upload

1. Salin file template konfigurasi:
   ```bash
   cp config.h.example config.h
   ```
2. Sesuaikan nilai di `config.h`:
   - `WIFI_SSID` & `WIFI_PASSWORD` (koneksi WiFi kolam)
   - `SERVER_HOST`: Alamat IP komputer/server FastAPI SiPIO (contoh: `192.168.1.100`)
   - `SERVER_PORT`: `8000`
   - `CAMERA_AREA`: `"kolam"` (atau `"hopper"`)
   - `CAPTURE_INTERVAL_SEC`: `300` (setiap 5 menit)
3. Buka [`esp32_cam.ino`](file:///c:/Users/ASUS/Documents/code/SiPIO/hardware/esp32_cam/esp32_cam.ino) di Arduino IDE.
4. Klik tombol **Upload**.
5. Buka **Serial Monitor** pada baudrate `115200`. Jika sukses, modul akan menampilkan:
   ```text
   [PSRAM] Memori PSRAM terdeteksi (4MB). Menggunakan resolusi VGA tinggi.
   [WiFi] Terhubung! IP Kamera: 192.168.1.150 | RSSI: -54 dBm
   [KAMERA] Foto berhasil diambil! Ukuran: 28450 bytes (640x480)
   [UPLOAD] SUKSES! Foto kolam berhasil diperbarui di Dashboard SiPIO.
   ```

---

## 4. Pemecahan Masalah (Troubleshooting)

- **Masalah: `Brownout detector was triggered` / Board restart berulang kali**:
  - *Penyebab*: Modul kamera membutuhkan lonjakan arus sesaat hingga 350-500mA saat sensor diaktifkan dan modul WiFi mentransmisikan paket.
  - *Solusi*: Berikan daya 5V dari catu daya mandiri dengan arus minimal 1.5A–2A. Jangan gunakan output 3.3V FTDI. Pasang kapasitor elko 100uF - 470uF antara pin `5V` dan `GND` ESP32-CAM jika perlu.
- **Masalah: `Camera probe failed with error 0x20001`**:
  - *Penyebab*: Konektor kabel pita sensor OV2640 longgar atau miring.
  - *Solusi*: Buka pengait hitam konektor FPC kamera, luruskan kabel pita emasnya, lalu kunci kembali dengan rapat.
