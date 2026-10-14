import os
import time
from typing import Generator
from sqlalchemy import create_engine, String, Float, Boolean, Integer
from sqlalchemy.orm import declarative_base, sessionmaker, Session, Mapped, mapped_column

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# -------------------------------------------------------------
# Database Connection Configuration (SQLite or MySQL)
# -------------------------------------------------------------
# Untuk SQLite (default, tanpa instalasi server tambahan):
DEFAULT_SQLITE_URL = "sqlite:///./sipio.db"

# Untuk MySQL (misal menggunakan XAMPP / MariaDB / Laragon):
# Cukup set variabel lingkungan DATABASE_URL, contoh:
# DATABASE_URL = "mysql+pymysql://root:@localhost:3306/sipio_db"

DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)

# Konfigurasi argumen koneksi (SQLite butuh check_same_thread=False)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# -------------------------------------------------------------
# Database Models (Tabel-tabel SiPIO)
# -------------------------------------------------------------

class TelemetryLogModel(Base):
    """Merekam riwayat pembacaan sensor DS18B20 & Float Switch"""
    __tablename__ = "telemetry_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    temp: Mapped[float] = mapped_column(Float, nullable=False)
    level_ok: Mapped[bool] = mapped_column(Boolean, default=True)
    rssi: Mapped[int] = mapped_column(Integer, default=-61)
    timestamp: Mapped[int] = mapped_column(Integer, default=lambda: int(time.time() * 1000))

class FeedLogModel(Base):
    """Merekam jejak audit eksekusi pakan (jadwal vs manual)"""
    __tablename__ = "feed_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp_str: Mapped[str] = mapped_column(String(50), nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="Manual")
    duration_ms: Mapped[int] = mapped_column(Integer, default=2000)
    result: Mapped[str] = mapped_column(String(20), default="done")  # 'done' | 'skipped' | 'failed'
    reason: Mapped[str] = mapped_column(String(255), default="")

class ScheduleModel(Base):
    """Menyimpan jadwal pemberian pakan ikan harian"""
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    time: Mapped[str] = mapped_column(String(10), nullable=False) # e.g. "07:00"
    duration_ms: Mapped[int] = mapped_column(Integer, default=2000)
    days: Mapped[str] = mapped_column(String(50), default="Setiap Hari")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    synced: Mapped[bool] = mapped_column(Boolean, default=True)

class ThresholdModel(Base):
    """Menyimpan ambang batas pengaman sistem"""
    __tablename__ = "thresholds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    temp_min: Mapped[float] = mapped_column(Float, default=24.0)
    temp_max: Mapped[float] = mapped_column(Float, default=32.0)
    min_gap_min: Mapped[int] = mapped_column(Integer, default=30)
    default_duration_ms: Mapped[int] = mapped_column(Integer, default=2000)
    offline_after_s: Mapped[int] = mapped_column(Integer, default=60)
    camera_interval_s: Mapped[int] = mapped_column(Integer, default=300)

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
    db = SessionLocal()
    try:
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
