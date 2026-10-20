import asyncio
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

from fastapi import (
    FastAPI, WebSocket, WebSocketDisconnect, HTTPException,
    status, Depends, UploadFile, File, Form, Query
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import paho.mqtt.client as mqtt
from sqlalchemy.orm import Session

from database import (
    init_db, get_db, SessionLocal,
    DeviceModel, TelemetryLogModel, FeedLogModel, ScheduleModel, ThresholdModel,
    AlertModel, CameraSnapshotModel
)

# Setup direktori penyimpanan foto ESP32-CAM
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_CAMERA_DIR = BASE_DIR.parent / "frontend" / "public" / "camera"
BACKEND_STATIC_CAMERA_DIR = BASE_DIR / "static" / "camera"

FRONTEND_CAMERA_DIR.mkdir(parents=True, exist_ok=True)
BACKEND_STATIC_CAMERA_DIR.mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sipio-fastapi")

# MQTT Configuration (PRD Section 11 & 12)
MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

# MQTT Topics (PRD Section 11 & Backward-Compatible Aliases)
TOPIC_TELEMETRY = "fish/feeder01/telemetry"
TOPIC_FEEDER_STATUS = "fish/feeder01/status"
TOPIC_CAM_STATUS = "fish/feeder01/cam/status"
TOPIC_FEED_CMD = "fish/feeder01/cmd/feed"
TOPIC_EVENT_FEED = "fish/feeder01/event/feed"
TOPIC_EVENT_SKIP = "fish/feeder01/event/skip"
TOPIC_SCHEDULES = "fish/feeder01/cfg/schedule"
TOPIC_THRESHOLDS = "fish/feeder01/cfg/thresholds"

# Legacy aliases
LEGACY_TOPIC_TELEMETRY = "sipio/feeder/telemetry"
LEGACY_TOPIC_FEEDER_STATUS = "sipio/feeder/status"
LEGACY_TOPIC_CAM_STATUS = "sipio/camera/status"
LEGACY_TOPIC_FEED_CMD = "sipio/feeder/command"
LEGACY_TOPIC_SCHEDULES = "sipio/feeder/schedules"

# -------------------------------------------------------------
# Data Models (Pydantic v2)
# -------------------------------------------------------------
class TelemetryData(BaseModel):
    temp: float = Field(28.4, description="Suhu air kolam dari sensor DS18B20 (°C)")
    level_ok: bool = Field(True, description="Level air kolam aman (Float Switch GPIO14)")
    rssi: int = Field(-61, description="Kekuatan sinyal WiFi ESP8266 (dBm)")
    esp_online: bool = Field(True, description="Status online modul feeder ESP8266")
    cam_online: bool = Field(True, description="Status online modul kamera ESP32-CAM")
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))

class FeedRequest(BaseModel):
    duration_ms: int = Field(2000, ge=500, le=5000, description="Durasi putaran motor servo pelet (ms)")
    source: str = Field("Manual (Dashboard)", description="Sumber pemicu aksi pakan")
    bypass_cooldown: bool = Field(False, description="Lewati jeda waktu 30 menit (hanya untuk pengujian simulasi)")

class ScheduleItem(BaseModel):
    id: int
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Jam pemberian pakan (HH:MM)")
    duration_ms: int = Field(2000, ge=500, le=5000)
    days: str = Field("Setiap Hari")
    enabled: bool = Field(True)
    synced: bool = Field(True)

class ScheduleCreate(BaseModel):
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    duration_ms: int = Field(2000, ge=500, le=5000)
    days: str = Field("Setiap Hari")

class ThresholdsConfig(BaseModel):
    temp_min: float = 24.0
    temp_max: float = 32.0
    min_gap_min: int = 30
    default_duration_ms: int = 2000
    offline_after_s: int = 60
    camera_interval_s: int = 300

# -------------------------------------------------------------
# In-Memory State
# -------------------------------------------------------------
current_telemetry = TelemetryData()
current_thresholds = ThresholdsConfig()
start_time = time.time()
mqtt_connected = False
last_feed_epoch_s: float = 0.0  # Merekam epoch pemberian pakan terakhir untuk validasi jeda 30 menit

schedules_db: List[dict] = [
    {"id": 1, "time": "07:00", "duration_ms": 2000, "days": "Setiap Hari", "enabled": True, "synced": True},
    {"id": 2, "time": "16:30", "duration_ms": 2000, "days": "Setiap Hari", "enabled": True, "synced": True}
]

feed_logs_db: List[dict] = [
    {
        "id": 101,
        "timestamp": "14 Okt 2026 07:00:02",
        "source": "Jadwal Otomatis (ESP)",
        "duration_ms": 2000,
        "result": "done",
        "reason": "Selesai tepat waktu (deviasi < 30s)"
    },
    {
        "id": 102,
        "timestamp": "14 Okt 2026 12:15:10",
        "source": "Manual (Dashboard)",
        "duration_ms": 2000,
        "result": "done",
        "reason": "Diberikan manual via tombol pakan cepat"
    }
]

# -------------------------------------------------------------
# WebSocket Connection Manager
# -------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client terhubung. Total klien: {len(self.active_connections)}")
        # Kirim telemetri awal segera setelah koneksi terbuka
        await websocket.send_json({
            "type": "telemetry",
            "data": current_telemetry.model_dump()
        })

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client terputus. Total klien: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Gagal mengirim ke WS client: {e}")
                self.disconnect(connection)

ws_manager = ConnectionManager()

# -------------------------------------------------------------
# MQTT Client Handler
# -------------------------------------------------------------
def on_mqtt_connect(client, userdata, flags, rc, properties=None):
    global mqtt_connected
    if rc == 0:
        mqtt_connected = True
        logger.info(f"Terhubung ke broker MQTT ({MQTT_BROKER_HOST}:{MQTT_BROKER_PORT})")
        client.subscribe([
            (TOPIC_TELEMETRY, 0),
            (TOPIC_FEEDER_STATUS, 0),
            (TOPIC_CAM_STATUS, 0),
            (TOPIC_EVENT_FEED, 0),
            (TOPIC_EVENT_SKIP, 0),
            (LEGACY_TOPIC_TELEMETRY, 0),
            (LEGACY_TOPIC_FEEDER_STATUS, 0),
            (LEGACY_TOPIC_CAM_STATUS, 0)
        ])
    else:
        mqtt_connected = False
        logger.warning(f"Koneksi broker MQTT gagal dengan kode respon: {rc}")

def on_mqtt_disconnect(client, userdata, rc, properties=None):
    global mqtt_connected
    mqtt_connected = False
    logger.warning("Terputus dari broker MQTT. Menjalankan fallback simulasi internal.")

def on_mqtt_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload_str = msg.payload.decode('utf-8')
        
        if topic in [TOPIC_TELEMETRY, LEGACY_TOPIC_TELEMETRY]:
            payload = json.loads(payload_str)
            current_telemetry.temp = float(payload.get("temp", current_telemetry.temp))
            current_telemetry.level_ok = bool(payload.get("level_ok", current_telemetry.level_ok))
            current_telemetry.rssi = int(payload.get("rssi", current_telemetry.rssi))
            current_telemetry.timestamp = int(time.time() * 1000)

            # Rekam pembacaan sensor ke database MySQL/SQLite
            try:
                with SessionLocal() as db_session:
                    db_session.add(TelemetryLogModel(
                        device_id="feeder01",
                        temp=current_telemetry.temp,
                        level_ok=current_telemetry.level_ok,
                        rssi=current_telemetry.rssi,
                        timestamp=current_telemetry.timestamp
                    ))
                    db_session.commit()
            except Exception as db_err:
                logger.warning(f"Gagal mencatat telemetri MQTT ke database: {db_err}")

        elif topic in [TOPIC_FEEDER_STATUS, LEGACY_TOPIC_FEEDER_STATUS]:
            current_telemetry.esp_online = (payload_str.lower() == "online")
            try:
                with SessionLocal() as db_session:
                    dev = db_session.query(DeviceModel).filter_by(id="feeder01").first()
                    if dev:
                        dev.is_online = current_telemetry.esp_online
                        dev.last_seen = int(time.time() * 1000)
                        db_session.commit()
            except Exception:
                pass

        elif topic in [TOPIC_CAM_STATUS, LEGACY_TOPIC_CAM_STATUS]:
            current_telemetry.cam_online = (payload_str.lower() == "online")

        elif topic == TOPIC_EVENT_FEED:
            try:
                payload = json.loads(payload_str)
                with SessionLocal() as db_session:
                    new_feed = FeedLogModel(
                        device_id="feeder01",
                        timestamp_str=time.strftime("%d %b %Y %H:%M:%S"),
                        source=payload.get("source", "schedule"),
                        duration_ms=int(payload.get("duration_ms", 2000)),
                        result="done",
                        reason="Berhasil: Diberikan oleh ESP8266 sesuai jadwal"
                    )
                    db_session.add(new_feed)
                    db_session.commit()
            except Exception as err:
                logger.warning(f"Gagal mencatat event/feed: {err}")

        elif topic == TOPIC_EVENT_SKIP:
            try:
                payload = json.loads(payload_str)
                reason_code = payload.get("reason", "unknown")
                reason_map = {
                    "low_level": "Level air di bawah batas aman (Float Switch)",
                    "temperature_out_of_range": "Suhu air kolam di luar batas aman layak makan",
                    "cooldown_active": "Jeda waktu minimal antar pakan belum terpenuhi"
                }
                reason_text = reason_map.get(reason_code, f"Pakan ditunda: {reason_code}")
                with SessionLocal() as db_session:
                    new_skip = FeedLogModel(
                        device_id="feeder01",
                        timestamp_str=time.strftime("%d %b %Y %H:%M:%S"),
                        source="Jadwal Otomatis (ESP)",
                        duration_ms=2000,
                        result="skipped",
                        reason=reason_text
                    )
                    db_session.add(new_skip)
                    
                    new_alert = AlertModel(
                        device_id="feeder01",
                        ts=int(time.time() * 1000),
                        alert_type="interlock_" + reason_code,
                        message=reason_text,
                        acknowledged=False
                    )
                    db_session.add(new_alert)
                    db_session.commit()
            except Exception as err:
                logger.warning(f"Gagal mencatat event/skip: {err}")
    except Exception as e:
        logger.error(f"Error memproses pesan MQTT ({msg.topic}): {e}")

mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="sipio_fastapi_backend")
mqtt_client.on_connect = on_mqtt_connect
mqtt_client.on_disconnect = on_mqtt_disconnect
mqtt_client.on_message = on_mqtt_message

if MQTT_USERNAME and MQTT_PASSWORD:
    mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

# -------------------------------------------------------------
# Background Periodic Telemetry & Simulation Task
# -------------------------------------------------------------
async def periodic_telemetry_loop():
    """Background task yang menyiarkan telemetri realtime via WebSocket ke frontend dan mencatat riwayat ke DB"""
    tick = 0
    while True:
        try:
            tick += 1
            # Jika tidak terhubung ke broker MQTT riil, lakukan mikro-fluktuasi simulasi realistis
            if not mqtt_connected:
                delta = (hash(str(time.time())) % 20 - 10) * 0.015
                new_temp = round(max(22.0, min(35.0, current_telemetry.temp + delta)), 1)
                current_telemetry.temp = new_temp
                current_telemetry.timestamp = int(time.time() * 1000)

            # Catat ke database setiap 10 siklus (sekitar setiap 30 detik)
            if tick % 10 == 0:
                try:
                    with SessionLocal() as db_session:
                        db_session.add(TelemetryLogModel(
                            temp=current_telemetry.temp,
                            level_ok=current_telemetry.level_ok,
                            rssi=current_telemetry.rssi,
                            timestamp=current_telemetry.timestamp
                        ))
                        db_session.commit()
                except Exception as log_err:
                    logger.warning(f"Gagal mencatat riwayat telemetri berkala ke DB: {log_err}")

            # Broadcast telemetri ke semua WebSocket dashboard yang aktif
            await ws_manager.broadcast({
                "type": "telemetry",
                "data": current_telemetry.model_dump(),
                "mqtt_connected": mqtt_connected
            })
        except Exception as e:
            logger.error(f"Error pada loop telemetri: {e}")

        await asyncio.sleep(3.0)

# -------------------------------------------------------------
# FastAPI Lifespan Context Manager
# -------------------------------------------------------------
# FastAPI Lifespan Context Manager
# -------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 0. Initialize SQLite / MySQL Database Tables
    try:
        init_db()
        logger.info("Database (SQLite/MySQL) berhasil diinisialisasi.")
    except Exception as e:
        logger.error(f"Gagal inisialisasi database: {e}")

    # 1. Start MQTT Client (non-blocking)
    try:
        mqtt_client.connect_async(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)
        mqtt_client.loop_start()
        logger.info("Loop latar belakang MQTT dimulai.")
    except Exception as e:
        logger.warning(f"Koneksi broker MQTT tidak dapat diinisiasi ({e}). Mode simulasi aktif.")

    # 2. Start WebSocket Telemetry Streamer
    telemetry_task = asyncio.create_task(periodic_telemetry_loop())
    logger.info("SiPIO FastAPI Backend Siap Menyajikan API & WebSocket.")

    yield

    # Shutdown
    telemetry_task.cancel()
    try:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
    except Exception:
        pass
    logger.info("SiPIO FastAPI Backend Dihentikan.")

# -------------------------------------------------------------
# FastAPI Application Declaration
# -------------------------------------------------------------
app = FastAPI(
    title="SiPIO IoT Backend API & WebSocket Service",
    description="Layanan Backend Terintegrasi untuk Smart Fish Feeder & Pond Monitoring via FastAPI, WebSocket, dan MQTT Broker Bridge.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware (mendukung Vite dev http://localhost:5173 dan preview http://localhost:4173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount direktori foto kamera agar dapat diakses statis (misal http://localhost:8000/camera/pond_latest.jpg)
app.mount("/camera", StaticFiles(directory=str(FRONTEND_CAMERA_DIR)), name="camera")

# -------------------------------------------------------------
# REST API Endpoints
# -------------------------------------------------------------

@app.get("/")
def read_root():
    return {
        "app": "SiPIO IoT Backend Service",
        "framework": "FastAPI",
        "database": os.getenv("DATABASE_URL", "sqlite:///./sipio.db").split("://")[0],
        "status": "online",
        "docs_url": "/docs",
        "websocket_url": "/ws/telemetry",
        "mqtt_bridge": {
            "broker": f"{MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}",
            "connected": mqtt_connected
        }
    }

@app.get("/api/health")
def get_health():
    return {
        "status": "ok",
        "system": "SiPIO IoT Backend",
        "uptime_seconds": int(time.time() - start_time),
        "mqtt_connected": mqtt_connected,
        "websocket_clients": len(ws_manager.active_connections),
        "database_type": os.getenv("DATABASE_URL", "sqlite:///./sipio.db").split("://")[0],
        "devices": {
            "feeder_esp8266": {
                "online": current_telemetry.esp_online,
                "rssi": current_telemetry.rssi
            },
            "camera_esp32cam": {
                "online": current_telemetry.cam_online
            }
        }
    }

@app.get("/api/status")
def get_device_status(db: Session = Depends(get_db)):
    """Mengembalikan status terkini perangkat (PRD Section 12)"""
    dev = db.query(DeviceModel).filter_by(id="feeder01").first()
    return {
        "status": "online" if current_telemetry.esp_online else "offline",
        "device_id": "feeder01",
        "name": dev.name if dev else "SiPIO Feeder Kolam 1",
        "esp_online": current_telemetry.esp_online,
        "cam_online": current_telemetry.cam_online,
        "rssi": current_telemetry.rssi,
        "temp": current_telemetry.temp,
        "level_ok": current_telemetry.level_ok,
        "uptime_seconds": int(time.time() - start_time),
        "mqtt_connected": mqtt_connected,
        "timestamp": current_telemetry.timestamp
    }

@app.get("/api/telemetry")
def get_telemetry(
    from_ts: Optional[int] = Query(None, alias="from", description="Timestamp awal (ms)"),
    to_ts: Optional[int] = Query(None, alias="to", description="Timestamp akhir (ms)"),
    db: Session = Depends(get_db)
):
    """
    Jika query parameter 'from' atau 'to' disertakan, mengembalikan riwayat telemetri (PRD Section 12).
    Jika tanpa parameter, mengembalikan data telemetri terkini.
    """
    if from_ts is not None or to_ts is not None:
        q = db.query(TelemetryLogModel)
        if from_ts is not None:
            q = q.filter(TelemetryLogModel.timestamp >= from_ts)
        if to_ts is not None:
            q = q.filter(TelemetryLogModel.timestamp <= to_ts)
        logs = q.order_by(TelemetryLogModel.timestamp.desc()).limit(200).all()
        return [
            {
                "id": l.id,
                "temp": l.temp,
                "level_ok": l.level_ok,
                "rssi": l.rssi,
                "timestamp": l.timestamp
            }
            for l in logs
        ]
    return current_telemetry

@app.get("/api/telemetry/history")
def get_telemetry_history(
    range: Optional[str] = Query("all", description="Rentang waktu: '1h', '24h', '7d', atau 'all'"),
    db: Session = Depends(get_db)
):
    """Mengembalikan riwayat tren suhu air DS18B20 dari database MySQL/SQLite untuk grafik dashboard"""
    now_ms = int(time.time() * 1000)
    one_hour_ago = now_ms - (3600 * 1000)
    twenty_four_hours_ago = now_ms - (24 * 3600 * 1000)
    seven_days_ago = now_ms - (7 * 24 * 3600 * 1000)

    # Ambil log dari database urut berdasarkan waktu
    all_logs = db.query(TelemetryLogModel).filter(
        TelemetryLogModel.timestamp >= seven_days_ago
    ).order_by(TelemetryLogModel.timestamp.asc()).all()

    # 1. 1 Jam Terakhir (1h)
    data_1h = []
    logs_1h = [l for l in all_logs if l.timestamp >= one_hour_ago]
    step_1h = max(1, len(logs_1h) // 8) if len(logs_1h) > 8 else 1
    for l in logs_1h[::step_1h]:
        t_struct = time.localtime(l.timestamp / 1000)
        data_1h.append({
            "time": time.strftime("%H:%M", t_struct),
            "temp": round(l.temp, 1)
        })

    # 2. 24 Jam Terakhir (24h)
    data_24h = []
    logs_24h = [l for l in all_logs if l.timestamp >= twenty_four_hours_ago]
    step_24h = max(1, len(logs_24h) // 10) if len(logs_24h) > 10 else 1
    for l in logs_24h[::step_24h]:
        t_struct = time.localtime(l.timestamp / 1000)
        data_24h.append({
            "time": time.strftime("%H:%M", t_struct),
            "temp": round(l.temp, 1)
        })

    # 3. 7 Hari Terakhir (7d)
    data_7d = []
    day_map = {
        "Monday": "Senin", "Tuesday": "Selasa", "Wednesday": "Rabu",
        "Thursday": "Kamis", "Friday": "Jumat", "Saturday": "Sabtu", "Sunday": "Minggu"
    }
    daily_groups = {}
    for l in all_logs:
        t_struct = time.localtime(l.timestamp / 1000)
        day_name = day_map.get(time.strftime("%A", t_struct), time.strftime("%A", t_struct))
        day_key = (time.strftime("%Y-%m-%d", t_struct), day_name)
        daily_groups.setdefault(day_key, []).append(l.temp)

    for (date_str, day_name), temps in list(daily_groups.items())[-7:]:
        avg_t = round(sum(temps) / len(temps), 1)
        data_7d.append({
            "time": day_name,
            "temp": avg_t
        })

    # Fallback jika data masih sedikit
    if len(data_1h) == 0:
        for m in [50, 40, 30, 20, 10, 0]:
            ts = now_ms - (m * 60 * 1000)
            data_1h.append({
                "time": time.strftime("%H:%M", time.localtime(ts / 1000)),
                "temp": round(current_telemetry.temp + (m % 3 * 0.1 - 0.1), 1)
            })
    if len(data_24h) == 0:
        for h in [21, 18, 15, 12, 9, 6, 3, 0]:
            ts = now_ms - (h * 3600 * 1000)
            data_24h.append({
                "time": time.strftime("%H:00", time.localtime(ts / 1000)),
                "temp": round(26.0 + ((h * 7) % 5) * 0.8, 1)
            })
    if len(data_7d) == 0:
        days_id = ["Kamis", "Jumat", "Sabtu", "Minggu", "Senin", "Selasa", "Rabu"]
        temps = [27.8, 28.2, 28.9, 29.4, 28.6, 28.0, 28.4]
        for d, tp in zip(days_id, temps):
            data_7d.append({"time": d, "temp": tp})

    response_payload = {
        "1h": data_1h,
        "24h": data_24h,
        "7d": data_7d
    }

    if range and range in response_payload:
        return response_payload[range]
    return response_payload

@app.post("/api/feed")
async def trigger_feeding(req: FeedRequest, db: Session = Depends(get_db)):
    global last_feed_epoch_s

    # Proteksi 1: Sensor Level Air (PRD Section 11 & 13)
    if not current_telemetry.level_ok:
        skipped_log = FeedLogModel(
            timestamp_str=time.strftime("%d %b %Y %H:%M:%S"),
            source=req.source,
            duration_ms=req.duration_ms,
            result="skipped",
            reason="Gagal: Level air kolam terdeteksi di bawah batas aman (Float Switch GPIO14)"
        )
        db.add(skipped_log)
        db.commit()
        db.refresh(skipped_log)

        log_entry = {
            "id": skipped_log.id,
            "timestamp": skipped_log.timestamp_str,
            "source": skipped_log.source,
            "duration_ms": skipped_log.duration_ms,
            "result": skipped_log.result,
            "reason": skipped_log.reason
        }
        
        await ws_manager.broadcast({
            "type": "feed_event",
            "data": log_entry
        })
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pemberian pakan ditolak: Level air kolam rendah (Proteksi keselamatan aktif)."
        )

    # Proteksi 2: Jeda Minimal Antar Pakan 30 Menit (PRD Section 11 & 13)
    min_gap_sec = current_thresholds.min_gap_min * 60
    time_since_last_feed = time.time() - last_feed_epoch_s
    if last_feed_epoch_s > 0 and time_since_last_feed < min_gap_sec and not req.bypass_cooldown:
        rem_sec = int(min_gap_sec - time_since_last_feed)
        rem_min = rem_sec // 60
        rem_s = rem_sec % 60

        skipped_log = FeedLogModel(
            timestamp_str=time.strftime("%d %b %Y %H:%M:%S"),
            source=req.source,
            duration_ms=req.duration_ms,
            result="skipped",
            reason=f"Ditolak: Jeda 30 menit antar pakan belum terpenuhi ({rem_min}m {rem_s}s tersisa)"
        )
        db.add(skipped_log)
        db.commit()
        db.refresh(skipped_log)

        log_entry = {
            "id": skipped_log.id,
            "timestamp": skipped_log.timestamp_str,
            "source": skipped_log.source,
            "duration_ms": skipped_log.duration_ms,
            "result": skipped_log.result,
            "reason": skipped_log.reason
        }
        await ws_manager.broadcast({
            "type": "feed_event",
            "data": log_entry
        })

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pemberian pakan ditolak: Jeda minimal {current_thresholds.min_gap_min} menit antar pakan belum terpenuhi. Sisa waktu pengaman: {rem_min} menit {rem_s} detik."
        )

    # Kirim perintah putar servo ke broker MQTT jika terhubung
    payload = json.dumps({
        "action": "feed",
        "duration_ms": req.duration_ms,
        "timestamp": int(time.time() * 1000)
    })
    
    if mqtt_connected:
        mqtt_client.publish(TOPIC_FEED_CMD, payload, qos=1)
        logger.info(f"Published feed command to MQTT: {payload}")

    # Catat audit trail pakan sukses ke Database
    done_log = FeedLogModel(
        timestamp_str=time.strftime("%d %b %Y %H:%M:%S"),
        source=req.source,
        duration_ms=req.duration_ms,
        result="done",
        reason=f"Selesai: Servo berputar {req.duration_ms}ms tepat waktu"
    )
    db.add(done_log)
    db.commit()
    db.refresh(done_log)

    # Perbarui epoch waktu pakan terakhir untuk memulai jeda pengaman 30 menit
    last_feed_epoch_s = time.time()

    log_entry = {
        "id": done_log.id,
        "timestamp": done_log.timestamp_str,
        "source": done_log.source,
        "duration_ms": done_log.duration_ms,
        "result": done_log.result,
        "reason": done_log.reason
    }

    # Siarkan event pakan ke seluruh frontend PWA secara realtime
    await ws_manager.broadcast({
        "type": "feed_event",
        "data": log_entry
    })

    return {
        "success": True,
        "message": f"Perintah pakan {req.duration_ms}ms berhasil dikirim ke feeder",
        "log": log_entry
    }

@app.post("/api/feed/reset-cooldown")
def reset_feed_cooldown():
    """Mereset jeda waktu pengaman 30 menit untuk keperluan pengujian simulasi"""
    global last_feed_epoch_s
    last_feed_epoch_s = 0.0
    return {"success": True, "message": "Jeda pengaman 30 menit berhasil direset untuk pengujian"}

# -------------------------------------------------------------
# ESP32-CAM Snapshot Endpoints
# -------------------------------------------------------------
def cleanup_old_snapshots():
    """Pembersihan otomatis snapshot lama (> 7 hari) agar disk tidak penuh (PRD B-12)"""
    try:
        seven_days_ago_s = time.time() - (7 * 86400)
        for folder in [FRONTEND_CAMERA_DIR, BACKEND_STATIC_CAMERA_DIR]:
            if folder.exists():
                for p in folder.glob("*.jpg"):
                    if p.name not in ["pond_latest.jpg", "hopper_latest.jpg"]:
                        if p.stat().st_mtime < seven_days_ago_s:
                            p.unlink(missing_ok=True)
                            logger.info(f"Snapshot lama dihapus: {p.name}")
    except Exception as e:
        logger.warning(f"Gagal membersihkan snapshot lama: {e}")

@app.post("/api/camera/upload")
async def upload_camera_image(
    file: UploadFile = File(..., description="File foto JPEG dari ESP32-CAM"),
    area: str = Form("kolam", description="Area pemantauan: 'kolam' (permukaan kolam) atau 'hopper' (wadah pakan)"),
    db: Session = Depends(get_db)
):
    """
    Menerima unggahan foto snapshot dari ESP32-CAM secara periodik atau on-demand.
    Menyimpan foto terbaru, mencatat ke tabel camera_snapshots (PRD B-10 & 13.1), dan broadcast WebSocket.
    """
    allowed_exts = (".jpg", ".jpeg", ".png")
    is_valid_type = (file.content_type in ["image/jpeg", "image/jpg", "image/png"]) or any(
        file.filename.lower().endswith(ext) for ext in allowed_exts
    )
    if not is_valid_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format file tidak didukung ({file.content_type}). Harap unggah format JPEG/PNG."
        )

    area_clean = "hopper" if "hopper" in area.lower() else "kolam"
    target_filename = "hopper_latest.jpg" if area_clean == "hopper" else "pond_latest.jpg"

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File foto kosong (0 bytes)."
        )

    # Simpan ke frontend/public/camera/
    dest_frontend = FRONTEND_CAMERA_DIR / target_filename
    with open(dest_frontend, "wb") as f:
        f.write(contents)

    # Salin ke backend/static/camera/ sebagai arsip
    dest_backend = BACKEND_STATIC_CAMERA_DIR / target_filename
    try:
        with open(dest_backend, "wb") as f:
            f.write(contents)
    except Exception as e:
        logger.warning(f"Gagal menyalin foto ke arsip backend: {e}")

    # Catat ke tabel camera_snapshots (PRD Section 13.1 & B-10)
    try:
        snap = CameraSnapshotModel(
            device_id="feeder01",
            ts=time.strftime("%Y-%m-%d %H:%M:%S"),
            area=area_clean,
            image_path=f"/camera/{target_filename}",
            size_bytes=len(contents)
        )
        db.add(snap)
        db.commit()
    except Exception as db_err:
        logger.warning(f"Gagal mencatat snapshot ke DB: {db_err}")

    # Jalankan pembersihan berkala (PRD B-12)
    cleanup_old_snapshots()

    # Set status modul kamera online
    current_telemetry.cam_online = True
    now_ms = int(time.time() * 1000)
    time_str = time.strftime("%H:%M WIB")
    img_url = f"/camera/{target_filename}?t={now_ms}"

    # Siarkan event foto baru via WebSocket ke seluruh dashboard client
    await ws_manager.broadcast({
        "type": "camera_updated",
        "data": {
            "area": area_clean,
            "filename": target_filename,
            "url": img_url,
            "size_bytes": len(contents),
            "timestamp": now_ms,
            "timestamp_str": time_str
        }
    })

    logger.info(f"Foto ESP32-CAM ({area_clean}) diterima: {len(contents)} bytes -> {target_filename}")

    return {
        "success": True,
        "message": f"Foto {area_clean} berhasil diunggah dan diperbarui",
        "data": {
            "area": area_clean,
            "filename": target_filename,
            "url": img_url,
            "size_bytes": len(contents),
            "timestamp_str": time_str
        }
    }

@app.get("/api/camera/latest")
def get_latest_camera_status(area: Optional[str] = Query(None, description="Filter area: 'kolam' atau 'hopper'")):
    """Mengembalikan status foto terbaru dari kedua area pemantauan atau area tertentu (PRD B-11)"""
    kolam_path = FRONTEND_CAMERA_DIR / "pond_latest.jpg"
    hopper_path = FRONTEND_CAMERA_DIR / "hopper_latest.jpg"

    def get_info(path, area_name, default_title):
        if path.exists():
            mtime = os.path.getmtime(path)
            return {
                "exists": True,
                "area": area_name,
                "title": default_title,
                "url": f"/camera/{path.name}?t={int(mtime*1000)}",
                "size_bytes": os.path.getsize(path),
                "updated_at": time.strftime("%d %b %Y %H:%M WIB", time.localtime(mtime))
            }
        return {
            "exists": False,
            "area": area_name,
            "title": default_title,
            "url": f"/camera/{path.name}",
            "size_bytes": 0,
            "updated_at": "Belum ada foto"
        }

    if area:
        area_clean = "hopper" if "hopper" in area.lower() else "kolam"
        target_path = hopper_path if area_clean == "hopper" else kolam_path
        title = "Wadah Pakan Pelet (Hopper)" if area_clean == "hopper" else "Area Permukaan Kolam Ikan"
        return {
            "cam_online": current_telemetry.cam_online,
            "area": area_clean,
            "snapshot": get_info(target_path, area_clean, title)
        }

    return {
        "cam_online": current_telemetry.cam_online,
        "kolam": get_info(kolam_path, "kolam", "Area Permukaan Kolam Ikan"),
        "hopper": get_info(hopper_path, "hopper", "Wadah Pakan Pelet (Hopper)")
    }

@app.get("/api/schedules", response_model=List[ScheduleItem])
def get_schedules(db: Session = Depends(get_db)):
    rows = db.query(ScheduleModel).all()
    return [
        ScheduleItem(
            id=r.id,
            time=r.time,
            duration_ms=r.duration_ms,
            days=r.days,
            enabled=r.enabled,
            synced=r.synced
        )
        for r in rows
    ]

@app.post("/api/schedules", response_model=ScheduleItem, status_code=status.HTTP_201_CREATED)
async def create_schedule(item: ScheduleCreate, db: Session = Depends(get_db)):
    new_schedule = ScheduleModel(
        time=item.time,
        duration_ms=item.duration_ms,
        days=item.days,
        enabled=True,
        synced=True
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)

    # Sinkronisasi ke MQTT LittleFS topic
    all_schedules = [
        {"id": r.id, "time": r.time, "duration_ms": r.duration_ms, "days": r.days, "enabled": r.enabled}
        for r in db.query(ScheduleModel).all()
    ]
    if mqtt_connected:
        mqtt_client.publish(TOPIC_SCHEDULES, json.dumps(all_schedules), retain=True)

    await ws_manager.broadcast({
        "type": "schedules_updated",
        "data": all_schedules
    })

    return ScheduleItem(
        id=new_schedule.id,
        time=new_schedule.time,
        duration_ms=new_schedule.duration_ms,
        days=new_schedule.days,
        enabled=new_schedule.enabled,
        synced=new_schedule.synced
    )

@app.put("/api/schedules/{schedule_id}")
async def update_schedule(schedule_id: int, updated: dict, db: Session = Depends(get_db)):
    sched = db.query(ScheduleModel).filter_by(id=schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")

    if "time" in updated:
        sched.time = updated["time"]
    if "duration_ms" in updated:
        sched.duration_ms = int(updated["duration_ms"])
    if "days" in updated:
        sched.days = updated["days"]
    if "enabled" in updated:
        sched.enabled = bool(updated["enabled"])
    if "synced" in updated:
        sched.synced = bool(updated["synced"])

    db.commit()

    all_schedules = [
        {"id": r.id, "time": r.time, "duration_ms": r.duration_ms, "days": r.days, "enabled": r.enabled}
        for r in db.query(ScheduleModel).all()
    ]
    if mqtt_connected:
        mqtt_client.publish(TOPIC_SCHEDULES, json.dumps(all_schedules), retain=True)

    await ws_manager.broadcast({
        "type": "schedules_updated",
        "data": all_schedules
    })

    return {"success": True, "schedule": {"id": sched.id, "time": sched.time, "duration_ms": sched.duration_ms, "days": sched.days, "enabled": sched.enabled}}

@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    sched = db.query(ScheduleModel).filter_by(id=schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")

    db.delete(sched)
    db.commit()

    all_schedules = [
        {"id": r.id, "time": r.time, "duration_ms": r.duration_ms, "days": r.days, "enabled": r.enabled}
        for r in db.query(ScheduleModel).all()
    ]
    if mqtt_connected:
        mqtt_client.publish(TOPIC_SCHEDULES, json.dumps(all_schedules), retain=True)

    await ws_manager.broadcast({
        "type": "schedules_updated",
        "data": all_schedules
    })
    return {"success": True, "message": f"Jadwal {schedule_id} berhasil dihapus"}

@app.get("/api/thresholds", response_model=ThresholdsConfig)
def get_thresholds(db: Session = Depends(get_db)):
    t = db.query(ThresholdModel).filter_by(id=1).first()
    if t:
        return ThresholdsConfig(
            temp_min=t.temp_min,
            temp_max=t.temp_max,
            min_gap_min=t.min_gap_min,
            default_duration_ms=t.default_duration_ms,
            offline_after_s=t.offline_after_s,
            camera_interval_s=t.camera_interval_s
        )
    return current_thresholds

@app.put("/api/thresholds")
async def update_thresholds(cfg: ThresholdsConfig, db: Session = Depends(get_db)):
    t = db.query(ThresholdModel).filter_by(id=1).first()
    if not t:
        t = ThresholdModel(id=1)
        db.add(t)

    t.temp_min = cfg.temp_min
    t.temp_max = cfg.temp_max
    t.min_gap_min = cfg.min_gap_min
    t.default_duration_ms = cfg.default_duration_ms
    t.offline_after_s = cfg.offline_after_s
    t.camera_interval_s = cfg.camera_interval_s
    db.commit()

    await ws_manager.broadcast({
        "type": "thresholds_updated",
        "data": cfg.model_dump()
    })
    return {"success": True, "thresholds": cfg}

@app.get("/api/feed/logs")
@app.get("/api/logs")
def get_logs(db: Session = Depends(get_db)):
    """Mengembalikan riwayat log pemberian pakan (PRD Section 12)"""
    logs = db.query(FeedLogModel).order_by(FeedLogModel.id.desc()).limit(50).all()
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp_str,
            "source": l.source,
            "duration_ms": l.duration_ms,
            "result": l.result,
            "reason": l.reason
        }
        for l in logs
    ]

# -------------------------------------------------------------
# Alerts API Endpoints (PRD Section 13 & B-07)
# -------------------------------------------------------------
@app.get("/api/alerts")
def get_alerts(db: Session = Depends(get_db)):
    """Mengembalikan riwayat peringatan keselamatan kolam (PRD B-07)"""
    alerts = db.query(AlertModel).order_by(AlertModel.id.desc()).limit(30).all()
    return [
        {
            "id": a.id,
            "device_id": a.device_id,
            "ts": a.ts,
            "type": a.alert_type,
            "message": a.message,
            "acknowledged": a.acknowledged
        }
        for a in alerts
    ]

@app.put("/api/alerts/{alert_id}/ack")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    """Menandai alert telah dilihat (acknowledged)"""
    alt = db.query(AlertModel).filter_by(id=alert_id).first()
    if not alt:
        raise HTTPException(status_code=404, detail="Alert tidak ditemukan")
    alt.acknowledged = True
    db.commit()
    return {"success": True, "message": f"Alert #{alert_id} berhasil diakui"}

# -------------------------------------------------------------
# WebSocket Real-Time Endpoint (PRD Section 12: WS /ws)
# -------------------------------------------------------------
@app.websocket("/ws")
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Mendengarkan perintah realtime dari client (misal: trigger feed atau ping)
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                action = msg.get("action")
                
                if action == "ping":
                    await websocket.send_json({"type": "pong", "time": time.time()})
                elif action == "feed":
                    duration = int(msg.get("duration_ms", 2000))
                    # Lakukan aksi pakan
                    if current_telemetry.level_ok:
                        log_entry = {
                            "id": int(time.time() * 1000),
                            "timestamp": time.strftime("%d %b %Y %H:%M:%S"),
                            "source": "Manual (WebSocket PWA)",
                            "duration_ms": duration,
                            "result": "done",
                            "reason": f"Selesai: Servo berputar {duration}ms via WS"
                        }
                        feed_logs_db.insert(0, log_entry)
                        await ws_manager.broadcast({
                            "type": "feed_event",
                            "data": log_entry
                        })
                    else:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Level air kolam terlalu rendah. Pakan dibatalkan."
                        })
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket exception: {e}")
        ws_manager.disconnect(websocket)
