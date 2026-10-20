# Dokumentasi Desain PCB & Skema Rangkaian - SiPIO v1.3

Dokumen ini memuat spesifikasi teknis pembuatan papan sirkuit tercetak (Printed Circuit Board / PCB) untuk modul kontroler utama **SiPIO** (*Sistem Pakan Ikan Otomatis Berbasis IoT*), sesuai standar kebutuhan perangkat keras pada **PRD Bagian 10.3 dan Bagian 18**.

Tujuan desain PCB ini adalah menghilangkan penggunaan kabel *jumper* yang rentan longgar dan terkorosi di lingkungan kolam terbuka, serta menyediakan stabilitas daya terhadap lonjakan arus putaran motor servo.

---

## 1. Diagram Skematik Rangkaian

Skema vektor resolusi tinggi tersedia pada file:  
`hardware/pcb/schematic_diagram.svg`

```
  +-------------------------------------------------------------------------+
  |                          POWER INPUT (5V 2A DC)                         |
  |     [+5V] ------------------------+------------------+                  |
  |                                   |                  |                  |
  |     [GND] --------------------+   |   +----------+   |                  |
  +-------------------------------|---|---|----------|---|------------------+
                                  |   |   | [1000uF] |   |
                                  |   |   |   CAP    |   |
                                  |   |   +----------+   |
                                  |   |        |         |
                                  |   |   +----+----+    |
                                  |   +---| VIN     |    |
                                  +-------| GND     |    |
                                          |         |    |
                       +--------------+   | ESP8266 |    |
                       | DS18B20 3V3  |<--| 3V3     |    |
                       | 4.7k Pull-up |   |         |    |
                       | DATA         |-->| D2(GP4) |    |
                       +--------------+   |         |    |
                                          |         |    |
                       +--------------+   |         |    |
                       | FLOAT SWITCH |-->| D5(GP14)|    |
                       +--------------+   |         |    |
                                          |         |    |
                       +--------------+   |         |    |
                       | SERVO MOTOR  |<--| D1(GP5) |    |
                       | 5V Power Rail|<-----------------+
                       | GND Common   |<--+
                       +--------------+
```

---

## 2. Daftar Komponen (Bill of Materials / BOM)

| No | Komponen | Kuantitas | Package / Footprint | Fungsi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **NodeMCU ESP8266 v3 / v2** | 1 unit | Header Female 2x15 Pin 2.54mm | Mikrokontroler utama, WiFi & timer lokal |
| 2 | **Kapasitor Elektrolit 1000 µF / 16V** | 1 pcs | Radial Through-Hole (Ø 8-10mm) | Buffer peredam lonjakan arus inrush servo |
| 3 | **Resistor Karbon 4.7 kΩ (1/4W)** | 1 pcs | Resistor Through-Hole AXIAL-0.3 | Pull-up jalur One-Wire sensor suhu DS18B20 |
| 4 | **Terminal Screw 2-Pin 5.08mm** | 2 pcs | Pitch 5.08mm (Biru/Hijau) | Konektor Power Input 5V & Sensor Float Switch |
| 5 | **Terminal Screw 3-Pin 5.08mm** | 2 pcs | Pitch 5.08mm (Biru/Hijau) | Konektor DS18B20 Waterproof & Motor Servo |
| 6 | **Header Male 1x3 Pin 2.54mm** | 1 pcs | Vertikal | Opsi alternatif konektor servo 3-pin standar |
| 7 | **Dioda 1N5819 Schottky (Opsional)** | 1 pcs | DO-41 Through-Hole | Proteksi polaritas terbalik input 5V |
| 8 | **LED 3mm Indikator Daya (Merah)** | 1 pcs | LED Radial 3mm | Indikator visual kehadiran catu 5V |
| 9 | **Resistor 1 kΩ (1/4W) untuk LED** | 1 pcs | Resistor Through-Hole AXIAL-0.3 | Pembatas arus LED daya 5V |

---

## 3. Pemetaan Pin & Koneksi (Netlist)

Mengacu langsung pada **PRD Bagian 10.2 Tabel 10.2**:

| Terminal PCB | Pin NodeMCU | GPIO ESP8266 | Arah Sinyal | Catatan Sirkuit |
| :--- | :--- | :--- | :--- | :--- |
| **Power In 5V (+)** | `VIN` & Rel Servo | - | Masukan Daya | Dihubungkan ke rel daya 5V motor servo |
| **Power In GND (-)**| `GND` | - | Ground Bersama | Rel ground disatukan (*Common Ground*) |
| **DS18B20 DATA** | `D2` | `GPIO4` | Input Digital | Pull-up 4.7 kΩ terpasang ke pin 3.3V |
| **DS18B20 VCC** | `3V3` | - | Daya Sensor | Catu tegangan 3.3V dari regulator on-board NodeMCU |
| **DS18B20 GND** | `GND` | - | Ground | Menuju rel ground bersama |
| **Float Switch 1** | `D5` | `GPIO14` | Input Digital | Firmware mengaktifkan internal `INPUT_PULLUP` |
| **Float Switch 2** | `GND` | - | Ground | Terhubung ke GND (Level aman saat kontak tertutup) |
| **Servo PWM Signal**| `D1` | `GPIO5` | Output PWM | Sinyal kendali sudut/durasi buka sekat pelet |
| **Servo VCC (+)** | Rel Daya 5V | - | Catu Motor | Bersumber langsung dari 5V eksternal & kapasitor buffer |
| **Servo GND (-)** | `GND` | - | Ground | Menuju rel ground bersama |

---

## 4. Aturan Penting Desain Jalur (Routing & Layout Rules)

Sesuai arahan teknis **PRD Bagian 10.3**:

1. **Lebar Jalur Catu Daya (Power Traces)**:
   - Jalur `+5V` dan `GND` menuju motor servo wajib dirancang dengan lebar minimal **1.2 mm hingga 1.5 mm** (atau gunakan polygon plane / copper pour GND).
   - Motor servo SG90 / MG90S menghasilkan lonjakan arus sesaat mencapai 800 mA saat mulai berputar. Jalur tipis dapat menyebabkan penurunan tegangan (*voltage drop*) yang memicu ESP8266 reset (*brownout*).

2. **Penempatan Kapasitor Penstabil (Decoupling Capacitor)**:
   - Posisikan kapasitor elektrolit 1000 µF sedekat mungkin (kurang dari 15 mm) dengan terminal pin daya motor servo.
   - Perhatikan polaritas kapasitor (kaki minus bergaris putih terhubung ke GND).

3. **Socket Header untuk NodeMCU**:
   - Gunakan 2 baris soket *female header* 1x15 pin 2.54 mm dengan jarak antar baris 22.86 mm (0.9 inci) atau 27.94 mm (1.1 inci) sesuai tipe board NodeMCU yang digunakan (v2 Amica atau v3 Lolin).
   - NodeMCU tidak boleh disolder mati agar dapat dilepas pasang dengan mudah untuk keperluan penggantian atau flashing terpisah.

4. **Terminal Screw untuk Sensor Luar**:
   - Semua sensor yang menjangkau area basah (DS18B20 di air kolam dan Float Switch pelampung) wajib memakai Terminal Screw 5.08 mm berkunci baut agar tahan getaran dan tarikan fisik.

5. **Silkscreen & Polaritas**:
   - Berikan teks penanda jelas pada lapisan Silkscreen atas: label `+5V`, `GND`, `3V3`, `D1`, `D2`, `D5`, dan orientasi pin NodeMCU.

---

## 5. Arsitektur Modul Kamera ESP32-CAM (Terpisah)

Sesuai ketetapan arsitektur **PRD Versi 1.3**:
- Modul **ESP32-CAM tidak ikut dicetak pada PCB utama**.
- Hal ini didasarkan pada kebutuhan fisik: ESP32-CAM memerlukan sudut pandang visual di samping wadah feeder yang mengarah ke permukaan air kolam dan bukaan hopper secara bersamaan.
- Modul kamera diberi catu daya 5V mandiri melalui terminal daya paralel atau adaptor terpisah untuk mencegah interferensi frekuensi tinggi WiFi dan beban daya kompresi JPEG terhadap mikrokontroler sensor pakan.

---

## 6. Panduan Fabrikasi Gerber di EasyEDA / KiCad

Bagi tim mahasiswa yang akan mencetak PCB di penyedia fabrikasi lokal atau jasa cetak cepat:

1. Buat project baru di **EasyEDA** (atau **KiCad 7/8**).
2. Tambahkan komponen sesuai tabel BOM di atas.
3. Hubungkan pinout sesuai Netlist di Bagian 3.
4. Pada tampilan PCB Layout:
   - Dimensi board rekomendasi: **70 mm x 50 mm** (2-layer FR4, ketebalan 1.6 mm, tembaga 1 oz).
   - Buat 4 lubang mounting baut M3 di setiap sudut board (jarak 3.5 mm dari tepi).
   - Buat *Ground Pour* (GND Copper Fill) pada layer bawah (*Bottom Layer*) dan layer atas (*Top Layer*).
5. Jalankan **DRC (Design Rule Check)** dan pastikan 0 error / 0 clearance warning.
6. Klik **Fabrication Output** / **Generate Gerber Files (RS-274X)**.
7. Kompres seluruh file layer (`.GTL`, `.GBL`, `.GTS`, `.GBS`, `.GTO`, `.GBO`, `.TXT`, `.DRL`) ke dalam satu file ZIP `SiPIO_Feeder_PCB_v1.3_Gerber.zip`.

---

## 7. Prosedur Pengujian Board Sebelum Pemasangan Chip (Cold Test)

Sebelum menancapkan board NodeMCU ke soket PCB:
1. Hubungkan adaptor 5V 2A ke Terminal Screw Power In.
2. Ukur tegangan dengan Multimeter Digital pada pin socket `VIN` dan `GND`: pastikan terukur **4.9V - 5.2V**.
3. Pastikan tidak ada korsleting (*short circuit*) antara rel daya `5V` dan `GND` (resistansi harus terisi muatan kapasitor dan bernilai megaohm).
4. Matikan daya, pasang NodeMCU ke soket header dengan orientasi pin yang benar.
5. Nyalakan daya kembali, amati LED status booting pada NodeMCU.
