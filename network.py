#!/usr/bin/env python3
"""🌐 NETWORK - MC96 health check"""
import subprocess
import socket
import time
from pathlib import Path

class Network:
    HOSTS = {"gateway": "192.168.0.1", "nas": "192.168.0.20", "dns": "8.8.8.8"}
    DRIVES = ["/Volumes/GABRIEL", "/Volumes/4TB Blue Fish", "/Volumes/12TB"]
    
    def check(self, ip):
        r = subprocess.run(["ping", "-c", "1", "-W", "1", ip], capture_output=True)
        return r.returncode == 0
    
    def latency(self, host="8.8.8.8"):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            start = time.perf_counter()
            sock.connect((host, 53))
            ms = (time.perf_counter() - start) * 1000
            sock.close()
            return round(ms, 2)
        except:
            return -1
    
    def status(self):
        return {
            "hosts": {k: self.check(v) for k, v in self.HOSTS.items()},
            "drives": {Path(d).name: Path(d).exists() for d in self.DRIVES},
            "latency": self.latency()
        }
