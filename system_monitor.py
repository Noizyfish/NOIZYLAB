#!/usr/bin/env python3
"""
🌌 NOIZYLAB - System Monitor Flow
Real-time system health monitoring
"""

import sys
import psutil
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

logger = logging.getLogger(__name__)


class SystemMonitorFlow:
    """System Health Monitoring"""
    
    def __init__(self):
        logger.info("📊 System Monitor Flow ready")
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health metrics"""
        return {
            "timestamp": datetime.now().isoformat(),
            "cpu": self.get_cpu_stats(),
            "memory": self.get_memory_stats(),
            "disk": self.get_disk_stats(),
            "network": self.get_network_stats(),
            "processes": self.get_top_processes(5)
        }
    
    def get_cpu_stats(self) -> Dict[str, Any]:
        """CPU statistics"""
        cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
        return {
            "overall": psutil.cpu_percent(interval=0.1),
            "per_core": cpu_percent,
            "count": psutil.cpu_count(),
            "freq_mhz": psutil.cpu_freq().current if psutil.cpu_freq() else None
        }
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Memory statistics"""
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        return {
            "total_gb": mem.total / (1024**3),
            "available_gb": mem.available / (1024**3),
            "used_gb": mem.used / (1024**3),
            "percent": mem.percent,
            "swap_total_gb": swap.total / (1024**3),
            "swap_used_gb": swap.used / (1024**3),
            "swap_percent": swap.percent
        }
    
    def get_disk_stats(self) -> Dict[str, Any]:
        """Disk statistics for all mounted volumes"""
        disks = {}
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disks[partition.mountpoint] = {
                    "device": partition.device,
                    "fstype": partition.fstype,
                    "total_gb": usage.total / (1024**3),
                    "used_gb": usage.used / (1024**3),
                    "free_gb": usage.free / (1024**3),
                    "percent": usage.percent
                }
            except PermissionError:
                continue
        return disks
    
    def get_network_stats(self) -> Dict[str, Any]:
        """Network statistics"""
        net_io = psutil.net_io_counters()
        return {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv,
            "errors_in": net_io.errin,
            "errors_out": net_io.errout
        }
    
    def get_top_processes(self, limit: int = 10):
        """Get top processes by CPU/Memory usage"""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                cpu = proc.info['cpu_percent'] or 0.0
                memory = proc.info['memory_percent'] or 0.0
                processes.append({
                    'pid': proc.info['pid'],
                    'name': proc.info['name'],
                    'cpu': cpu,
                    'memory': memory
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by CPU usage
        processes.sort(key=lambda x: x['cpu'], reverse=True)
        return processes[:limit]
    
    def check_alerts(self, thresholds: Dict[str, float] = None) -> list:
        """Check for system alerts based on thresholds"""
        if thresholds is None:
            thresholds = {
                'cpu_percent': 90,
                'memory_percent': 90,
                'disk_percent': 90
            }
        
        alerts = []
        health = self.get_system_health()
        
        # CPU alert
        if health['cpu']['overall'] > thresholds['cpu_percent']:
            alerts.append(f"⚠️  High CPU usage: {health['cpu']['overall']:.1f}%")
        
        # Memory alert
        if health['memory']['percent'] > thresholds['memory_percent']:
            alerts.append(f"⚠️  High memory usage: {health['memory']['percent']:.1f}%")
        
        # Disk alerts
        for mount, stats in health['disk'].items():
            if stats['percent'] > thresholds['disk_percent']:
                alerts.append(f"⚠️  High disk usage on {mount}: {stats['percent']:.1f}%")
        
        return alerts
    
    def print_summary(self):
        """Print system health summary"""
        health = self.get_system_health()
        
        print(f"\n{'='*60}")
        print(f"🖥️  SYSTEM HEALTH - {health['timestamp']}")
        print(f"{'='*60}")
        
        print(f"\n💻 CPU:")
        print(f"   Usage: {health['cpu']['overall']:.1f}%")
        print(f"   Cores: {health['cpu']['count']}")
        
        print(f"\n🧠 Memory:")
        print(f"   Used: {health['memory']['used_gb']:.1f} GB / {health['memory']['total_gb']:.1f} GB ({health['memory']['percent']:.1f}%)")
        print(f"   Available: {health['memory']['available_gb']:.1f} GB")
        
        print(f"\n💾 Disks:")
        for mount, stats in health['disk'].items():
            if '12TB' in mount or '6TB' in mount or mount == '/':
                print(f"   {mount}: {stats['used_gb']:.1f} GB / {stats['total_gb']:.1f} GB ({stats['percent']:.1f}%)")
        
        alerts = self.check_alerts()
        if alerts:
            print(f"\n⚠️  ALERTS:")
            for alert in alerts:
                print(f"   {alert}")
        else:
            print(f"\n✅ All systems healthy")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    monitor = SystemMonitorFlow()
    monitor.print_summary()
