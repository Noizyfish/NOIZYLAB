#!/usr/bin/env python3
import json
from pathlib import Path

class AIEngine:
    def ask(self, prompt): return f"[Entity] {prompt[:100]}..."

class EntitySpawner:
    FILE = Path(__file__).parent / "entities.json"
    def __init__(self):
        self.ai = AIEngine()
        if not self.FILE.exists():
            self.FILE.write_text(json.dumps({"entities": []}, indent=2))
    def spawn(self, realm_name, role):
        entity = self.ai.ask(f"Spawn entity in {realm_name} as {role}")
        data = json.loads(self.FILE.read_text())
        data["entities"].append({"realm": realm_name, "role": role, "data": entity})
        self.FILE.write_text(json.dumps(data, indent=2))
        return entity
