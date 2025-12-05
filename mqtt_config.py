#!/usr/bin/env python3
"""
🌌 NOIZYLAB - MQTT Configuration
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel


class MQTTConfig(BaseModel):
    """MQTT Broker Configuration"""
    host: str = "localhost"
    port: int = 1883
    keepalive: int = 60
    username: Optional[str] = None
    password: Optional[str] = None
    client_id_prefix: str = "noizylab"
    clean_session: bool = True
    qos: int = 1  # 0=at most once, 1=at least once, 2=exactly once
    retain: bool = False
    
    @classmethod
    def from_env(cls) -> "MQTTConfig":
        """Load configuration from environment variables"""
        return cls(
            host=os.getenv("MQTT_HOST", "localhost"),
            port=int(os.getenv("MQTT_PORT", "1883")),
            username=os.getenv("MQTT_USERNAME"),
            password=os.getenv("MQTT_PASSWORD"),
        )


class AgentConfig(BaseModel):
    """Agent Configuration"""
    machine_name: str = "god"  # god, gabriel, lucy
    telemetry_interval_seconds: int = 5  # How often to publish health telemetry
    process_monitor_enabled: bool = True
    process_monitor_top_n: int = 10
    drive_monitor_enabled: bool = True
    drive_monitor_interval_seconds: int = 30
    
    # Fish drives to monitor
    fish_drives: list = [
        "/Volumes/4TB Blue Fish",
        "/Volumes/4TB Big Fish",
        "/Volumes/4TB FISH SG",
        "/Volumes/12TB",
        "/Volumes/MAG 4TB",
        "/Volumes/EW",
        "/Volumes/SIDNEY",
        "/Volumes/4TB_02",
        "/Volumes/RED DRAGON",
        "/Volumes/4TB Lacie",
    ]
    
    @classmethod
    def from_env(cls) -> "AgentConfig":
        """Load configuration from environment variables"""
        return cls(
            machine_name=os.getenv("NOIZYLAB_MACHINE", "god"),
            telemetry_interval_seconds=int(os.getenv("TELEMETRY_INTERVAL", "5")),
        )


class PortalConfig(BaseModel):
    """Portal Configuration"""
    websocket_url: str = "ws://localhost:9001"  # MQTT WebSocket bridge
    voice_enabled: bool = True
    gaze_tracking_enabled: bool = False
    dwell_time_ms: int = 1500  # How long to dwell for activation
    
    @classmethod
    def from_env(cls) -> "PortalConfig":
        """Load configuration from environment variables"""
        return cls(
            websocket_url=os.getenv("MQTT_WEBSOCKET_URL", "ws://localhost:9001"),
            voice_enabled=os.getenv("VOICE_ENABLED", "true").lower() == "true",
        )


# Global config instances
mqtt_config = MQTTConfig.from_env()
agent_config = AgentConfig.from_env()
portal_config = PortalConfig.from_env()
