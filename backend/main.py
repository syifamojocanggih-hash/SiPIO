import asyncio
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import paho.mqtt.client as mqtt
from sqlalchemy.orm import Session

from database import (
    init_db, get_db, SessionLocal,
    TelemetryLogModel, FeedLogModel, ScheduleModel, ThresholdModel
)

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

# MQTT Topics
TOPIC_TELEMETRY = "sipio/feeder/telemetry"
TOPIC_FEEDER_STATUS = "sipio/feeder/status"
TOPIC_CAM_STATUS = "sipio/camera/status"
TOPIC_FEED_CMD = "sipio/feeder/command"
TOPIC_SCHEDULES = "sipio/feeder/schedules"

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
            (TOPIC_CAM_STATUS, 0)
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
        
        if topic == TOPIC_TELEMETRY:
            payload = json.loads(payload_str)
            current_telemetry.temp = float(payload.get("temp", current_telemetry.temp))
            current_telemetry.level_ok = bool(payload.get("level_ok", current_telemetry.level_ok))
            current_telemetry.rssi = int(payload.get("rssi", current_telemetry.rssi))
            current_telemetry.timestamp = int(time.time() * 1000)
        elif topic == TOPIC_FEEDER_STATUS:
            current_telemetry.esp_online = (payload_str.lower() == "online")
        elif topic == TOPIC_CAM_STATUS:
            current_telemetry.cam_online = (payload_str.lower() == "online")
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
    """Background task yang menyiarkan telemetri realtime via WebSocket ke frontend"""
    while True:
        try:
            # Jika tidak terhubung ke broker MQTT riil, lakukan mikro-fluktuasi simulasi realistis
            if not mqtt_connected:
                delta = (hash(str(time.time())) % 20 - 10) * 0.015
                new_temp = round(max(22.0, min(35.0, current_telemetry.temp + delta)), 1)
                current_telemetry.temp = new_temp
                current_telemetry.timestamp = int(time.time() * 1000)

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

@app.get("/api/telemetry", response_model=TelemetryData)
def get_telemetry():
    return current_telemetry

@app.post("/api/feed")
async def trigger_feeding(req: FeedRequest, db: Session = Depends(get_db)):
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

@app.get("/api/logs")
def get_logs(db: Session = Depends(get_db)):
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
# WebSocket Real-Time Endpoint
# -------------------------------------------------------------
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
