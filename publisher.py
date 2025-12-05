#!/usr/bin/env python3
"""
🌌 NOIZYLAB - Telemetry Publisher
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

import sys
import os
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.system_health import SystemHealth, FishDriveHealth
from shared.schema.mqtt_topics import Topics
from shared.models.telemetry import (
    HealthTelemetry,
    ProcessTelemetry,
    ProcessInfo,
    DriveTelemetry,
    DriveInfo,
    SystemEvent,
)
from agent.core.mqtt_client import NoizyMQTTClient

logger = logging.getLogger(__name__)


class TelemetryPublisher:
    """Publishes system telemetry to MQTT"""
    
    def __init__(self, mqtt_client: NoizyMQTTClient, machine_name: str = "god"):
        self.mqtt = mqtt_client
        self.machine = machine_name
        self.health = SystemHealth()
        self.drives = FishDriveHealth()
    
    def publish_health(self):
        """Publish system health telemetry"""
        try:
            # Get health snapshot
            snap = self.health.snapshot()
            
            # Create telemetry model
            telemetry = HealthTelemetry(
                machine=self.machine,
                cpu_percent=snap['cpu_percent'],
                ram_percent=snap['ram']['percent'],
                ram_used_gb=snap['ram']['used_gb'],
                ram_total_gb=snap['ram']['total_gb'],
                disk_percent=snap['disk']['percent'],
                disk_free_gb=snap['disk']['free_gb'],
                network_latency_ms=snap['network_latency_ms'],
                uptime=snap['uptime'],
            )
            
            # Publish to MQTT
            topic = Topics.machine_health(self.machine)
            self.mqtt.publish(topic, telemetry.to_mqtt())
            
            logger.debug(f"✅ Published health telemetry")
        except Exception as e:
            logger.error(f"❌ Error publishing health: {e}")
    
    def publish_processes(self):
        """Publish top processes telemetry"""
        try:
            # Get top processes
            top_procs = self.health.top_processes(n=10)
            
            # Create process info models
            processes = [
                ProcessInfo(
                    pid=p['pid'],
                    name=p['name'],
                    cpu_percent=p.get('cpu_percent', 0.0),
                    memory_percent=p.get('memory_percent', 0.0),
                )
                for p in top_procs
            ]
            
            # Create telemetry model
            telemetry = ProcessTelemetry(
                machine=self.machine,
                processes=processes,
            )
            
            # Publish to MQTT
            topic = Topics.machine_processes(self.machine)
            self.mqtt.publish(topic, telemetry.to_mqtt())
            
            logger.debug(f"✅ Published process telemetry")
        except Exception as e:
            logger.error(f"❌ Error publishing processes: {e}")
    
    def publish_drives(self):
        """Publish Fish drives telemetry"""
        try:
            # Get drive status
            drive_status = self.drives.check_drives()
            
            # Create drive info models
            drives = [
                DriveInfo(
                    name=d['name'],
                    path=d['path'],
                    mounted=d['mounted'],
                    percent=d.get('percent'),
                    used_tb=d.get('used_tb'),
                    total_tb=d.get('total_tb'),
                    free_tb=d.get('free_tb'),
                    error=d.get('error'),
                )
                for d in drive_status
            ]
            
            # Create telemetry model
            telemetry = DriveTelemetry(
                machine=self.machine,
                drives=drives,
            )
            
            # Publish to MQTT
            topic = Topics.machine_drives(self.machine)
            self.mqtt.publish(topic, telemetry.to_mqtt())
            
            logger.debug(f"✅ Published drive telemetry")
        except Exception as e:
            logger.error(f"❌ Error publishing drives: {e}")
    
    def publish_event(
        self,
        event_type: str,
        message: str,
        severity: str = "info",
        metadata: dict = None,
    ):
        """Publish system event"""
        try:
            # Create event model
            event = SystemEvent(
                machine=self.machine,
                event_type=event_type,
                message=message,
                severity=severity,
                metadata=metadata,
            )
            
            # Publish to MQTT
            topic = Topics.machine_events(self.machine)
            self.mqtt.publish(topic, event.to_mqtt())
            
            logger.info(f"📢 Event: {message}")
        except Exception as e:
            logger.error(f"❌ Error publishing event: {e}")
