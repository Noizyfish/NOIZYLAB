#!/usr/bin/env python3
"""
🌌 NOIZYLAB - Agent Service
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥

Background service/daemon for continuous telemetry and flow orchestration.
"""

import sys
import os
import logging
import time
import signal
import argparse
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from shared.config.mqtt_config import mqtt_config, agent_config
from agent.core.mqtt_client import NoizyMQTTClient
from agent.telemetry.publisher import TelemetryPublisher
from agent.flows.health_scan import HealthScanFlow
from agent.flows.backup_now import BackupNowFlow

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"/tmp/noizylab_agent_{agent_config.machine_name}.log"),
    ]
)
logger = logging.getLogger(__name__)


class NoizyLabAgent:
    """NOIZYLAB Agent Service"""
    
    def __init__(self, machine_name: str = None):
        self.machine = machine_name or agent_config.machine_name
        self.running = False
        
        # MQTT Client
        client_id = f"{mqtt_config.client_id_prefix}_agent_{self.machine}"
        self.mqtt = NoizyMQTTClient(
            client_id=client_id,
            host=mqtt_config.host,
            port=mqtt_config.port,
            keepalive=mqtt_config.keepalive,
            username=mqtt_config.username,
            password=mqtt_config.password,
        )
        
        # Telemetry Publisher
        self.telemetry = TelemetryPublisher(self.mqtt, self.machine)
        
        # Flows
        self.health_scan = HealthScanFlow(self.mqtt, self.telemetry)
        self.backup_now = BackupNowFlow(self.mqtt, self.machine)
        
        # Timers
        self.last_health_publish = 0
        self.last_drive_publish = 0
        
        # Signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"📡 Received signal {signum}, shutting down...")
        self.stop()
    
    def start(self):
        """Start the agent"""
        logger.info("=" * 60)
        logger.info("🔊 NOIZYLAB AGENT STARTING")
        logger.info(f"   Machine: {self.machine}")
        logger.info(f"   MQTT: {mqtt_config.host}:{mqtt_config.port}")
        logger.info(f"   Telemetry Interval: {agent_config.telemetry_interval_seconds}s")
        logger.info("=" * 60)
        
        try:
            # Connect to MQTT
            self.mqtt.connect()
            time.sleep(1)  # Wait for connection
            
            if not self.mqtt.connected:
                raise Exception("Failed to connect to MQTT broker")
            
            # Publish startup event
            self.telemetry.publish_event(
                event_type="startup",
                message=f"NOIZYLAB Agent started on {self.machine}",
                severity="info",
                metadata={"version": "1.0.0"},
            )
            
            # Start main loop
            self.running = True
            self.run()
        except Exception as e:
            logger.error(f"❌ Failed to start agent: {e}")
            raise
    
    def run(self):
        """Main agent loop"""
        logger.info("🔥 Agent running! (Ctrl+C to stop)")
        
        while self.running:
            try:
                current_time = time.time()
                
                # Publish health telemetry
                if current_time - self.last_health_publish >= agent_config.telemetry_interval_seconds:
                    self.telemetry.publish_health()
                    if agent_config.process_monitor_enabled:
                        self.telemetry.publish_processes()
                    self.last_health_publish = current_time
                
                # Publish drive telemetry
                if agent_config.drive_monitor_enabled:
                    if current_time - self.last_drive_publish >= agent_config.drive_monitor_interval_seconds:
                        self.telemetry.publish_drives()
                        self.last_drive_publish = current_time
                
                # Sleep briefly
                time.sleep(0.5)
            except Exception as e:
                logger.error(f"❌ Error in main loop: {e}")
                time.sleep(1)
    
    def stop(self):
        """Stop the agent"""
        logger.info("🛑 Stopping agent...")
        self.running = False
        
        # Publish shutdown event
        try:
            self.telemetry.publish_event(
                event_type="shutdown",
                message=f"NOIZYLAB Agent stopping on {self.machine}",
                severity="info",
            )
            time.sleep(0.5)
        except Exception as e:
            logger.error(f"❌ Error publishing shutdown event: {e}")
        
        # Disconnect MQTT
        self.mqtt.disconnect()
        logger.info("✅ Agent stopped")


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description="NOIZYLAB Agent Service")
    parser.add_argument("--machine", type=str, help="Machine name (god, gabriel, lucy)")
    parser.add_argument("--daemon", action="store_true", help="Run as daemon (future)")
    args = parser.parse_args()
    
    # Create and start agent
    agent = NoizyLabAgent(machine_name=args.machine)
    
    try:
        agent.start()
    except KeyboardInterrupt:
        logger.info("⚠️ Interrupted by user")
        agent.stop()
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
