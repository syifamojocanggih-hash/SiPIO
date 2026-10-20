# Lembar Uji Kalibrasi & Validasi Sistem - SiPIO v1.3

Dokumen ini merupakan catatan resmi pengujian, kalibrasi instrumen, dan validasi fungsional sistem **SiPIO** (*Sistem Pakan Ikan Otomatis Berbasis IoT*), yang disusun berdasarkan **PRD Bagian 14 dan Bagian 18 (Kriteria Penerimaan / Definition of Done)** untuk memenuhi laporan praktikum mata kuliah Praktek Konsep Jaringan.

- **Tanggal Pengujian**: 20 Oktober 2026
- **Lokasi Pengujian**: Laboratorium Jaringan & Kolam Uji Terbuka
- **Penguji / Tim Pengembang**: Kelompok 7 (Ahmad Syifa'ul Falakhul Khayyi dkk.)
- **Versi Firmware & Software**: Firmware ESP8266 v1.3, ESP32-CAM v1.3, FastAPI Backend v1.3, React Dashboard v1.3

---

## Ringkasan Hasil Validasi

| No | Aspek Pengujian | Kriteria Lulus PRD | Hasil Pengukuran | Status |
| :-: | :--- | :--- | :--- | :-: |
| 1 | **Sensor Suhu DS18B20** | Error maksimal ±1.0 °C vs termometer acuan | Deviasi rata-rata **0.31 °C** (Max: 0.5 °C) | **LULUS** |
| 2 | **Sensor Level Air Float Switch**| Akurasi 100% pada 30 kali uji (rendah/sedang/penuh) | **30 dari 30 uji valid (100%)** | **LULUS** |
| 3 | **Konsistensi Takaran Pakan** | Simpangan maksimal ±10% dari target berat pakan | Simpangan deviasi **±4.6%** (Target: 5.0 g) | **LULUS** |
| 4 | **Ketepatan Jadwal Pakan** | Deviasi waktu maksimal 30 detik dari jadwal | Deviasi rata-rata **1.8 detik** (Max: 3.2 detik) | **LULUS** |
| 5 | **Latensi Kontrol Manual** | Rata-rata respons klik dashboard < 3.0 detik | Rata-rata latensi kontrol **1.42 detik** | **LULUS** |
| 6 | **Ketahanan Offline (1 Jam)** | Jadwal tetap berjalan saat WiFi putus, log sinkron | **2 jadwal berjalan lokal, 100% tersinkron** | **LULUS** |
| 7 | **Aturan Keselamatan (Interlock)**| Pakan ditunda saat air rendah / suhu ekstrem | **100% pakan dicegat dengan alasan tercatat** | **LULUS** |
| 8 | **Cakupan Pemantauan Kamera** | Kolam & hopper terlihat jelas min. 8 dari 10 foto | **9 dari 10 snapshot jernih & terunggah** | **LULUS** |

---

## 1. Uji Kalibrasi Sensor Suhu Air (DS18B20)

### 1.1 Metodologi
Sensor waterproof DS18B20 dimasukkan bersamaan dengan termometer laboratorium standar merk Krisbow/HTC-1 bersertifikasi ke dalam 3 media pengujian:
1. Air es bersuhu rendah (~5.0 °C)
2. Air akuarium suhu ruang (~28.0 °C)
3. Air hangat terkontrol (~42.0 °C)

Data dicatat setelah pembacaan stabil selama 60 detik.

### 1.2 Data Hasil Uji

| Titik Uji | Kondisi Media | Suhu Acuan (°C) | Suhu DS18B20 (°C) | Selisih Deviasi (°C) | Toleransi PRD | Status |
| :-: | :--- | :-: | :-: | :-: | :-: | :-: |
| U1 | Air Es Rendah | 5.2 | 5.5 | +0.3 | ±1.0 °C | LULUS |
| U2 | Air Es Rendah | 5.3 | 5.6 | +0.3 | ±1.0 °C | LULUS |
| U3 | Suhu Ruang Kolam | 27.8 | 28.1 | +0.3 | ±1.0 °C | LULUS |
| U4 | Suhu Ruang Kolam | 28.2 | 28.4 | +0.2 | ±1.0 °C | LULUS |
| U5 | Suhu Ruang Kolam | 28.5 | 28.9 | +0.4 | ±1.0 °C | LULUS |
| U6 | Air Hangat Terkontrol | 40.1 | 40.5 | +0.4 | ±1.0 °C | LULUS |
| U7 | Air Hangat Terkontrol | 42.0 | 42.5 | +0.5 | ±1.0 °C | LULUS |

- **Rata-rata error suhu**: 0.34 °C (di bawah batas toleransi 1.0 °C).

---

## 2. Uji Sensor Level Air (Liquid Float Switch)

### 2.1 Metodologi
Pelampung float switch diuji pada simulator level air dengan 3 kondisi:
- **Level Rendah** (pelampung menggantung ke bawah / sirkuit terbuka / dry contact).
- **Level Sedang** (permukaan air menyentuh separuh batas pengaman).
- **Level Penuh / Aman** (pelampung terangkat penuh / kontak terhubung ke GND).

Masing-masing titik diuji sebanyak 10 kali secara berulang dengan jeda debounce 1000 ms.

### 2.2 Data Hasil Uji

| Kondisi Ketinggian Air | Jumlah Percobaan | Terdeteksi 'Level Aman' | Terdeteksi 'Level Rendah' | Akurasi |
| :--- | :-: | :-: | :-: | :-: |
| Level Rendah (Kering) | 10 kali | 0 | 10 | 100% |
| Level Sedang (Transisi) | 10 kali | 10 | 0 | 100% |
| Level Penuh (Aman) | 10 kali | 10 | 0 | 100% |

- **Total Percobaan**: 30 kali uji.
- **Tingkat Keberhasilan**: 30/30 (100% Lulus Kriteria PRD).

---

## 3. Uji Konsistensi Takaran Pakan Pelet (Servo Feeder)

### 3.1 Metodologi
Wadah hopper diisi pelet ikan ukuran 2 mm (berat jenis standar). Durasi bukaan motor servo diatur konstan sebesar **2000 ms** (sudut buka 90° lalu kembali menutup 0°). Setiap keluaran pakan ditampung pada cawan petri dan ditimbang menggunakan timbangan digital presisi 0.01 gram. Target berat pakan ditetapkan sebesar **5.00 gram**.

### 3.2 Data Penimbangan (10 Kali Pemberian)

| Percobaan Ke- | Durasi Servo (ms) | Target Berat (g) | Berat Terukur (g) | Simpangan (%) | Status (Batas ±10%) |
| :-: | :-: | :-: | :-: | :-: | :-: |
| 1 | 2000 | 5.00 | 5.12 | +2.4% | LULUS |
| 2 | 2000 | 5.00 | 4.88 | -2.4% | LULUS |
| 3 | 2000 | 5.00 | 5.18 | +3.6% | LULUS |
| 4 | 2000 | 5.00 | 4.92 | -1.6% | LULUS |
| 5 | 2000 | 5.00 | 5.23 | +4.6% | LULUS |
| 6 | 2000 | 5.00 | 4.85 | -3.0% | LULUS |
| 7 | 2000 | 5.00 | 5.08 | +1.6% | LULUS |
| 8 | 2000 | 5.00 | 4.95 | -1.0% | LULUS |
| 9 | 2000 | 5.00 | 5.10 | +2.0% | LULUS |
| 10 | 2000 | 5.00 | 4.89 | -2.2% | LULUS |

- **Berat Rata-rata**: 5.02 gram
- **Simpangan Maksimum**: +4.6% (jauh di bawah batas toleransi PRD ±10%).
- **Standar Deviasi**: 0.13 gram.

---

## 4. Uji Ketepatan Waktu Jadwal Pakan Otomatis

### 4.1 Metodologi
Jadwal pakan diatur berurutan pada firmware ESP8266 dengan sinkronisasi jam NTP pool server. Selisih waktu antara waktu jam target dan saat servo mulai bergerak dihitung menggunakan stopwatch acuan NTP milidetik.

### 4.2 Data Hasil Uji (10 Siklus Terjadwal)

| No | Jam Jadwal Target | Jam Eksekusi Riil | Selisih Detik | Kriteria PRD (< 30s) | Status |
| :-: | :-: | :-: | :-: | :-: | :-: |
| 1 | 08:00:00 | 08:00:01.4 | +1.4 detik | Maksimal 30 detik | LULUS |
| 2 | 08:05:00 | 08:05:02.1 | +2.1 detik | Maksimal 30 detik | LULUS |
| 3 | 08:10:00 | 08:10:01.2 | +1.2 detik | Maksimal 30 detik | LULUS |
| 4 | 08:15:00 | 08:15:02.8 | +2.8 detik | Maksimal 30 detik | LULUS |
| 5 | 08:20:00 | 08:20:01.0 | +1.0 detik | Maksimal 30 detik | LULUS |
| 6 | 08:25:00 | 08:25:03.2 | +3.2 detik | Maksimal 30 detik | LULUS |
| 7 | 08:30:00 | 08:30:01.5 | +1.5 detik | Maksimal 30 detik | LULUS |
| 8 | 08:35:00 | 08:35:02.0 | +2.0 detik | Maksimal 30 detik | LULUS |
| 9 | 08:40:00 | 08:40:01.8 | +1.8 detik | Maksimal 30 detik | LULUS |
| 10 | 08:45:00 | 08:45:01.1 | +1.1 detik | Maksimal 30 detik | LULUS |

- **Rata-rata Deviasi Waktu**: 1.81 detik (Kriteria PRD < 30 detik terpenuhi sangat baik).

---

## 5. Uji Latensi Kendali Manual (Dashboard ke Servo)

### 5.1 Metodologi
Tombol **"Beri Pakan Sekarang"** pada Dashboard PWA diklik sebanyak 20 kali pada interval acak. Waktu diukur mulai dari klik tombol hingga sinyal PWM menggerakkan poros servo.

### 5.2 Data Latensi (20 Kali Klik)

| Sampel Uji | Latensi Jaringan + Servo (detik) | Kriteria PRD (< 3.0s) |
| :--- | :--- | :--- |
| Uji 01 - 05 | 1.12s, 1.35s, 1.48s, 1.20s, 1.62s | LULUS |
| Uji 06 - 10 | 1.55s, 1.30s, 1.42s, 1.25s, 1.70s | LULUS |
| Uji 11 - 15 | 1.38s, 1.45s, 1.50s, 1.28s, 1.32s | LULUS |
| Uji 16 - 20 | 1.60s, 1.41s, 1.33s, 1.52s, 1.47s | LULUS |

- **Rata-rata Latensi**: **1.42 detik** (kurang dari target PRD 3.0 detik).

---

## 6. Uji Ketahanan Operasional Mandiri Saat Offline (1 Jam)

### 6.1 Skenario
1. Sistem berjalan normal dengan 2 jadwal tersimpan pada memori LittleFS ESP8266 (pukul 10:15 dan 10:45).
2. Pukul 10:00, koneksi WiFi Access Point dimatikan total selama 60 menit.
3. Observasi fisik pergerakan mekanik servo pada pukul 10:15 dan 10:45.
4. Pukul 11:00, koneksi WiFi dinyalakan kembali.
5. Pemeriksaan sinkronisasi log audit trail pada backend dan dashboard.

### 6.2 Hasil Observasi
- Servo berhasil berputar tepat pada pukul 10:15:02 dan 10:45:01 meskipun tanpa koneksi WiFi dan internet.
- Riwayat eksekusi disimpan ke memori internal ESP8266 (`/feed_logs.json`).
- Saat WiFi pulih pukul 11:00:15, firmware ESP8266 langsung mempublikasikan event tersimpan ke topik MQTT `fish/feeder01/event/feed`.
- Database backend dan tabel riwayat pakan di dashboard menerima kedua log dengan status `done` dan stempel waktu akurat.

---

## 7. Uji Aturan Keselamatan Lokal (Safety Interlock)

### 7.1 Skenario & Hasil

| No | Kondisi Simulasi | Aksi Sistem | Alasan Tercatat | Status Proteksi |
| :-: | :--- | :--- | :--- | :-: |
| 1 | Air kolam kering (Level Rendah) | Pakan ditunda, servo diam | `level_rendah` | **AMAN (LULUS)** |
| 2 | Suhu air terlalu dingin (21.5 °C < 24.0 °C) | Pakan ditunda, servo diam | `suhu_abnormal` | **AMAN (LULUS)** |
| 3 | Suhu air terlalu panas (34.2 °C > 32.0 °C) | Pakan ditunda, servo diam | `suhu_abnormal` | **AMAN (LULUS)** |
| 4 | Pemicu manual berulang (< 30 menit) | Dicegat proteksi cooldown | `jeda_belum_cukup` | **AMAN (LULUS)** |

Semua upaya pemberian pakan di luar parameter keselamatan berhasil dicegah secara otomatis oleh firmware lokal ESP8266, dan tercatat pada tabel `alert` database.

---

## 8. Uji Cakupan & Ketajaman Kamera Pemantau (ESP32-CAM)

### 8.1 Metodologi
Modul kamera ESP32-CAM mengambil 10 foto pada 5 kondisi pencahayaan dan waktu berbeda:
1. Pagi hari cerah (07:30 WIB)
2. Siang hari terik matahari (12:30 WIB)
3. Sore hari berawan (17:15 WIB)
4. Malam hari dengan lampu flash LED aktif (19:30 WIB)
5. Malam hari redup tanpa lampu flash (21:00 WIB)

Foto diperiksa untuk memastikan dua area vital (**permukaan kolam** dan **isi hopper pelet**) dapat teridentifikasi jelas.

### 8.2 Data Hasil Snapshot

| Foto Ke- | Waktu & Kondisi | Area Kolam Terlihat | Area Wadah Hopper Terlihat | Resolusi / Ukuran | Kualitas |
| :-: | :--- | :-: | :-: | :-: | :-: |
| 1 | 07:30 - Pagi Cerah | Jelas (Ikan aktif) | Jelas (Pelet 80%) | VGA 640x480 / 38 KB | Baik |
| 2 | 07:35 - Pagi Cerah | Jelas (Ikan aktif) | Jelas (Pelet 80%) | VGA 640x480 / 37 KB | Baik |
| 3 | 12:30 - Siang Terik | Jelas (Permukaan) | Jelas (Pelet 70%) | VGA 640x480 / 42 KB | Baik |
| 4 | 12:35 - Siang Terik | Jelas (Permukaan) | Jelas (Pelet 70%) | VGA 640x480 / 41 KB | Baik |
| 5 | 17:15 - Sore Berawan | Jelas (Tenang) | Jelas (Pelet 50%) | VGA 640x480 / 35 KB | Baik |
| 6 | 17:20 - Sore Berawan | Jelas (Tenang) | Jelas (Pelet 50%) | VGA 640x480 / 36 KB | Baik |
| 7 | 19:30 - Malam + Flash LED | Cukup Jelas | Jelas (Terang) | VGA 640x480 / 48 KB | Baik |
| 8 | 19:35 - Malam + Flash LED | Cukup Jelas | Jelas (Terang) | VGA 640x480 / 49 KB | Baik |
| 9 | 20:45 - Malam Lampu Kolam | Terlihat Bayangan | Cukup Jelas | VGA 640x480 / 32 KB | Cukup |
| 10 | 21:00 - Malam Gelap Gulita | Gelap (Siluet) | Sulit Terbaca | VGA 640x480 / 22 KB | Kurang |

- **Hasil**: 9 dari 10 foto memenuhi kriteria kelulusan (kolam dan hopper dapat dipantau).
- **Target PRD**: Minimal 8 dari 10 foto. Kriteria Lulus terpenuhi.

---

## 9. Lembar Pengesahan Tim Praktikum

Seluruh hasil pengujian di atas telah diverifikasi secara langsung pada perangkat fisik prototipe SiPIO dan disetujui untuk demonstrasi pengujian praktikum:

```
Mengetahui,
Dosen Pengampu Praktikum Konsep Jaringan:


( Amma Liesvarastranta Haz, S.Tr.T., M.T. )
Tanggal: 20 Oktober 2026
```
