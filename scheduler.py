#!/usr/bin/env python3
"""⏰ SCHEDULER - Task scheduling"""
import time
import threading
from datetime import datetime

class Scheduler:
    def __init__(self):
        self.tasks = []
        self.running = False
    
    def add(self, fn, interval_sec, name=None):
        self.tasks.append({"fn": fn, "interval": interval_sec, "name": name or fn.__name__, "last": 0})
    
    def run(self):
        self.running = True
        while self.running:
            now = time.time()
            for t in self.tasks:
                if now - t["last"] >= t["interval"]:
                    try:
                        t["fn"]()
                        t["last"] = now
                    except Exception as e:
                        print(f"⚠️ {t['name']}: {e}")
            time.sleep(1)
    
    def start_background(self):
        thread = threading.Thread(target=self.run, daemon=True)
        thread.start()
    
    def stop(self):
        self.running = False
