#!/usr/bin/env python3
"""
🌌 NOIZYLAB - Backup Now Flow
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

import sys
import logging
import time
import uuid
import shutil
import subprocess
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from shared.schema.mqtt_topics import Topics
from shared.models.telemetry import ConsentEnvelope, FlowProgress, FlowResult
from agent.core.mqtt_client import NoizyMQTTClient

logger = logging.getLogger(__name__)


class BackupNowFlow:
    """Backup Now Flow Executor with Consent"""
    
    def __init__(self, mqtt_client: NoizyMQTTClient, machine_name: str = "god"):
        self.mqtt = mqtt_client
        self.machine = machine_name
        
        # Pending consent envelopes
        self.pending_consents = {}
        
        # Subscribe to triggers and consent responses
        self.mqtt.subscribe(Topics.BACKUP_NOW_TRIGGER, self.on_trigger)
        self.mqtt.subscribe(Topics.PORTAL_CONSENT_RESPONSE, self.on_consent_response)
        
        logger.info("💾 Backup Now Flow ready")
    
    def on_trigger(self, topic: str, payload: dict):
        """Handle backup trigger"""
        logger.info("🔥 Backup Now triggered!")
        
        # Generate ritual ID
        ritual_id = f"backup_now_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        try:
            # Calculate backup scope
            source = payload.get("source", "/Users/m2ultra/NOIZYLAB")
            destination = payload.get("destination", f"/Volumes/4TB_02/Backups/NOIZYLAB_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
            
            # Estimate size and time
            estimated_size_gb, estimated_time_min = self.estimate_backup(source)
            
            # Create consent envelope
            envelope = ConsentEnvelope(
                ritual_id=ritual_id,
                ritual_type="backup_now",
                requested_by=f"agent_{self.machine}",
                scope={
                    "source": source,
                    "destination": destination,
                    "estimated_size_gb": estimated_size_gb,
                    "estimated_time_minutes": estimated_time_min,
                    "backup_method": "rsync",
                },
            )
            
            # Store pending consent
            self.pending_consents[ritual_id] = envelope
            
            # Publish consent request
            self.mqtt.publish(Topics.BACKUP_NOW_CONSENT, envelope.to_mqtt())
            logger.info(f"📨 Consent request sent: {ritual_id}")
        except Exception as e:
            logger.error(f"❌ Backup trigger failed: {e}")
    
    def on_consent_response(self, topic: str, payload: dict):
        """Handle consent response from portal"""
        ritual_id = payload.get("ritual_id")
        consent_granted = payload.get("consent_granted")
        
        if ritual_id not in self.pending_consents:
            logger.warning(f"⚠️ Unknown ritual ID: {ritual_id}")
            return
        
        envelope = self.pending_consents[ritual_id]
        
        if consent_granted:
            logger.info(f"✅ Consent granted for {ritual_id}")
            
            # Update envelope
            envelope.consent_granted = True
            envelope.consent_timestamp = datetime.now()
            envelope.consent_user = payload.get("user", "unknown")
            
            # Execute backup
            self.execute_backup(ritual_id, envelope.scope)
        else:
            logger.info(f"❌ Consent denied for {ritual_id}")
            self.publish_cancelled(ritual_id)
        
        # Remove from pending
        del self.pending_consents[ritual_id]
    
    def estimate_backup(self, source: str) -> tuple:
        """Estimate backup size and time"""
        try:
            # Get directory size using du
            result = subprocess.run(
                ["du", "-sh", source],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                # Parse output (e.g., "15G	/path")
                size_str = result.stdout.split()[0]
                # Convert to GB (rough estimate)
                if 'G' in size_str:
                    size_gb = float(size_str.replace('G', ''))
                elif 'M' in size_str:
                    size_gb = float(size_str.replace('M', '')) / 1024
                else:
                    size_gb = 1.0
                
                # Estimate time (assume 100MB/s transfer rate)
                time_min = (size_gb * 1024) / (100 * 60)
                
                return round(size_gb, 2), round(time_min, 1)
        except Exception as e:
            logger.warning(f"⚠️ Could not estimate backup size: {e}")
        
        # Default estimates
        return 10.0, 5.0
    
    def execute_backup(self, flow_id: str, scope: dict):
        """Execute backup with rsync"""
        start_time = time.time()
        source = scope['source']
        destination = scope['destination']
        
        try:
            # Step 1: Start
            self.publish_progress(flow_id, 0, "started", "Initiating backup...")
            
            # Step 2: Create destination
            self.publish_progress(flow_id, 10, "in_progress", "Creating backup directory...")
            Path(destination).mkdir(parents=True, exist_ok=True)
            
            # Step 3: Execute rsync
            self.publish_progress(flow_id, 20, "in_progress", "Copying files...")
            
            # Use rsync for efficient backup
            rsync_cmd = [
                "rsync",
                "-av",
                "--progress",
                source + "/",
                destination + "/",
            ]
            
            logger.info(f"🔄 Running: {' '.join(rsync_cmd)}")
            
            # Run rsync (this will take time for large backups)
            result = subprocess.run(
                rsync_cmd,
                capture_output=True,
                text=True,
                timeout=3600,  # 1 hour timeout
            )
            
            if result.returncode == 0:
                self.publish_progress(flow_id, 90, "in_progress", "Verifying backup...")
                time.sleep(1)
                
                # Calculate duration
                duration = time.time() - start_time
                
                # Complete
                self.publish_progress(flow_id, 100, "completed", "Backup complete!")
                self.publish_result(flow_id, duration, scope, True)
            else:
                raise Exception(f"rsync failed: {result.stderr}")
        except Exception as e:
            logger.error(f"❌ Backup failed: {e}")
            self.publish_failure(flow_id, str(e))
    
    def publish_progress(self, flow_id: str, percent: float, status: str, message: str):
        """Publish flow progress"""
        progress = FlowProgress(
            flow_id=flow_id,
            flow_type="backup_now",
            progress_percent=percent,
            status=status,
            message=message,
        )
        self.mqtt.publish(Topics.BACKUP_NOW_PROGRESS, progress.to_mqtt())
        logger.info(f"📊 [{percent}%] {message}")
    
    def publish_result(self, flow_id: str, duration: float, scope: dict, success: bool):
        """Publish backup result"""
        result = FlowResult(
            flow_id=flow_id,
            flow_type="backup_now",
            success=success,
            duration_seconds=duration,
            summary=f"Backup completed in {duration:.1f}s" if success else "Backup failed",
            details={
                "source": scope['source'],
                "destination": scope['destination'],
                "estimated_size_gb": scope.get('estimated_size_gb', 0),
                "machine": self.machine,
                "timestamp": datetime.now().isoformat(),
            },
            ai_summary=f"Successfully backed up {scope['source']} to {scope['destination']}",
        )
        self.mqtt.publish(Topics.BACKUP_NOW_RESULT, result.to_mqtt())
        logger.info(f"✅ Backup complete: {duration:.1f}s")
    
    def publish_failure(self, flow_id: str, error: str):
        """Publish failure result"""
        result = FlowResult(
            flow_id=flow_id,
            flow_type="backup_now",
            success=False,
            duration_seconds=0,
            summary=f"Backup failed: {error}",
            details={"error": error},
        )
        self.mqtt.publish(Topics.BACKUP_NOW_RESULT, result.to_mqtt())
        logger.error(f"❌ Backup failed: {error}")
    
    def publish_cancelled(self, flow_id: str):
        """Publish cancelled result"""
        result = FlowResult(
            flow_id=flow_id,
            flow_type="backup_now",
            success=False,
            duration_seconds=0,
            summary="Backup cancelled: consent denied",
            details={"reason": "User denied consent"},
        )
        self.mqtt.publish(Topics.BACKUP_NOW_RESULT, result.to_mqtt())
        logger.info(f"🚫 Backup cancelled: {flow_id}")
