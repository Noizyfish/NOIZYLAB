#!/usr/bin/env python3
import json
from pathlib import Path

class RealityRegistry:
    FILE = Path(__file__).parent / "realms.json"
    def __init__(self):
        self.FILE.parent.mkdir(parents=True, exist_ok=True)
        if not self.FILE.exists():
            self.FILE.write_text(json.dumps({"realms": {}}, indent=2))
    def create(self, name, data):
        content = json.loads(self.FILE.read_text())
        content["realms"][name] = data
        self.FILE.write_text(json.dumps(content, indent=2))
    def get(self, name):
        return json.loads(self.FILE.read_text())["realms"].get(name)
    def list_realms(self):
        return list(json.loads(self.FILE.read_text())["realms"].keys())
