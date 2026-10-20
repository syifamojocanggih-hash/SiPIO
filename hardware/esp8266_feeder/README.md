# Panduan Firmware ESP8266 Feeder Node - SiPIO

Modul mikrokontroler **ESP8266** bertindak sebagai *field controller* kolam yang bertugas mengukur suhu air, memantau pelampung pengaman, memutar motor servo pakan pelet, serta mengeksekusi jadwal pakan lokal secara mandiri meskipun jaringan internet terputus.

---

## 1. Daftar Komponen Perangkat Keras

1. **Board Mikrokontroler**: NodeMCU ESP8266 (v2 / v3) atau WeMos D1 Mini.
2. **Sensor Suhu Air**: DS18B20 Waterproof Probe Stainless Steel.
3. **Resistor Pull-up**: 1x Resistor 4.7kΩ (antara kabel Data DS18B20 dan VCC 3.3V).
4. **Sensor Ketinggian Air**: Sakelar Pelampung Air (Liquid Float Switch).
5. **Aktuator Pakan**: Motor Servo (TowerPro SG90 / MG995 Metal Gear / Continuous Servo).
6. **Catu Daya**: Adaptor 5V 2A / Step-down Buck Converter (disarankan memberi daya servo dari 5V eksternal, bukan langsung dari pin 3.3V board).

---

## 2. Diagram Pinout & Pengkabelan (Wiring)

| Komponen | Pin Sensor / Modul | Pin NodeMCU (ESP8266) | Keterangan Penting |
| :--- | :--- | :--- | :--- |
| **DS18B20** | VCC (Merah) | `3V3` | Tegangan kerja sensor |
| | GND (Hitam) | `GND` | Ground bersama (*common ground*) |
| | DATA (Kuning/Putih) | `D2` (`GPIO4`) | Pasang resistor 4.7kΩ antara `D2` dan `3V3` |
| **Float Switch** | Kabel 1 | `D5` (`GPIO14`) | Menggunakan internal `INPUT_PULLUP` |
| | Kabel 2 | `GND` | Saat air cukup, switch terhubung ke GND |
| **Motor Servo** | Signal (Oranye/Kuning)| `D1` (`GPIO5`) | Sinyal kontrol PWM (PRD Tabel 10.2; alternatif: `D6`/`GPIO12`) |
| | VCC (Merah) | `VIN` / `5V Eksternal`| **Jangan** pakai 3.3V (kurang daya) |
| | GND (Cokelat/Hitam) | `GND` | Wajib sambung ground bersama |
| **LED Status** | Internal On-Board | `D4` (`GPIO2`) | Berkedip saat pakan & pengiriman data |

> ⚠️ **Catatan Penting Daya Servo**:  
> Motor servo pelet memerlukan lonjakan arus (*inrush current*) hingga 500mA-1A saat berputar. Selalu hubungkan kabel daya merah servo ke pin **VIN (5V)** atau sumber 5V terpisah dengan Ground yang digabungkan (*Common Ground*) ke ESP8266 untuk mencegah board ESP me-reset sendiri (*brownout*).

---

## 3. Pustaka (Libraries) yang Diperlukan

Buka **Arduino IDE** $\rightarrow$ **Tools** $\rightarrow$ **Manage Libraries...**, lalu cari dan instal:

1. **PubSubClient** oleh *Nick O'Leary* (v2.8+)
2. **ArduinoJson** oleh *Benoit Blanchon* (v6.x atau v7.x)
3. **OneWire** oleh *Paul Stoffregen* (v2.3+)
4. **DallasTemperature** oleh *Miles Burton* (v3.9+)

*(Pustaka `ESP8266WiFi`, `Servo`, `LittleFS`, dan `time` sudah merupakan pustaka bawaan dari ESP8266 Board Package).*

---

## 4. Pengaturan Arduino IDE

1. **Board**: Pilih `NodeMCU 1.0 (ESP-12E Module)`
2. **Flash Size**: `4MB (FS: 1MB OTA: ~1019KB)`
3. **Upload Speed**: `115200` atau `921600`
4. **Port**: Pilih port COM yang terdeteksi (misal: `COM3`)

---

## 5. Langkah Konfigurasi & Flashing

1. Salin file `config.h.example` menjadi `config.h`:
   ```bash
   cp config.h.example config.h
   ```
2. Buka `config.h` dan sesuaikan:
   - `WIFI_SSID` & `WIFI_PASSWORD` (koneksi WiFi kolam)
   - `MQTT_SERVER` (alamat IP laptop/komputer server SiPIO)
3. Buka file [`esp8266_feeder.ino`](file:///c:/Users/ASUS/Documents/code/SiPIO/hardware/esp8266_feeder/esp8266_feeder.ino) di Arduino IDE.
4. Klik **Verify** (tanda centang) untuk memeriksa kompilasi.
5. Hubungkan NodeMCU via kabel Micro-USB, lalu klik **Upload** (tanda panah kanan).
6. Buka **Serial Monitor** pada baudrate `115200` untuk memantau status booting, sinkronisasi jam NTP, dan telemetri sensor.
