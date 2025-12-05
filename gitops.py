#!/usr/bin/env python3
"""🟨 GITOPS - Auto git sync"""
import subprocess
from datetime import datetime
from pathlib import Path

class GitOps:
    def __init__(self, repo="."):
        self.repo = Path(repo)
    
    def _run(self, cmd):
        return subprocess.run(cmd, cwd=self.repo, capture_output=True, text=True)
    
    def status(self):
        r = self._run(["git", "status", "--porcelain"])
        return r.stdout.strip().split("\n") if r.stdout.strip() else []
    
    def sync(self, msg=None):
        if not msg:
            msg = f"autosync {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        self._run(["git", "add", "-A"])
        self._run(["git", "commit", "-m", msg])
        self._run(["git", "push"])
        print(f"✅ Git synced: {msg}")
    
    def log(self, n=5):
        r = self._run(["git", "log", f"-{n}", "--oneline"])
        return r.stdout.strip().split("\n")
