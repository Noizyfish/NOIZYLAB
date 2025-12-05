#!/usr/bin/env python3
"""🟫 WATCHER - Folder monitoring + cleanup"""
import os
import time
from pathlib import Path

class Watcher:
    def enforce(self, root="."):
        for r, d, f in os.walk(root):
            if not d and not f:
                placeholder = os.path.join(r, ".empty")
                if not os.path.exists(placeholder):
                    open(placeholder, "w").close()
                    print(f"Added: {placeholder}")

class FolderWatcher:
    def __init__(self, path):
        self.path = Path(path)
        self.state = {}
        self._snapshot()
    
    def _snapshot(self):
        self.state = {f: f.stat().st_mtime for f in self.path.rglob("*") if f.is_file()}
    
    def changes(self):
        current = {f: f.stat().st_mtime for f in self.path.rglob("*") if f.is_file()}
        new = set(current) - set(self.state)
        modified = [f for f in current if f in self.state and current[f] != self.state[f]]
        self.state = current
        return {"new": list(new), "modified": modified}
