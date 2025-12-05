#!/usr/bin/env python3
"""📝 LOGGER - Simple logging"""
from datetime import datetime
from pathlib import Path

class Logger:
    def __init__(self, name="noizylab", log_dir=None):
        self.name = name
        self.log_dir = Path(log_dir) if log_dir else Path.home() / ".noizylab" / "logs"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.log_dir / f"{name}.log"
    
    def _write(self, level, msg):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{ts}] [{level}] {msg}"
        print(line)
        with open(self.log_file, "a") as f:
            f.write(line + "\n")
    
    def info(self, msg): self._write("INFO", msg)
    def warn(self, msg): self._write("WARN", msg)
    def error(self, msg): self._write("ERROR", msg)
    def debug(self, msg): self._write("DEBUG", msg)

log = Logger()
