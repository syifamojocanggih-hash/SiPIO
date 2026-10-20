import os
import time
from typing import Generator
from sqlalchemy import create_engine, String, Float, Boolean, Integer, BigInteger
from sqlalchemy.orm import declarative_base, sessionmaker, Session, Mapped, mapped_column

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# -------------------------------------------------------------
# Database Connection Configuration (SQLite or MySQL)
# -------------------------------------------------------------
DEFAULT_SQLITE_URL = "sqlite:///./sipio.db"
target_db_url = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)

def create_resilient_engine():
    global DATABASE_URL
    target = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)
    connect_args = {"check_same_thread": False} if target.startswith("sqlite") else {}
    
    eng = create_engine(target, connect_args=connect_args, pool_pre_ping=True)
    if not target.startswith("sqlite"):
        try:
            with eng.connect() as conn:
                pass
            DATABASE_URL = target
            return eng
        except Exception as err:
            print(f"[SiPIO Database] Server {target} tidak dapat diakses ({err}).")
            print(f"[SiPIO Database] Beralih otomatis ke database lokal SQLite: {DEFAULT_SQLITE_URL}")
            DATABASE_URL = DEFAULT_SQLITE_URL
            return create_engine(DEFAULT_SQLITE_URL, connect_args={"check_same_thread": False}, pool_pre_ping=True)
    
    DATABASE_URL = target
    return eng

engine = create_resilient_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# -------------------------------------------------------------
# Database Models (Tabel-tabel SiPIO Sesuai PRD Section 13)
# -------------------------------------------------------------

class DeviceModel(Base):
    """Menyimpan data identitas perangkat feeder/kamera (PRD Section 13.1)"""
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default="feeder01")
    name: Mapped[str] = mapped_column(String(100), default="SiPIO Feeder Kolam 1")
    device_type: Mapped[str] = mapped_column(String(50), default="esp8266_feeder")
    is_online: Mapped[bool] = mapped_column(Boolean, default=True)
    last_seen: Mapped[int] = mapped_column(BigInteger, default=lambda: int(time.time() * 1000))

class TelemetryLogModel(Base):
    """Merekam riwayat pembacaan sensor DS18B20 & Float Switch (PRD Section 13)"""
    __tablename__ = "telemetry_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(50), default="feeder01")
    temp: Mapped[float] = mapped_column(Float, nullable=False)
    level_ok: Mapped[bool] = mapped_column(Boolean, default=True)
    rssi: Mapped[int] = mapped_column(Integer, default=-61)
    timestamp: Mapped[int] = mapped_column(BigInteger, default=lambda: int(time.time() * 1000))

class FeedLogModel(Base):
    """Merekam jejak audit eksekusi pakan (jadwal vs manual) (PRD Section 13)"""
    __tablename__ = "feed_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(50), default="feeder01")
    timestamp_str: Mapped[str] = mapped_column(String(50), nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="Manual")
    duration_ms: Mapped[int] = mapped_column(Integer, default=2000)
    result: Mapped[str] = mapped_column(String(20), default="done")  # 'done' | 'skipped' | 'failed'
    reason: Mapped[str] = mapped_column(String(255), default="")

class ScheduleModel(Base):
    """Menyimpan jadwal pemberian pakan ikan harian (PRD Section 13)"""
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(50), default="feeder01")
    time: Mapped[str] = mapped_column(String(10), nullable=False) # e.g. "07:00"
    duration_ms: Mapped[int] = mapped_column(Integer, default=2000)
    days: Mapped[str] = mapped_column(String(50), default="Setiap Hari")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    synced: Mapped[bool] = mapped_column(Boolean, default=True)

class ThresholdModel(Base):
    """Menyimpan ambang batas pengaman sistem (PRD Section 13 & 13.1)"""
    __tablename__ = "thresholds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    temp_min: Mapped[float] = mapped_column(Float, default=24.0)
    temp_max: Mapped[float] = mapped_column(Float, default=32.0)
    min_gap_min: Mapped[int] = mapped_column(Integer, default=30)
    default_duration_ms: Mapped[int] = mapped_column(Integer, default=2000)
    offline_after_s: Mapped[int] = mapped_column(Integer, default=60)
    camera_interval_s: Mapped[int] = mapped_column(Integer, default=300)

class AlertModel(Base):
    """Menyimpan riwayat alert keselamatan (PRD Section 13 & B-07)"""
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(50), default="feeder01")
    ts: Mapped[int] = mapped_column(BigInteger, default=lambda: int(time.time() * 1000))
    alert_type: Mapped[str] = mapped_column(String(50)) # 'level_low' | 'temp_abnormal' | 'offline'
    message: Mapped[str] = mapped_column(String(255))
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)

class CameraSnapshotModel(Base):
    """Menyimpan metadata foto snapshot kamera ESP32-CAM (PRD Section 13.1 & B-10)"""
    __tablename__ = "camera_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(50), default="feeder01")
    ts: Mapped[str] = mapped_column(String(50)) # e.g. "2026-10-20 20:00:00"
    area: Mapped[str] = mapped_column(String(20)) # 'kolam' | 'hopper'
    image_path: Mapped[str] = mapped_column(String(255))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)

# -------------------------------------------------------------
# Dependency Injection Session
# -------------------------------------------------------------
def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency untuk membuka dan menutup database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------------------------------------------
# Database Initialization & Seeding
# -------------------------------------------------------------
def init_db():
    """Membuat tabel jika belum ada dan mengisi data awal default"""
    Base.metadata.create_all(bind=engine)

    # Migrasi otomatis kolom device_id untuk SQLite jika tabel lama sudah ada
    if str(engine.url).startswith("sqlite"):
        import sqlite3
        raw_db_path = str(engine.url).split("sqlite:///")[-1]
        if os.path.exists(raw_db_path):
            try:
                with sqlite3.connect(raw_db_path) as conn:
                    cursor = conn.cursor()
                    for tbl in ["schedules", "feed_logs", "telemetry_logs"]:
                        try:
                            cursor.execute(f"ALTER TABLE {tbl} ADD COLUMN device_id TEXT DEFAULT 'feeder01'")
                        except Exception:
                            pass
                    conn.commit()
            except Exception:
                pass

    db = SessionLocal()
    try:
        # 0. Seed Device jika belum ada (PRD Section 13.1)
        device = db.query(DeviceModel).filter_by(id="feeder01").first()
        if not device:
            default_device = DeviceModel(
                id="feeder01",
                name="SiPIO Feeder Kolam 1",
                device_type="esp8266_feeder",
                is_online=True
            )
            db.add(default_device)
            db.commit()

        # 1. Seed Thresholds jika masih kosong
        threshold = db.query(ThresholdModel).filter_by(id=1).first()
        if not threshold:
            default_thresh = ThresholdModel(
                id=1,
                temp_min=24.0,
                temp_max=32.0,
                min_gap_min=30,
                default_duration_ms=2000,
                offline_after_s=60,
                camera_interval_s=300
            )
            db.add(default_thresh)
            db.commit()

        # 2. Seed Jadwal Awal jika belum ada
        if db.query(ScheduleModel).count() == 0:
            schedules = [
                ScheduleModel(id=1, time="07:00", duration_ms=2000, days="Setiap Hari", enabled=True, synced=True),
                ScheduleModel(id=2, time="16:30", duration_ms=2000, days="Setiap Hari", enabled=True, synced=True)
            ]
            db.add_all(schedules)
            db.commit()

        # 3. Seed Feed Logs Awal jika belum ada
        if db.query(FeedLogModel).count() == 0:
            logs = [
                FeedLogModel(
                    id=101,
                    timestamp_str="14 Okt 2026 07:00:02",
                    source="Jadwal Otomatis (ESP)",
                    duration_ms=2000,
                    result="done",
                    reason="Selesai tepat waktu (deviasi < 30s)"
                ),
                FeedLogModel(
                    id=102,
                    timestamp_str="14 Okt 2026 12:15:10",
                    source="Manual (Dashboard)",
                    duration_ms=2000,
                    result="done",
                    reason="Diberikan manual via tombol pakan cepat"
                )
            ]
            db.add_all(logs)
            db.commit()

        # 4. Seed Telemetry Logs Awal jika belum ada (untuk grafik tren suhu)
        if db.query(TelemetryLogModel).count() == 0:
            now_ms = int(time.time() * 1000)
            telemetry_entries = []
            
            # 7 hari terakhir (1 data per hari)
            past_temps_7d = [27.8, 28.2, 28.9, 29.4, 28.6, 28.0, 28.4]
            for day_offset, temp_val in enumerate(past_temps_7d):
                t_stamp = now_ms - ((7 - day_offset) * 86400 * 1000)
                telemetry_entries.append(
                    TelemetryLogModel(temp=temp_val, level_ok=True, rssi=-63, timestamp=t_stamp)
                )

            # 24 jam terakhir (setiap 3 jam)
            past_temps_24h = [26.2, 25.8, 26.5, 27.9, 30.4, 29.8, 28.7, 28.1]
            for hour_offset, temp_val in enumerate(past_temps_24h):
                t_stamp = now_ms - ((8 - hour_offset) * 3 * 3600 * 1000)
                telemetry_entries.append(
                    TelemetryLogModel(temp=temp_val, level_ok=True, rssi=-61, timestamp=t_stamp)
                )

            # 1 jam terakhir (setiap 10 menit)
            past_temps_1h = [28.3, 28.4, 28.5, 28.4, 28.3, 28.4]
            for min_offset, temp_val in enumerate(past_temps_1h):
                t_stamp = now_ms - ((6 - min_offset) * 10 * 60 * 1000)
                telemetry_entries.append(
                    TelemetryLogModel(temp=temp_val, level_ok=True, rssi=-60, timestamp=t_stamp)
                )

            db.add_all(telemetry_entries)
            db.commit()
    finally:
        db.close()
