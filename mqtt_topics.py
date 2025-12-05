#!/usr/bin/env python3
"""
🌌 NOIZYLAB - MQTT Topic Schema
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

from typing import Literal

# Base topics
BASE = "noizylab"

# Machine names
Machine = Literal["god", "gabriel", "lucy"]

class Topics:
    """MQTT Topic Schema for NOIZYLAB"""
    
    # Machine telemetry
    @staticmethod
    def machine_health(machine: Machine) -> str:
        """Machine health telemetry: CPU, RAM, disk, network"""
        return f"{BASE}/machines/{machine}/health"
    
    @staticmethod
    def machine_processes(machine: Machine) -> str:
        """Top processes by CPU/RAM usage"""
        return f"{BASE}/machines/{machine}/processes"
    
    @staticmethod
    def machine_drives(machine: Machine) -> str:
        """Fish drive status (mounted, usage, health)"""
        return f"{BASE}/machines/{machine}/drives"
    
    @staticmethod
    def machine_events(machine: Machine) -> str:
        """System events (startup, shutdown, alerts)"""
        return f"{BASE}/machines/{machine}/events"
    
    # Health Scan flow
    HEALTH_SCAN_TRIGGER = f"{BASE}/flows/health_scan/trigger"
    HEALTH_SCAN_PROGRESS = f"{BASE}/flows/health_scan/progress"
    HEALTH_SCAN_RESULT = f"{BASE}/flows/health_scan/result"
    
    # Backup Now flow
    BACKUP_NOW_TRIGGER = f"{BASE}/flows/backup_now/trigger"
    BACKUP_NOW_CONSENT = f"{BASE}/flows/backup_now/consent"
    BACKUP_NOW_PROGRESS = f"{BASE}/flows/backup_now/progress"
    BACKUP_NOW_RESULT = f"{BASE}/flows/backup_now/result"
    
    # Content Migration flow
    MIGRATION_TRIGGER = f"{BASE}/flows/content_migration/trigger"
    MIGRATION_CONSENT = f"{BASE}/flows/content_migration/consent"
    MIGRATION_PROGRESS = f"{BASE}/flows/content_migration/progress"
    MIGRATION_RESULT = f"{BASE}/flows/content_migration/result"
    
    # AI orchestration
    AI_SUMMARY_REQUEST = f"{BASE}/ai/summary/request"
    AI_SUMMARY_RESPONSE = f"{BASE}/ai/summary/response"
    AI_DECISION = f"{BASE}/ai/decision"
    AI_RECOMMENDATION = f"{BASE}/ai/recommendation"
    
    # Portal interactions
    PORTAL_TILES_STATE = f"{BASE}/portal/tiles/state"
    PORTAL_CONSENT_REQUEST = f"{BASE}/portal/consent/request"
    PORTAL_CONSENT_RESPONSE = f"{BASE}/portal/consent/response"
    PORTAL_VOICE_COMMAND = f"{BASE}/portal/voice/command"
    
    # System-wide
    SYSTEM_HEARTBEAT = f"{BASE}/system/heartbeat"
    SYSTEM_ALERT = f"{BASE}/system/alert"
    SYSTEM_LOG = f"{BASE}/system/log"


# Convenience subscriptions
ALL_MACHINES_HEALTH = f"{BASE}/machines/+/health"
ALL_MACHINES_DRIVES = f"{BASE}/machines/+/drives"
ALL_FLOWS = f"{BASE}/flows/#"
ALL_AI = f"{BASE}/ai/#"
ALL_PORTAL = f"{BASE}/portal/#"
ALL_SYSTEM = f"{BASE}/system/#"
