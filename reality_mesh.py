#!/usr/bin/env python3
"""
🟦 NOIZYLAB - Cross-Reality Mesh Node
Same AI system operates across multiple machines, OSes, networks
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

import subprocess
import socket
import json
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
import asyncio


class RealityMesh:
    """Distributed execution mesh across multiple nodes"""

    NODES = [
        "127.0.0.1",
        "192.168.0.10",
        "192.168.0.20"
    ]

    def __init__(self, nodes: List[str] = None):
        self.nodes = nodes or self.NODES
        self.results: Dict = {}
        self.active_nodes: List[str] = []

    def broadcast(self, cmd: str) -> Dict:
        """Broadcast command to all nodes"""
        results = {}
        for node in self.nodes:
            try:
                result = subprocess.run(
                    ["ssh", node, cmd],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                results[node] = {
                    "success": result.returncode == 0,
                    "stdout": result.stdout,
                    "stderr": result.stderr
                }
                print(f"✅ RealityMesh executed on {node}")
            except subprocess.TimeoutExpired:
                results[node] = {"success": False, "error": "timeout"}
                print(f"⚠️ Timeout on {node}")
            except Exception as e:
                results[node] = {"success": False, "error": str(e)}
                print(f"❌ Failed on {node}: {e}")
        
        self.results = results
        return results

    def broadcast_local(self, cmd: str) -> str:
        """Execute command locally only"""
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.stdout

    def ping_nodes(self) -> Dict[str, bool]:
        """Check which nodes are reachable"""
        status = {}
        for node in self.nodes:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                result = sock.connect_ex((node, 22))
                status[node] = result == 0
                sock.close()
            except:
                status[node] = False
        
        self.active_nodes = [n for n, s in status.items() if s]
        return status

    def sync_file(self, local_path: str, remote_path: str, nodes: List[str] = None):
        """Sync file to nodes via rsync"""
        targets = nodes or self.active_nodes or self.nodes
        for node in targets:
            try:
                subprocess.run(
                    ["rsync", "-avz", local_path, f"{node}:{remote_path}"],
                    capture_output=True,
                    timeout=60
                )
                print(f"📤 Synced to {node}")
            except Exception as e:
                print(f"❌ Sync failed to {node}: {e}")

    def gather(self, cmd: str) -> Dict:
        """Execute and gather results from all nodes"""
        return self.broadcast(cmd)

    def status(self) -> Dict:
        """Get mesh status"""
        ping_results = self.ping_nodes()
        return {
            "total_nodes": len(self.nodes),
            "active_nodes": len(self.active_nodes),
            "nodes": ping_results,
            "last_results": self.results
        }


class NodeCluster:
    """Manage a cluster of NOIZYLAB nodes"""

    def __init__(self):
        self.mesh = RealityMesh()
        self.cluster_id = f"noizylab-{datetime.now().strftime('%Y%m%d')}"

    def deploy(self, package_path: str):
        """Deploy package to all nodes"""
        print(f"🚀 Deploying {package_path} to cluster...")
        self.mesh.sync_file(package_path, "/opt/noizylab/")
        self.mesh.broadcast("cd /opt/noizylab && pip install -r requirements.txt")

    def start_all(self, service: str):
        """Start service on all nodes"""
        return self.mesh.broadcast(f"systemctl start {service}")

    def stop_all(self, service: str):
        """Stop service on all nodes"""
        return self.mesh.broadcast(f"systemctl stop {service}")

    def health_check(self) -> Dict:
        """Check health of all nodes"""
        return self.mesh.gather("python3 -c 'import psutil; print(psutil.cpu_percent())'")


if __name__ == "__main__":
    mesh = RealityMesh()
    
    print("🌐 REALITY MESH")
    print(f"   Nodes: {mesh.nodes}")
    print(f"   Status: {mesh.ping_nodes()}")
    print("\n🔥 GORUNFREE! 🎸🔥")
