# SiPIO Design System & Tokens
> **Sistem Pemberi Pakan Ikan Otomatis (IoT)**  
> Filosofi Desain: **Simple White & Blue - High Contrast Outdoor Ready**

Dokumen ini mendefinisikan standar visual, token CSS, dan pedoman antarmuka untuk aplikasi SiPIO. Desain dirancang khusus agar **mudah dibaca di bawah sinar matahari langsung (high sunlight contrast)** oleh petani tambak dan hobiis akuakultur, responsif mobile-first, serta menggunakan tipografi modern yang tajam.

---

## 1. Konteks Produk & Pengguna

* **Produk**: Dashboard Web & PWA monitoring telemetri kolam (suhu DS18B20, level air float switch, pakan otomatis ESP8266, dan snapshot kamera ESP32-CAM).
* **Target Pengguna**: Petani ikan, pembudidaya tambak, dan penghobi akuakultur yang mengakses dashboard menggunakan ponsel pintar langsung di lokasi kolam luar ruangan (outdoor).
* **Tantangan Lingkungan**: Silau matahari terik (*glare*), layar smartphone dengan refleksi tinggi, serta operasional satu tangan (*one-thumb reach*).
* **Solusi Visual**: Palet **Putih & Biru Bersih** dengan teks kontras tinggi (*deep slate black*), border komponen tegas, dan tombol aksi berdimensi jelas tanpa ornamen glow/gradien yang kabur.

---

## 2. Dials (Antislop Framework)

| Parameter | Level | Penjelasan |
| :--- | :--- | :--- |
| **ENERGY** | **2 / 5** | Tenang, terarah, dan profesional. Fokus utama adalah kejelasan metrik kolam dan aksi tombol pakan. |
| **RHYTHM** | **2 / 5** | Struktur teratur dan konsisten: ringkasan metrik di atas, aksi cepat di tengah, pemantau kamera, grafik tren, dan riwayat log di bawah. |
| **MOTION** | **1 / 5** | Fungsional dan cepat (150ms - 250ms). Tidak ada animasi melayang atau memantul yang memperlambat respon pengguna di lapangan. |

---

## 3. Palet Warna (Simple White & Blue)

Palet warna dibatasi pada 2 warna inti (Putih & Biru Terang) ditambah warna netral berdaya kontras tinggi dan 3 warna status fungsional.

### 3.1 Mode Terang (Default - Mode Siang Kolam)
Mode utama untuk keterbacaan optimal di bawah sinar matahari langsung:

| Token CSS | Nilai Hex | Peran / Penggunaan | Rasio Kontras (vs Surface) |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#f8fafc` | Latar belakang kanvas aplikasi | 1.05:1 (Slate sejuk) |
| `--bg-surface` | `#ffffff` | Kontainer utama & header | Dasar putih bersih |
| `--bg-card` | `#ffffff` | Kartu komponen & panel metrik | Dasar putih bersih |
| `--bg-card-subtle` | `#f1f5f9` | Latar input, chip filter, tombol sekunder | 1.15:1 |
| `--bg-card-hover` | `#e0f2fe` | State hover / active pada baris tabel & item | Highlight biru muda |
| `--border-color` | `#cbd5e1` | Garis tepi kartu & pemisah (solid, tegas) | Kontras jelas di bawah terik |
| `--border-highlight` | `#0284c7` | Garis tepi elemen aktif / fokus | Biru primer kontras |
| `--text-main` | `#0f172a` | Judul, angka metrik sensor, label tombol | **13.5:1 (WCAG AAA)** |
| `--text-muted` | `#334155` | Label metrik, keterangan tanggal, subteks | **7.2:1 (WCAG AAA)** |
| `--text-dim` | `#64748b` | Keterangan sekunder / batas toleransi | **4.6:1 (WCAG AA)** |
| `--accent-primary` | `#0284c7` | Tombol CTA pakan, indikator aktif, link utama | Biru Royal / Sky (#0284c7) |
| `--accent-hover` | `#0369a1` | State hover / press pada tombol primer | Biru Tua Tegas |
| `--accent-soft` | `#e0f2fe` | Latar badge info dan tag aktif | Biru Lembut |

### 3.2 Warna Status Telemetri (High Contrast)

| Token CSS | Nilai Hex | Latar Badge | Arti & Keterbacaan |
| :--- | :--- | :--- | :--- |
| `--status-emerald` | `#059669` | `#ecfdf5` (border: `#a7f3d0`) | **Optimal / Normal**: Suhu aman (24°-32°C), Level air cukup, Feeder online. |
| `--status-amber` | `#d97706` | `#fffbeb` (border: `#fde68a`) | **Peringatan**: Suhu dingin (<24°C), jeda pakan terlalu dekat (<30 menit). |
| `--status-rose` | `#dc2626` | `#fef2f2` (border: `#fecaca`) | **Bahaya / Kritis**: Suhu panas (>32°C), float switch rendah, pakan ditolak. |

### 3.3 Mode Gelap (Mode Malam Kolam)
Untuk pengecekan malam hari tanpa menyilaukan mata peternak:
* `--bg-base`: `#0b1324` (Midnight Deep Navy)
* `--bg-surface`: `#111d35`
* `--bg-card`: `#152442`
* `--border-color`: `#263c63`
* `--text-main`: `#ffffff`
* `--text-muted`: `#cbd5e1`
* `--accent-primary`: `#38bdf8`

---

## 4. Tipografi Modern & Keterbacaan Sensor

Font dipilih dengan pertimbangan keterbacaan sekilas (*glanceability*) di layar ponsel:

* **Font Utama (Sans)**: `'Plus Jakarta Sans'`, sans-serif geometris modern dengan bukaan huruf lebar (*wide aperture*) sehingga huruf tidak tampak menyatu saat dilihat dari jarak 50-70 cm di luar ruangan.
* **Font Monospace (Data & Angka)**: `'JetBrains Mono'`, monospace dengan angka tabular (`tabular-nums`) sehingga angka derajat suhu, detik durasi servo, dan waktu tidak bergeser saat data terbarukan.

### Skala Tipografi (Mobile-First)

| Skala | Ukuran | Bobot (Weight) | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Display Metric** | `2.25rem` (36px) | 800 Bold | Nilai suhu real-time (28.4°C), jam pakan |
| **Heading 1** | `1.25rem` (20px) | 800 Bold | Nama brand (SiPio), judul header utama |
| **Heading 2** | `1.05rem` (17px) | 700 SemiBold | Judul kartu panel (Kontrol Manual, Kamera, dll.) |
| **Body Regular** | `0.9rem` (14.5px) | 500 / 600 | Teks isi, baris tabel, deskripsi panduan |
| **Label / Subtitle** | `0.8rem` (13px) | 600 Medium | Subjudul kartu, label parameter sensor |
| **Badge / Caption** | `0.72rem` (11.5px) | 700 Bold (Caps) | Tag status, versi perangkat, RSSI dBm |

---

## 5. Mobile-First Responsiveness & Ergonomi

1. **Touch Target Standar**:
   Semua tombol interaktif memiliki tinggi/lebar minimal **44px** (tombol manual feeding 54px untuk kemudahan penekanan darurat/satu jempol).
2. **Layout Adaptif**:
   * **Mobile (< 768px)**: 1 kolom penuh, padding kontainer 16px, tombol pakan selebar kartu untuk penekanan mantap.
   * **Tablet (768px - 991px)**: 2 kolom kartu metrik, susunan berdampingan.
   * **Desktop (>= 992px)**: Grid 2 kolom rasio 1.15fr : 0.85fr (Kontrol & Kamera di kiri, Grafik tren & Jadwal di kanan).
3. **Pencegahan Silau Matahari**:
   * Tidak menggunakan font warna abu-abu tipis (seperti `#9ca3af` di atas putih yang memudar).
   * Border kartu dipertegas dengan ketebalan 1px solid `#cbd5e1`.
   * Tombol utama pakan menggunakan warna biru royal pekat `#0284c7` dengan teks putih tebal.
4. **Indikator Aksesibilitas**:
   Fokus keyboard / navigasi ditandai dengan `outline: 2px solid #0284c7` dengan offset 2px.
