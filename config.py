# core/config.py

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Any


def get_base_dir() -> Path:
    """
    Returns the backend directory (where nlctl.py lives).
    """
    return Path(__file__).resolve().parent.parent


def get_config_dir() -> Path:
    """
    Returns the config directory (../config).
    """
    return get_base_dir().parent / "config"


def load_json(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_machines() -> Dict[str, Dict[str, Any]]:
    """
    Load machines from ../config/machines.json

    Expected shape (example):

    {
      "GABRIEL": {
        "id": "GABRIEL",
        "label": "Main Studio Mac",
        "host": "192.168.1.20",
        "role": "workstation",
        "tags": ["critical", "local"],
        "checks": ["ping", "disk"],
        "notes": "Primary repair workstation"
      },
      ...
    }
    """
    config_dir = get_config_dir()
    machines_path = config_dir / "machines.json"
    data = load_json(machines_path)

    # Normalize keys to uppercase ids
    normalized: Dict[str, Dict[str, Any]] = {}
    if isinstance(data, dict):
        for key, val in data.items():
            if not isinstance(val, dict):
                continue
            machine_id = (val.get("id") or key).upper()
            val["id"] = machine_id
            normalized[machine_id] = val
    else:
        raise ValueError("machines.json must be an object mapping ids to machine configs")

    return normalized

