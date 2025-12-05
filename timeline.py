#!/usr/bin/env python3
import json
from pathlib import Path
from datetime import datetime

class MultiTimeline:
    FILE = Path(__file__).parent / "timeline.json"
    def __init__(self):
        if not self.FILE.exists():
            self.FILE.write_text(json.dumps({"timelines": []}, indent=2))
    def branch(self, description):
        data = json.loads(self.FILE.read_text())
        data["timelines"].append({"branch": description, "ts": datetime.now().isoformat()})
        self.FILE.write_text(json.dumps(data, indent=2))
