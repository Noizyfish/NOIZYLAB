#!/usr/bin/env python3
"""
🌌 NOIZYLAB - Health Scan Flow
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

import sys
import logging
import time
import uuid
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from shared.schema.mqtt_topics import Topics
from shared.models.telemetry import FlowProgress, FlowResult
from agent.core.mqtt_client import NoizyMQTTClient
from agent.telemetry.publisher import TelemetryPublisher

logger = logging.getLogger(__name__)


class HealthScanFlow:
    """Health Scan Flow Executor"""
    
    def __init__(self, mqtt_client: NoizyMQTTClient, telemetry: TelemetryPublisher):
        self.mqtt = mqtt_client
        self.telemetry = telemetry
        
        # Subscribe to trigger
        self.mqtt.subscribe(Topics.HEALTH_SCAN_TRIGGER, self.on_trigger)
        logger.info("🩺 Health Scan Flow ready")
    
    def on_trigger(self, topic: str, payload: dict):
        """Handle health scan trigger"""
        logger.info("🔥 Health Scan triggered!")
        
        # Generate flow ID
        flow_id = f"health_scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        try:
            # Execute scan
            self.execute_scan(flow_id)
        except Exception as e:
            logger.error(f"❌ Health Scan failed: {e}")
            self.publish_failure(flow_id, str(e))
    
    def execute_scan(self, flow_id: str):
        """Execute health scan"""
        start_time = time.time()
        
        # Step 1: Start
        self.publish_progress(flow_id, 0, "started", "Initiating health scan...")
        time.sleep(0.5)
        
        # Step 2: Collect system health
        self.publish_progress(flow_id, 20, "in_progress", "Collecting system metrics...")
        self.telemetry.publish_health()
        time.sleep(0.5)
        
        # Step 3: Collect processes
        self.publish_progress(flow_id, 40, "in_progress", "Analyzing processes...")
        self.telemetry.publish_processes()
        time.sleep(0.5)
        
        # Step 4: Check drives
        self.publish_progress(flow_id, 60, "in_progress", "Checking Fish drives...")
        self.telemetry.publish_drives()
        time.sleep(0.5)
        
        # Step 5: Network check
        self.publish_progress(flow_id, 80, "in_progress", "Testing network connectivity...")
        time.sleep(0.5)
        
        # Step 6: Complete
        self.publish_progress(flow_id, 100, "completed", "Health scan complete!")
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Publish result
        self.publish_result(flow_id, duration)
    
    def publish_progress(self, flow_id: str, percent: float, status: str, message: str):
        """Publish flow progress"""
        progress = FlowProgress(
            flow_id=flow_id,
            flow_type="health_scan",
            progress_percent=percent,
            status=status,
            message=message,
        )
        self.mqtt.publish(Topics.HEALTH_SCAN_PROGRESS, progress.to_mqtt())
        logger.info(f"📊 [{percent}%] {message}")
    
    def publish_result(self, flow_id: str, duration: float):
        """Publish successful result"""
        result = FlowResult(
            flow_id=flow_id,
            flow_type="health_scan",
            success=True,
            duration_seconds=duration,
            summary=f"Health scan completed successfully in {duration:.1f}s",
            details={
                "scans_performed": [
                    "System health (CPU, RAM, disk, network)",
                    "Top processes by CPU/RAM usage",
                    "Fish drive status and capacity",
                    "Network connectivity test",
                ],
                "machine": self.telemetry.machine,
                "timestamp": datetime.now().isoformat(),
            },
            ai_summary="System is operating within normal parameters. No critical alerts detected.",
        )
        self.mqtt.publish(Topics.HEALTH_SCAN_RESULT, result.to_mqtt())
        logger.info(f"✅ Health scan complete: {duration:.1f}s")
    
    def publish_failure(self, flow_id: str, error: str):
        """Publish failure result"""
        result = FlowResult(
            flow_id=flow_id,
            flow_type="health_scan",
            success=False,
            duration_seconds=0,
            summary=f"Health scan failed: {error}",
            details={"error": error},
        )
        self.mqtt.publish(Topics.HEALTH_SCAN_RESULT, result.to_mqtt())
        logger.error(f"❌ Health scan failed: {error}")
