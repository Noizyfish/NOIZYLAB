#!/usr/bin/env python3
"""
🌌 NOIZYLAB - Telemetry Data Models
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# Machine types
MachineType = Literal["god", "gabriel", "lucy"]


class HealthTelemetry(BaseModel):
    """System health telemetry"""
    timestamp: datetime = Field(default_factory=datetime.now)
    machine: MachineType
    cpu_percent: float = Field(ge=0, le=100)
    ram_percent: float = Field(ge=0, le=100)
    ram_used_gb: float = Field(ge=0)
    ram_total_gb: float = Field(ge=0)
    disk_percent: float = Field(ge=0, le=100)
    disk_free_gb: float = Field(ge=0)
    network_latency_ms: float = Field(ge=-1)  # -1 means error
    uptime: str
    
    def to_mqtt(self) -> dict:
        """Convert to MQTT message payload"""
        return {
            "timestamp": self.timestamp.isoformat(),
            "machine": self.machine,
            "type": "health",
            "data": {
                "cpu_percent": self.cpu_percent,
                "ram_percent": self.ram_percent,
                "ram_used_gb": self.ram_used_gb,
                "ram_total_gb": self.ram_total_gb,
                "disk_percent": self.disk_percent,
                "disk_free_gb": self.disk_free_gb,
                "network_latency_ms": self.network_latency_ms,
                "uptime": self.uptime
            }
        }


class ProcessInfo(BaseModel):
    """Process information"""
    pid: int
    name: str
    cpu_percent: float
    memory_percent: float


class ProcessTelemetry(BaseModel):
    """Top processes telemetry"""
    timestamp: datetime = Field(default_factory=datetime.now)
    machine: MachineType
    processes: List[ProcessInfo]
    
    def to_mqtt(self) -> dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "machine": self.machine,
            "type": "processes",
            "data": {
                "processes": [p.model_dump() for p in self.processes]
            }
        }


class DriveInfo(BaseModel):
    """Fish drive information"""
    name: str
    path: str
    mounted: bool
    percent: Optional[float] = None
    used_tb: Optional[float] = None
    total_tb: Optional[float] = None
    free_tb: Optional[float] = None
    error: Optional[str] = None


class DriveTelemetry(BaseModel):
    """Fish drives telemetry"""
    timestamp: datetime = Field(default_factory=datetime.now)
    machine: MachineType
    drives: List[DriveInfo]
    
    def to_mqtt(self) -> dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "machine": self.machine,
            "type": "drives",
            "data": {
                "drives": [d.model_dump() for d in self.drives]
            }
        }


class SystemEvent(BaseModel):
    """System event"""
    timestamp: datetime = Field(default_factory=datetime.now)
    machine: MachineType
    event_type: Literal["startup", "shutdown", "alert", "error", "info"]
    message: str
    severity: Literal["low", "medium", "high", "critical"] = "info"
    metadata: Optional[dict] = None
    
    def to_mqtt(self) -> dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "machine": self.machine,
            "type": "event",
            "data": {
                "event_type": self.event_type,
                "message": self.message,
                "severity": self.severity,
                "metadata": self.metadata or {}
            }
        }


class ConsentEnvelope(BaseModel):
    """Consent envelope for rituals requiring user approval"""
    ritual_id: str
    ritual_type: Literal["backup_now", "content_migration", "destructive_operation"]
    requested_by: str
    timestamp: datetime = Field(default_factory=datetime.now)
    scope: dict  # Operation-specific details
    consent_required: bool = True
    consent_granted: Optional[bool] = None
    consent_timestamp: Optional[datetime] = None
    consent_user: Optional[str] = None
    
    def to_mqtt(self) -> dict:
        return {
            "ritual_id": self.ritual_id,
            "ritual_type": self.ritual_type,
            "requested_by": self.requested_by,
            "timestamp": self.timestamp.isoformat(),
            "scope": self.scope,
            "consent_required": self.consent_required,
            "consent_granted": self.consent_granted,
            "consent_timestamp": self.consent_timestamp.isoformat() if self.consent_timestamp else None,
            "consent_user": self.consent_user
        }


class FlowProgress(BaseModel):
    """Flow execution progress"""
    flow_id: str
    flow_type: str
    timestamp: datetime = Field(default_factory=datetime.now)
    progress_percent: float = Field(ge=0, le=100)
    status: Literal["started", "in_progress", "completed", "failed", "cancelled"]
    message: str
    metadata: Optional[dict] = None
    
    def to_mqtt(self) -> dict:
        return {
            "flow_id": self.flow_id,
            "flow_type": self.flow_type,
            "timestamp": self.timestamp.isoformat(),
            "progress_percent": self.progress_percent,
            "status": self.status,
            "message": self.message,
            "metadata": self.metadata or {}
        }


class FlowResult(BaseModel):
    """Flow execution result"""
    flow_id: str
    flow_type: str
    timestamp: datetime = Field(default_factory=datetime.now)
    success: bool
    duration_seconds: float
    summary: str
    details: dict
    ai_summary: Optional[str] = None
    
    def to_mqtt(self) -> dict:
        return {
            "flow_id": self.flow_id,
            "flow_type": self.flow_type,
            "timestamp": self.timestamp.isoformat(),
            "success": self.success,
            "duration_seconds": self.duration_seconds,
            "summary": self.summary,
            "details": self.details,
            "ai_summary": self.ai_summary
        }
