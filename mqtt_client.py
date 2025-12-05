#!/usr/bin/env python3
"""
🌌 NOIZYLAB - MQTT Client
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

import json
import logging
from typing import Callable, Optional
import paho.mqtt.client as mqtt
from datetime import datetime

logger = logging.getLogger(__name__)


class NoizyMQTTClient:
    """MQTT Client for NOIZYLAB Agent"""
    
    def __init__(
        self,
        client_id: str,
        host: str = "localhost",
        port: int = 1883,
        keepalive: int = 60,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.client_id = client_id
        self.host = host
        self.port = port
        self.keepalive = keepalive
        
        # Create MQTT client
        self.client = mqtt.Client(client_id=client_id, clean_session=True)
        
        # Set credentials if provided
        if username and password:
            self.client.username_pw_set(username, password)
        
        # Set callbacks
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message
        
        # Message handlers
        self.message_handlers = {}
        
        # Connection state
        self.connected = False
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected to broker"""
        if rc == 0:
            self.connected = True
            logger.info(f"✅ Connected to MQTT broker: {self.host}:{self.port}")
        else:
            self.connected = False
            logger.error(f"❌ Failed to connect to MQTT broker: {rc}")
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from broker"""
        self.connected = False
        if rc != 0:
            logger.warning(f"⚠️ Unexpected MQTT disconnect: {rc}")
        else:
            logger.info("📡 Disconnected from MQTT broker")
    
    def _on_message(self, client, userdata, msg):
        """Callback when message received"""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            
            logger.debug(f"📨 Received: {topic}")
            
            # Call registered handlers
            if topic in self.message_handlers:
                for handler in self.message_handlers[topic]:
                    try:
                        handler(topic, payload)
                    except Exception as e:
                        logger.error(f"❌ Handler error for {topic}: {e}")
        except Exception as e:
            logger.error(f"❌ Error processing message: {e}")
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            logger.info(f"🔌 Connecting to MQTT broker: {self.host}:{self.port}")
            self.client.connect(self.host, self.port, self.keepalive)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"❌ Failed to connect: {e}")
            raise
    
    def disconnect(self):
        """Disconnect from MQTT broker"""
        self.client.loop_stop()
        self.client.disconnect()
    
    def publish(self, topic: str, payload: dict, qos: int = 1, retain: bool = False):
        """Publish message to topic"""
        try:
            # Add timestamp if not present
            if "timestamp" not in payload:
                payload["timestamp"] = datetime.now().isoformat()
            
            # Convert to JSON
            message = json.dumps(payload)
            
            # Publish
            result = self.client.publish(topic, message, qos=qos, retain=retain)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.debug(f"📤 Published to {topic}")
            else:
                logger.error(f"❌ Failed to publish to {topic}: {result.rc}")
        except Exception as e:
            logger.error(f"❌ Error publishing to {topic}: {e}")
    
    def subscribe(self, topic: str, handler: Callable, qos: int = 1):
        """Subscribe to topic with handler"""
        try:
            # Subscribe to topic
            self.client.subscribe(topic, qos=qos)
            logger.info(f"📡 Subscribed to {topic}")
            
            # Register handler
            if topic not in self.message_handlers:
                self.message_handlers[topic] = []
            self.message_handlers[topic].append(handler)
        except Exception as e:
            logger.error(f"❌ Failed to subscribe to {topic}: {e}")
    
    def unsubscribe(self, topic: str):
        """Unsubscribe from topic"""
        try:
            self.client.unsubscribe(topic)
            logger.info(f"🔕 Unsubscribed from {topic}")
            
            # Remove handlers
            if topic in self.message_handlers:
                del self.message_handlers[topic]
        except Exception as e:
            logger.error(f"❌ Failed to unsubscribe from {topic}: {e}")
