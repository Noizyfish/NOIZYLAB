#!/usr/bin/env python3
"""🟩 FILEFLOW - GABRIEL sync + organization"""
import shutil
from pathlib import Path
from datetime import datetime

class FileFlow:
    BASE = Path("/Volumes/GABRIEL/Projects")
    ARCHIVE = Path("/Volumes/12TB/Archive")
    
    def sync(self, name, source=None):
        src = Path(source) if source else Path.cwd()
        dst = self.BASE / name
        dst.mkdir(parents=True, exist_ok=True)
        shutil.copytree(src, dst, dirs_exist_ok=True)
        print(f"✅ Synced: {dst}")
        return dst
    
    def archive(self, name):
        src = self.BASE / name
        ts = datetime.now().strftime("%Y%m%d")
        dst = self.ARCHIVE / f"{name}_{ts}"
        if src.exists():
            shutil.copytree(src, dst, dirs_exist_ok=True)
            print(f"📦 Archived: {dst}")
        return dst

class ProjectManager:
    TEMPLATE = {"Audio": ["Stems", "Bounces"], "MIDI": [], "Exports": ["Master", "Stems"], "Assets": []}
    
    def create(self, name, base="/Users/m2ultra/Music/Projects"):
        root = Path(base) / name
        for folder, subs in self.TEMPLATE.items():
            (root / folder).mkdir(parents=True, exist_ok=True)
            for sub in subs:
                (root / folder / sub).mkdir(exist_ok=True)
        print(f"✅ Created: {root}")
        return root
