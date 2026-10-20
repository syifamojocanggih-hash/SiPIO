/**
 * SiPIO - Sistem Pemantau Ikan Otomatis (IoT)
 * Node: ESP8266 Smart Fish Feeder & Pond Telemetry
 * 
 * Fitur Utama:
 * 1. Sensor Suhu Air Kolam Digital DS18B20 (DallasTemperature)
 * 2. Sensor Pelampung Air (Float Switch Interlock Safety Protection)
 * 3. Penggerak Pakan Motor Servo Pelet Otomatis & Manual
 * 4. Komunikasi Broker MQTT Bi-directional (Pub/Sub)
 * 5. Penyimpanan Jadwal Pakan Offline Berbasis LittleFS Flash Memory
 * 6. Sinkronisasi Jam Real-Time Berbasis NTP (Network Time Protocol)
 */

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Servo.h>
#include <LittleFS.h>
#include <time.h>

// Muat konfigurasi (jika config.h belum ada, gunakan config.h.example)
#if __has_include("config.h")
  #include "config.h"
#else
  #include "config.h.example"
#endif

// -------------------------------------------------------------
// Deklarasi Objek Perangkat Keras
// -------------------------------------------------------------
OneWire oneWire(PIN_DS18B20);
DallasTemperature tempSensor(&oneWire);
Servo feederServo;
WiFiClient espWifiClient;
PubSubClient mqttClient(espWifiClient);

// -------------------------------------------------------------
// Struktur Data Jadwal Pakan (Maksimal 10 Jadwal)
// -------------------------------------------------------------
struct FeedSchedule {
  int id;
  char timeStr[6]; // Format "HH:MM"
  int durationMs;
  bool enabled;
};

#define MAX_SCHEDULES 10
FeedSchedule schedules[MAX_SCHEDULES];
int totalSchedules = 0;

// -------------------------------------------------------------
// Variabel State, Timer & Ambang Pengaman (PRD Section 6.1 F-07 & F-09)
// -------------------------------------------------------------
unsigned long lastTelemetryMillis = 0;
unsigned long lastMqttRetryMillis = 0;
int lastFeedMinute = -1;
float lastTemperature = 28.0;
bool lastLevelOk = true;

// Ambang Pengaman Lokal
float thresholdTempMin = DEFAULT_TEMP_MIN;
float thresholdTempMax = DEFAULT_TEMP_MAX;
unsigned long minGapMinutes = DEFAULT_MIN_GAP_MIN;
unsigned long lastFeedSuccessMillis = 0;
bool hasFedBefore = false;

// -------------------------------------------------------------
// Prototipe Fungsi
// -------------------------------------------------------------
void setupWiFi();
void connectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void loadSchedulesFromFS();
void saveSchedulesToFS(const char* jsonString);
bool isWaterLevelSafe();
void executeFeeding(int durationMs, const char* source);
void sendTelemetry();
void checkScheduledFeeding();

// =============================================================
// SETUP
// =============================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println(F("=========================================="));
  Serial.println(F("   SiPIO - ESP8266 Feeder Node Memulai   "));
  Serial.println(F("=========================================="));

  // Inisialisasi Pin
  pinMode(PIN_FLOAT_SWITCH, INPUT_PULLUP);
  pinMode(PIN_LED_STATUS, OUTPUT);
  digitalWrite(PIN_LED_STATUS, HIGH); // LED Builtin ESP8266 Active Low

  // Inisialisasi Sensor Suhu DS18B20
  tempSensor.begin();
  tempSensor.setResolution(11); // 11-bit resolusi (0.125°C presisi, ~375ms konversi)
  Serial.println(F("[DS18B20] Sensor suhu air siap."));

  // Inisialisasi LittleFS Flash Storage
  if (LittleFS.begin()) {
    Serial.println(F("[LittleFS] Sistem berkas flash berhasil dimuat."));
    loadSchedulesFromFS();
  } else {
    Serial.println(F("[LittleFS] PERINGATAN: Gagal memuat LittleFS. Memformat..."));
    LittleFS.format();
    LittleFS.begin();
  }

  // Koneksi WiFi
  setupWiFi();

  // Konfigurasi Sinkronisasi Waktu NTP (UTC+7 WIB)
  configTime(TIMEZONE_OFFSET_HOURS * 3600, 0, NTP_SERVER_PRIMARY, NTP_SERVER_BACKUP);
  Serial.println(F("[NTP] Menunggu sinkronisasi waktu jaringan..."));
  time_t now = time(nullptr);
  int ntpRetry = 0;
  while (now < 8 * 3600 * 2 && ntpRetry < 15) {
    delay(500);
    Serial.print(F("."));
    now = time(nullptr);
    ntpRetry++;
  }
  Serial.println();
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  Serial.printf("[NTP] Waktu terkini: %02d:%02d:%02d\n", (timeinfo.tm_hour + TIMEZONE_OFFSET_HOURS) % 24, timeinfo.tm_min, timeinfo.tm_sec);

  // Konfigurasi Broker MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(1024); // Alokasi buffer untuk array jadwal pakan
}

// =============================================================
// MAIN LOOP
// =============================================================
void loop() {
  // 1. Pemeliharaan Koneksi WiFi & MQTT
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      unsigned long currentMillis = millis();
      if (currentMillis - lastMqttRetryMillis > 5000) {
        lastMqttRetryMillis = currentMillis;
        connectMQTT();
      }
    } else {
      mqttClient.loop();
    }
  }

  // 2. Publikasi Telemetri Periodik
  unsigned long nowMillis = millis();
  if (nowMillis - lastTelemetryMillis >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMillis = nowMillis;
    sendTelemetry();
  }

  // 3. Pengecekan Jadwal Pakan Otomatis (Offline-Capable via NTP + LittleFS)
  checkScheduledFeeding();

  delay(10);
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
    Serial.printf("[WiFi] Terhubung! Alamat IP: %s | RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println();
    Serial.println(F("[WiFi] PERINGATAN: Gagal terhubung ke WiFi. Berjalan dalam mode mandiri/offline."));
  }
}

// -------------------------------------------------------------
// Koneksi ke Broker MQTT dengan LWT (Last Will & Testament)
// -------------------------------------------------------------
void connectMQTT() {
  Serial.print(F("[MQTT] Menghubungi broker... "));

  // Konfigurasi pesan LWT: jika ESP mati tiba-tiba, broker otomatis publish "offline"
  bool connected = false;
  if (strlen(MQTT_USER) > 0) {
    connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD, TOPIC_STATUS, 1, true, "offline");
  } else {
    connected = mqttClient.connect(MQTT_CLIENT_ID, TOPIC_STATUS, 1, true, "offline");
  }

  if (connected) {
    Serial.println(F("BERHASIL!"));
    // Beritahukan sistem bahwa feeder sedang ONLINE
    mqttClient.publish(TOPIC_STATUS, "online", true);

    // Berlangganan topik perintah pakan, sinkronisasi jadwal, dan ambang batas
    mqttClient.subscribe(TOPIC_COMMAND, 1);
    mqttClient.subscribe(TOPIC_SCHEDULES, 1);
    mqttClient.subscribe(TOPIC_THRESHOLDS, 1);
    Serial.printf("[MQTT] Berlangganan: %s, %s, %s\n", TOPIC_COMMAND, TOPIC_SCHEDULES, TOPIC_THRESHOLDS);
  } else {
    Serial.printf("GAGAL (rc=%d). Akan dicoba kembali dalam 5 detik.\n", mqttClient.state());
  }
}

// -------------------------------------------------------------
// Callback Pesan Masuk dari MQTT Broker
// -------------------------------------------------------------
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Salin payload ke string aman
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';

  Serial.printf("[MQTT RX] Topik: %s | Pesan: %s\n", topic, message);

  // A. Perintah Pakan Cepat (Manual Feed)
  if (strcmp(topic, TOPIC_COMMAND) == 0) {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);

    if (!error) {
      const char* action = doc["action"] | "";
      int durationMs = doc["duration_ms"] | DEFAULT_FEED_MS;

      if (strcmp(action, "feed") == 0 || durationMs > 0) {
        Serial.printf("[AKSI] Perintah pakan manual diterima: durasi %d ms\n", durationMs);
        executeFeeding(durationMs, "Manual (MQTT Remote)");
      }
    }
  }

  // B. Sinkronisasi Jadwal Pakan dari Dashboard (LittleFS Storage)
  else if (strcmp(topic, TOPIC_SCHEDULES) == 0) {
    Serial.println(F("[JADWAL] Menerima pembaruan array jadwal pakan."));
    saveSchedulesToFS(message);
    loadSchedulesFromFS();
  }

  // C. Pembaruan Ambang Pengaman Sistem (PRD Section 11 & 13.1)
  else if (strcmp(topic, TOPIC_THRESHOLDS) == 0) {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    if (!error) {
      if (doc.containsKey("temp_min")) thresholdTempMin = doc["temp_min"];
      if (doc.containsKey("temp_max")) thresholdTempMax = doc["temp_max"];
      if (doc.containsKey("min_gap_min")) minGapMinutes = doc["min_gap_min"];
      Serial.printf("[AMBANG] Diperbarui: Suhu %.1f - %.1f C | Jeda: %lu menit\n",
                    thresholdTempMin, thresholdTempMax, minGapMinutes);
    }
  }
}

// -------------------------------------------------------------
// Cek Keamanan Level Air Kolam (Float Switch Interlock)
// -------------------------------------------------------------
bool isWaterLevelSafe() {
  int sensorVal = digitalRead(PIN_FLOAT_SWITCH);
  // Jika FLOAT_ACTIVE_LOW = true, maka sensor LOW menandakan air aman
  bool safe = (FLOAT_ACTIVE_LOW) ? (sensorVal == LOW) : (sensorVal == HIGH);
  lastLevelOk = safe;
  return safe;
}

// -------------------------------------------------------------
// Eksekusi Pakan Motor Servo Pelet dengan Aturan Keselamatan Lokal (PRD F-07 & F-09)
// -------------------------------------------------------------
void executeFeeding(int durationMs, const char* source) {
  // Batasi durasi pakan dalam batas toleransi aman
  durationMs = constrain(durationMs, MIN_FEED_DURATION_MS, MAX_FEED_DURATION_MS);

  // 1. PROTEKSI LEVEL AIR (Float Switch)
  if (!isWaterLevelSafe()) {
    Serial.println(F("[SAFETY INTERLOCK] BAHAYA: Level air kolam rendah! Aksi pakan DIBATALKAN."));
    
    StaticJsonDocument<128> skipDoc;
    skipDoc["reason"] = "low_level";
    skipDoc["source"] = source;
    char buffer[128];
    serializeJson(skipDoc, buffer);
    mqttClient.publish(TOPIC_EVENT_SKIP, buffer);
    mqttClient.publish(TOPIC_TELEMETRY, buffer);
    return;
  }

  // 2. PROTEKSI SUHU AIR EKSTREM (PRD Section 7 & F-07: 24 - 32 C)
  if (lastTemperature < thresholdTempMin || lastTemperature > thresholdTempMax) {
    Serial.printf("[SAFETY INTERLOCK] BAHAYA: Suhu air abnormal (%.1f C di luar rentang %.1f-%.1f C)! Pakan DITUNDA.\n",
                  lastTemperature, thresholdTempMin, thresholdTempMax);
    
    StaticJsonDocument<128> skipDoc;
    skipDoc["reason"] = "temperature_out_of_range";
    skipDoc["source"] = source;
    skipDoc["temp"] = lastTemperature;
    char buffer[128];
    serializeJson(skipDoc, buffer);
    mqttClient.publish(TOPIC_EVENT_SKIP, buffer);
    mqttClient.publish(TOPIC_TELEMETRY, buffer);
    return;
  }

  // 3. PROTEKSI JEDA MINIMAL COOLDOWN (PRD Section 7 & F-09: 30 menit)
  if (hasFedBefore && strstr(source, "Manual") == NULL) {
    unsigned long elapsedMs = millis() - lastFeedSuccessMillis;
    unsigned long requiredGapMs = minGapMinutes * 60000UL;
    if (elapsedMs < requiredGapMs) {
      Serial.printf("[SAFETY INTERLOCK] Jeda %lu menit belum terpenuhi! Pakan DITUNDA.\n", minGapMinutes);
      
      StaticJsonDocument<128> skipDoc;
      skipDoc["reason"] = "cooldown_active";
      skipDoc["source"] = source;
      char buffer[128];
      serializeJson(skipDoc, buffer);
      mqttClient.publish(TOPIC_EVENT_SKIP, buffer);
      return;
    }
  }

  Serial.printf("[FEEDER] Mengaktifkan motor servo selama %d ms (Pemicu: %s)...\n", durationMs, source);
  
  // Indikator visual aktif
  digitalWrite(PIN_LED_STATUS, LOW); // Nyalakan LED

  // Hubungkan servo hanya saat aksi pakan untuk mencegah getaran & dengung idle
  feederServo.attach(PIN_SERVO);
  feederServo.write(180); // Putar tuas pelet ke posisi buka / putar penuh
  delay(durationMs);
  feederServo.write(0);   // Kembalikan ke posisi tertutup
  delay(300);
  feederServo.detach();   // Lepas kontrol PWM agar hemat daya & dingin

  digitalWrite(PIN_LED_STATUS, HIGH); // Matikan LED
  lastFeedSuccessMillis = millis();
  hasFedBefore = true;
  Serial.println(F("[FEEDER] Pakan pelet selesai diberikan."));

  // Publikasikan konfirmasi sukses ke MQTT (PRD Section 11 event/feed)
  time_t now = time(nullptr);
  StaticJsonDocument<256> logDoc;
  logDoc["ts"] = (unsigned long)now;
  logDoc["result"] = "done";
  logDoc["source"] = source;
  logDoc["duration_ms"] = durationMs;
  logDoc["reason"] = "Selesai tepat waktu";
  char buffer[256];
  serializeJson(logDoc, buffer);
  mqttClient.publish(TOPIC_EVENT_FEED, buffer);
  mqttClient.publish(TOPIC_TELEMETRY, buffer);
}

// -------------------------------------------------------------
// Pengecekan Jadwal Pakan Lokal Berbasis Jam Real-Time
// -------------------------------------------------------------
void checkScheduledFeeding() {
  time_t now = time(nullptr);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);

  int currentHour = (timeinfo.tm_hour + TIMEZONE_OFFSET_HOURS) % 24;
  int currentMinute = timeinfo.tm_min;

  // Cek sekali per menit saja agar pakan tidak terulang berkali-kali di menit yang sama
  if (currentMinute == lastFeedMinute) {
    return;
  }

  char currentClockStr[6];
  snprintf(currentClockStr, sizeof(currentClockStr), "%02d:%02d", currentHour, currentMinute);

  for (int i = 0; i < totalSchedules; i++) {
    if (schedules[i].enabled && strcmp(schedules[i].timeStr, currentClockStr) == 0) {
      Serial.printf("[JADWAL TERPICU] Jam: %s cocok dengan Jadwal ID #%d!\n", currentClockStr, schedules[i].id);
      lastFeedMinute = currentMinute;
      executeFeeding(schedules[i].durationMs, "Jadwal Otomatis (ESP LittleFS)");
      break;
    }
  }
}

// -------------------------------------------------------------
// Baca Sensor & Publikasikan Telemetri ke Broker MQTT
// -------------------------------------------------------------
void sendTelemetry() {
  // 1. Baca sensor suhu DS18B20
  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);

  // Filter nilai jika pembacaan gagal/kabel terlepas (-127.0°C)
  if (tempC > -50.0 && tempC < 85.0) {
    lastTemperature = tempC;
  }

  // 2. Baca status pelampung air
  bool levelOk = isWaterLevelSafe();

  // 3. Baca kekuatan sinyal WiFi
  int rssi = WiFi.RSSI();

  // 4. Susun JSON telemetri standar SiPIO
  StaticJsonDocument<256> doc;
  doc["temp"] = round(lastTemperature * 10) / 10.0;
  doc["level_ok"] = levelOk;
  doc["rssi"] = rssi;
  doc["uptime"] = millis() / 1000;

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);

  if (mqttClient.connected()) {
    mqttClient.publish(TOPIC_TELEMETRY, jsonBuffer);
  }

  Serial.printf("[TELEMETRI] Suhu: %.1f°C | Air: %s | WiFi: %d dBm\n",
                lastTemperature, levelOk ? "AMAN" : "RENDAH", rssi);
}

// -------------------------------------------------------------
// Manajemen Jadwal Offline di LittleFS Flash Memory
// -------------------------------------------------------------
void loadSchedulesFromFS() {
  if (!LittleFS.exists("/schedules.json")) {
    Serial.println(F("[LittleFS] Belum ada file schedules.json. Menggunakan default."));
    totalSchedules = 2;
    schedules[0] = {1, "07:00", 2000, true};
    schedules[1] = {2, "16:30", 2000, true};
    return;
  }

  File f = LittleFS.open("/schedules.json", "r");
  if (!f) {
    Serial.println(F("[LittleFS] Gagal membuka schedules.json untuk dibaca."));
    return;
  }

  DynamicJsonDocument doc(1024);
  DeserializationError err = deserializeJson(doc, f);
  f.close();

  if (err) {
    Serial.println(F("[LittleFS] Format JSON korup."));
    return;
  }

  JsonArray arr = doc.as<JsonArray>();
  totalSchedules = 0;
  for (JsonObject item : arr) {
    if (totalSchedules >= MAX_SCHEDULES) break;
    schedules[totalSchedules].id = item["id"] | 0;
    const char* t = item["time"] | "07:00";
    strncpy(schedules[totalSchedules].timeStr, t, 5);
    schedules[totalSchedules].timeStr[5] = '\0';
    schedules[totalSchedules].durationMs = item["duration_ms"] | DEFAULT_FEED_MS;
    schedules[totalSchedules].enabled = item["enabled"] | true;
    totalSchedules++;
  }

  Serial.printf("[LittleFS] Berhasil memuat %d jadwal pakan dari flash storage.\n", totalSchedules);
  for (int i = 0; i < totalSchedules; i++) {
    Serial.printf("   - Jadwal #%d: Jam %s (%d ms) [%s]\n",
                  schedules[i].id, schedules[i].timeStr, schedules[i].durationMs,
                  schedules[i].enabled ? "AKTIF" : "NONAKTIF");
  }
}

void saveSchedulesToFS(const char* jsonString) {
  File f = LittleFS.open("/schedules.json", "w");
  if (!f) {
    Serial.println(F("[LittleFS] Gagal membuka schedules.json untuk ditulis."));
    return;
  }
  f.print(jsonString);
  f.close();
  Serial.println(F("[LittleFS] Jadwal baru berhasil disimpan ke flash memory."));
}
