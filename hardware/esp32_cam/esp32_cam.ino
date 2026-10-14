/**
 * SiPIO - Sistem Pemantau Ikan Otomatis (IoT)
 * Node: ESP32-CAM AI-Thinker Snapshot & Stream Node
 * 
 * Fitur Utama:
 * 1. Sensor Kamera OmniVision OV2640 dengan Akselerasi PSRAM
 * 2. Pengambilan Snapshot Otomatis Berkala (Resolusi VGA 640x480)
 * 3. Pengunggahan Foto via HTTP POST Multipart/Form-Data ke FastAPI Backend
 * 4. Kompatibilitas dengan Dashboard PWA SiPIO Real-Time
 * 5. Fitur Pengaktifan Lampu Kilat Flash LED (Opsional untuk malam hari)
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClient.h>

// Muat konfigurasi (jika config.h belum ada, gunakan config.h.example)
#if __has_include("config.h")
  #include "config.h"
#else
  #include "config.h.example"
#endif

// -------------------------------------------------------------
// Variabel Timer & State
// -------------------------------------------------------------
unsigned long lastCaptureMillis = 0;
bool isCameraInitialized = false;

// -------------------------------------------------------------
// Prototipe Fungsi
// -------------------------------------------------------------
bool initCamera();
void setupWiFi();
bool captureAndUploadPhoto();

// =============================================================
// SETUP
// =============================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println(F("=========================================="));
  Serial.println(F("   SiPIO - ESP32-CAM Camera Node Memulai  "));
  Serial.println(F("=========================================="));

  // Inisialisasi Flash LED jika diaktifkan
  if (USE_FLASH_LED) {
    pinMode(FLASH_LED_PIN, OUTPUT);
    digitalWrite(FLASH_LED_PIN, LOW); // Pastikan mati saat standby
  }

  // 1. Inisialisasi Sensor Kamera OV2640
  isCameraInitialized = initCamera();
  if (!isCameraInitialized) {
    Serial.println(F("[KAMERA] KRITIS: Inisialisasi kamera OV2640 gagal! Periksa kabel pita."));
  } else {
    Serial.println(F("[KAMERA] Kamera OV2640 berhasil diinisialisasi."));
  }

  // 2. Hubungkan ke Jaringan WiFi Kolam
  setupWiFi();

  // 3. Ambil dan unggah foto pertama saat booting
  if (isCameraInitialized && WiFi.status() == WL_CONNECTED) {
    Serial.println(F("[BOOT] Mengambil foto perdana kolam..."));
    captureAndUploadPhoto();
  }
}

// =============================================================
// MAIN LOOP
// =============================================================
void loop() {
  // Pastikan koneksi WiFi tetap aktif
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WiFi] Terputus. Menghubungkan ulang..."));
    setupWiFi();
  }

  // Pengambilan dan pengunggahan foto snapshot secara periodik
  unsigned long currentMillis = millis();
  unsigned long intervalMs = (unsigned long)CAPTURE_INTERVAL_SEC * 1000UL;

  if (currentMillis - lastCaptureMillis >= intervalMs) {
    lastCaptureMillis = currentMillis;

    if (isCameraInitialized && WiFi.status() == WL_CONNECTED) {
      Serial.println(F("[TIMER] Memulai siklus pengambilan foto terjadwal..."));
      captureAndUploadPhoto();
    }
  }

  delay(100);
}

// -------------------------------------------------------------
// Inisialisasi Sensor Kamera OV2640 & Konfigurasi PSRAM
// -------------------------------------------------------------
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Konfigurasi buffer berdasarkan keberadaan memori PSRAM
  if (psramFound()) {
    Serial.println(F("[PSRAM] Memori PSRAM terdeteksi (4MB). Menggunakan resolusi VGA tinggi."));
    config.frame_size   = FRAMESIZE_VGA;  // 640 x 480 (Optimal untuk bandwidth & kejelasan pelet)
    config.jpeg_quality = 12;             // Nilai 10-14: Kualitas tinggi, kompresi rendah
    config.fb_count     = 2;
    config.grab_mode    = CAMERA_GRAB_LATEST;
  } else {
    Serial.println(F("[PSRAM] Peringatan: PSRAM tidak terdeteksi. Menggunakan resolusi QVGA aman."));
    config.frame_size   = FRAMESIZE_QVGA; // 320 x 240
    config.jpeg_quality = 15;
    config.fb_count     = 1;
    config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
  }

  // Jalankan inisialisasi driver kamera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[KAMERA] Gagal inisialisasi driver (Kode error: 0x%x)\n", err);
    return false;
  }

  // Optimalisasi sensor gambar OV2640 untuk kondisi pencahayaan kolam luar ruangan
  sensor_t *s = esp_camera_sensor_get();
  if (s != NULL) {
    s->set_brightness(s, 1);     // Sedikit lebih terang (-2 s/d 2)
    s->set_contrast(s, 1);       // Kontras tinggi untuk tekstur pelet & riak air
    s->set_saturation(s, 1);     // Warna air dan ikan alami
    s->set_whitebal(s, 1);       // Auto White Balance aktif
    s->set_awb_gain(s, 1);       // AWB Gain aktif
    s->set_wb_mode(s, 0);        // Mode Auto
  }

  return true;
}

// -------------------------------------------------------------
// Pengaturan & Koneksi WiFi Kolam
// -------------------------------------------------------------
void setupWiFi() {
  Serial.printf("[WiFi] Menghubungkan ke SSID: %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(F("."));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.printf("[WiFi] Terhubung! IP Kamera: %s | RSSI: %d dBm\n", 
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println();
    Serial.println(F("[WiFi] Gagal terhubung ke WiFi."));
  }
}

// -------------------------------------------------------------
// Ambil Foto Frame Buffer & Kirim via HTTP POST Multipart
// -------------------------------------------------------------
bool captureAndUploadPhoto() {
  // Nyalakan Flash LED sesaat sebelum capture jika diaktifkan
  if (USE_FLASH_LED) {
    digitalWrite(FLASH_LED_PIN, HIGH);
    delay(150); // Waktu sensor menyesuaikan eksposur cahaya
  }

  // 1. Ambil Frame Buffer Foto JPEG dari Kamera
  camera_fb_t *fb = esp_camera_fb_get();

  // Matikan kembali Flash LED
  if (USE_FLASH_LED) {
    digitalWrite(FLASH_LED_PIN, LOW);
  }

  if (!fb) {
    Serial.println(F("[KAMERA] Gagal mengambil tangkapan frame buffer!"));
    return false;
  }

  Serial.printf("[KAMERA] Foto berhasil diambil! Ukuran: %u bytes (%dx%d)\n", 
                fb->len, fb->width, fb->height);

  // 2. Hubungkan ke Server Backend FastAPI SiPIO
  WiFiClient client;
  Serial.printf("[HTTP] Menghubungi server backend %s:%d...\n", SERVER_HOST, SERVER_PORT);

  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.println(F("[HTTP] Gagal terhubung ke server backend FastAPI!"));
    esp_camera_fb_return(fb);
    return false;
  }

  // 3. Susun Payload HTTP Multipart/Form-Data
  String boundary = "----WebKitFormBoundarySiPIOEsp32Cam";
  
  // Field 1: Area ("kolam" atau "hopper")
  String headArea = "--" + boundary + "\r\n" +
                    "Content-Disposition: form-data; name=\"area\"\r\n\r\n" +
                    String(CAMERA_AREA) + "\r\n";

  // Field 2: File Foto JPEG
  String filename = (String(CAMERA_AREA) == "hopper") ? "hopper_snap.jpg" : "pond_snap.jpg";
  String headFile = "--" + boundary + "\r\n" +
                    "Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n" +
                    "Content-Type: image/jpeg\r\n\r\n";

  String tail = "\r\n--" + boundary + "--\r\n";

  // Hitung total panjang konten (Content-Length)
  uint32_t totalLength = headArea.length() + headFile.length() + fb->len + tail.length();

  // 4. Kirim Header HTTP POST
  client.printf("POST %s HTTP/1.1\r\n", UPLOAD_PATH);
  client.printf("Host: %s:%d\r\n", SERVER_HOST, SERVER_PORT);
  client.println(F("User-Agent: ESP32-CAM-SiPIO/1.0"));
  client.printf("Content-Type: multipart/form-data; boundary=%s\r\n", boundary.c_str());
  client.printf("Content-Length: %u\r\n", totalLength);
  client.println(F("Connection: close\r\n"));

  // 5. Kirim Bagian Awal (Metadata Area & Form File Header)
  client.print(headArea);
  client.print(headFile);

  // 6. Kirim Data Biner Gambar JPEG dalam Chunk (per 1024 bytes agar stabil)
  uint8_t *fbBuf = fb->buf;
  size_t fbLen = fb->len;
  size_t chunkSize = 1024;

  for (size_t n = 0; n < fbLen; n += chunkSize) {
    if (n + chunkSize < fbLen) {
      client.write(fbBuf, chunkSize);
      fbBuf += chunkSize;
    } else {
      size_t remainder = fbLen - n;
      client.write(fbBuf, remainder);
    }
  }

  // 7. Kirim Penutup Boundary Multipart
  client.print(tail);

  // 8. Kembalikan Frame Buffer ke Pool Memori Kamera
  esp_camera_fb_return(fb);

  // 9. Tunggu dan Baca Respons dari Backend FastAPI
  Serial.print(F("[HTTP] Mengunggah foto ke server... "));
  unsigned long timeout = millis();
  while (client.connected() && !client.available()) {
    if (millis() - timeout > 5000) {
      Serial.println(F("TIMEOUT!"));
      client.stop();
      return false;
    }
    delay(20);
  }

  // Periksa Status Respon HTTP (harus HTTP/1.1 200 OK)
  String statusLine = client.readStringUntil('\r');
  Serial.println(statusLine);

  if (statusLine.indexOf("200") >= 0) {
    Serial.println(F("[UPLOAD] SUKSES! Foto kolam berhasil diperbarui di Dashboard SiPIO."));
    client.stop();
    return true;
  } else {
    Serial.printf("[UPLOAD] PERINGATAN: Respons server bukan 200 OK: %s\n", statusLine.c_str());
    client.stop();
    return false;
  }
}
