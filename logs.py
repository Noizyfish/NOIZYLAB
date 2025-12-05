# core/logs.py

from __future__ import annotations

import datetime as _dt
import os
from pathlib import Path
from typing import Optional, Dict, Any, List

from .config import get_base_dir


def get_logs_dir() -> Path:
    """
    Returns the logs directory (../logs).
    """
    return get_base_dir().parent / "logs"


def ensure_logs_dir() -> Path:
    logs_dir = get_logs_dir()
    logs_dir.mkdir(parents=True, exist_ok=True)
    return logs_dir


def _current_date_str() -> str:
    return _dt.datetime.now().strftime("%Y%m%d")


def _current_iso_timestamp() -> str:
    return _dt.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def get_daily_log_file() -> Path:
    """
    Returns the Path to today's log file (nlctl-YYYYMMDD.log).
    """
    logs_dir = ensure_logs_dir()
    filename = f"nlctl-{_current_date_str()}.log"
    return logs_dir / filename


def log_event(event_type: str, message: str, extra: Optional[Dict[str, Any]] = None) -> Path:
    """
    Log a single event.

    Format:
    TIMESTAMP [EVENT_TYPE] message | key=value key2=value2
    """
    log_file = get_daily_log_file()
    ts = _current_iso_timestamp()
    line = f"{ts} [{event_type}] {message}"

    if extra:
        # Flatten extra dict into key=value pairs
        kv_pairs = []
        for k, v in extra.items():
            if v is None:
                continue
            kv_pairs.append(f"{k}={v}")
        if kv_pairs:
            line += " | " + " ".join(kv_pairs)

    with log_file.open("a", encoding="utf-8") as f:
        f.write(line + os.linesep)

    return log_file


def get_latest_log_file() -> Optional[Path]:
    """
    Return the newest nlctl-YYYYMMDD.log file, or None if none exist.
    """
    logs_dir = ensure_logs_dir()
    candidates = sorted(
        [p for p in logs_dir.glob("nlctl-*.log") if p.is_file()],
        key=lambda p: p.name,
        reverse=True,
    )
    return candidates[0] if candidates else None


def tail_log_file(path: Path, lines: int = 40) -> List[str]:
    """
    Read last N lines of the given log file.
    """
    if not path.exists():
        return []

    # Simple approach: read all, slice.
    # For very large logs, a smarter tail could be used later.
    with path.open("r", encoding="utf-8") as f:
        all_lines = f.readlines()

    return [line.rstrip("\n") for line in all_lines[-lines:]]



def log_note(note: str) -> Path:
    """
    Log a user note with timestamp.
    """
    return log_event("USER-NOTE", note)
