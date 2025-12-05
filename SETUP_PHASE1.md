# 🌌 NOIZYLAB Phase 1 Setup Guide

**Fish Music Inc - CB_01**  
**Date:** December 1, 2025  
**🔥 GORUNFREE! 🎸🔥**

---

## 🎯 What We Built

**Phase 1** delivers the foundational architecture for NOIZYLAB Cockpit:

### ✅ Agent Layer (Complete)
- **MQTT telemetry publisher** - Real-time system monitoring
- **Health Scan flow** - Comprehensive system diagnostics
- **Backup Now flow** - Consent-driven backup orchestration
- **Background service** - macOS daemon via launchd
- **Fish drive monitoring** - Track all connected volumes

### ✅ MQTT Schema (Complete)
- **Topic hierarchy** - Organized by machines/flows/ai/portal
- **Data models** - Pydantic models for type safety
- **Configuration** - Environment-based config management

### 🏗️ Portal Layer (Next Phase)
- React + TypeScript cockpit interface
- Real-time tile grid with MQTT WebSocket
- Consent envelope UI
- Voice/gaze/dwell accessibility

---

## 📦 Installation

### Step 1: Install MQTT Broker

```bash
# Install Mosquitto
brew install mosquitto

# Start Mosquitto service
brew services start mosquitto

# Verify it's running
brew services list | grep mosquitto
```

**Expected Output:**
```
mosquitto started m2ultra ~/Library/LaunchAgents/homebrew.mxcl.mosquitto.plist
```

### Step 2: Install Python Dependencies

```bash
# Navigate to agent directory
cd /Users/m2ultra/NOIZYLAB/agent

# Install requirements
pip3 install -r requirements.txt
```

**Dependencies:**
- `paho-mqtt` - MQTT client library
- `psutil` - System monitoring (already used by system_health.py)
- `pydantic` - Data validation and models

### Step 3: Test Agent (Manual Mode)

```bash
# Run agent in foreground
python3 /Users/m2ultra/NOIZYLAB/agent/noizylab_agent.py --machine god
```

**Expected Output:**
```
============================================================
🔊 NOIZYLAB AGENT STARTING
   Machine: god
   MQTT: localhost:1883
   Telemetry Interval: 5s
============================================================
✅ Connected to MQTT broker: localhost:1883
📡 Subscribed to noizylab/flows/health_scan/trigger
🩺 Health Scan Flow ready
📡 Subscribed to noizylab/flows/backup_now/trigger
📡 Subscribed to noizylab/portal/consent/response
💾 Backup Now Flow ready
📢 Event: NOIZYLAB Agent started on god
🔥 Agent running! (Ctrl+C to stop)
```

Keep this running and open a new terminal for Step 4.

### Step 4: Test MQTT Messages

In a **new terminal**, subscribe to all NOIZYLAB topics:

```bash
# Subscribe to all topics
mosquitto_sub -t "noizylab/#" -v
```

**Expected Output (every 5 seconds):**
```json
noizylab/machines/god/health {
  "timestamp": "2025-12-01T10:30:00Z",
  "machine": "god",
  "type": "health",
  "data": {
    "cpu_percent": 45.2,
    "ram_percent": 68.1,
    "disk_percent": 72.5,
    "network_latency_ms": 12.3
  }
}

noizylab/machines/god/processes {
  "timestamp": "2025-12-01T10:30:00Z",
  "machine": "god",
  "type": "processes",
  "data": {
    "processes": [...]
  }
}

noizylab/machines/god/drives {
  "timestamp": "2025-12-01T10:30:00Z",
  "machine": "god",
  "type": "drives",
  "data": {
    "drives": [...]
  }
}
```

### Step 5: Trigger Health Scan

In a **new terminal**, publish a health scan trigger:

```bash
# Trigger health scan
mosquitto_pub -t "noizylab/flows/health_scan/trigger" -m '{"source":"manual_test"}'
```

**Expected Output in mosquitto_sub terminal:**
```json
noizylab/flows/health_scan/progress {
  "flow_id": "health_scan_20251201_103000_a1b2c3d4",
  "flow_type": "health_scan",
  "progress_percent": 0,
  "status": "started",
  "message": "Initiating health scan..."
}

noizylab/flows/health_scan/progress {
  "progress_percent": 20,
  "status": "in_progress",
  "message": "Collecting system metrics..."
}

... (more progress updates) ...

noizylab/flows/health_scan/result {
  "flow_id": "health_scan_20251201_103000_a1b2c3d4",
  "success": true,
  "summary": "Health scan completed successfully in 2.5s",
  "ai_summary": "System is operating within normal parameters."
}
```

### Step 6: Trigger Backup (With Consent)

```bash
# Trigger backup
mosquitto_pub -t "noizylab/flows/backup_now/trigger" -m '{
  "source": "/Users/m2ultra/NOIZYLAB/docs",
  "destination": "/tmp/test_backup"
}'
```

**Expected Output:**
```json
noizylab/flows/backup_now/consent {
  "ritual_id": "backup_now_20251201_103100_x7y8z9",
  "ritual_type": "backup_now",
  "requested_by": "agent_god",
  "scope": {
    "source": "/Users/m2ultra/NOIZYLAB/docs",
    "destination": "/tmp/test_backup",
    "estimated_size_gb": 0.5,
    "estimated_time_minutes": 0.3
  },
  "consent_required": true,
  "consent_granted": null
}
```

**Grant Consent (simulating portal):**
```bash
mosquitto_pub -t "noizylab/portal/consent/response" -m '{
  "ritual_id": "backup_now_20251201_103100_x7y8z9",
  "consent_granted": true,
  "user": "test_user"
}'
```

**Expected Output:**
```json
noizylab/flows/backup_now/progress {
  "flow_id": "backup_now_20251201_103100_x7y8z9",
  "progress_percent": 0,
  "status": "started",
  "message": "Initiating backup..."
}

... (progress updates) ...

noizylab/flows/backup_now/result {
  "success": true,
  "summary": "Backup completed in 1.2s"
}
```

---

## 🤖 Install as Daemon (Optional)

To run the agent automatically on boot:

```bash
# Navigate to daemon directory
cd /Users/m2ultra/NOIZYLAB/agent/daemon

# Install daemon
./install_daemon.sh
```

**Expected Output:**
```
🔊 Installing NOIZYLAB Agent Daemon...
📋 Copying plist to ~/Library/LaunchAgents...
🚀 Loading service...
✅ NOIZYLAB Agent daemon installed and running!

📝 Logs:
   stdout: /tmp/noizylab_agent.out.log
   stderr: /tmp/noizylab_agent.err.log
   app:    /tmp/noizylab_agent_god.log

🔥 Commands:
   launchctl list | grep noizylab         # Check status
   launchctl unload ~/Library/LaunchAgents/com.fishmusic.noizylab.agent.plist  # Stop
   launchctl load ~/Library/LaunchAgents/com.fishmusic.noizylab.agent.plist    # Start

🔥 GORUNFREE! 🎸🔥
```

---

## 📊 Monitoring

### View Agent Logs
```bash
# Real-time application log
tail -f /tmp/noizylab_agent_god.log

# Real-time stdout
tail -f /tmp/noizylab_agent.out.log

# Real-time stderr
tail -f /tmp/noizylab_agent.err.log
```

### View MQTT Messages
```bash
# All messages
mosquitto_sub -t "noizylab/#" -v

# Health only
mosquitto_sub -t "noizylab/machines/+/health" -v

# Drives only
mosquitto_sub -t "noizylab/machines/+/drives" -v

# All flows
mosquitto_sub -t "noizylab/flows/#" -v
```

### Check Daemon Status
```bash
# Check if running
launchctl list | grep noizylab

# Get PID and status
launchctl list com.fishmusic.noizylab.agent
```

---

## 🚀 Next Steps (Phase 2)

### Portal Development
1. **Scaffold React app**
   ```bash
   npx create-react-app portal --template typescript
   ```

2. **Install dependencies**
   ```bash
   cd portal
   npm install mqtt zustand framer-motion
   npm install -D tailwindcss postcss autoprefixer
   ```

3. **Create MQTT WebSocket bridge**
   - Configure Mosquitto WebSocket listener
   - Connect React app to MQTT via WebSocket

4. **Build tile grid UI**
   - Machine status tiles (GOD, GABRIEL, LUCY)
   - Fish drives overview
   - Health Scan button
   - Backup Now button with consent envelope

5. **Add voice commands**
   - Web Speech API integration
   - Command patterns: "Start health scan", "Backup now"

---

## 🐛 Troubleshooting

### Agent Won't Start
```bash
# Check Python path
which python3

# Check dependencies
pip3 list | grep -E "paho-mqtt|psutil|pydantic"

# Check MQTT broker
brew services list | grep mosquitto
```

### MQTT Connection Failed
```bash
# Test broker
mosquitto_sub -t "test" &
mosquitto_pub -t "test" -m "hello"

# Check port
lsof -i :1883
```

### No Telemetry Messages
```bash
# Verify agent is running
ps aux | grep noizylab_agent

# Check logs
tail -20 /tmp/noizylab_agent_god.log

# Test manual publish
mosquitto_pub -t "noizylab/test" -m '{"test": true}'
```

---

## 📁 Project Structure

```
NOIZYLAB/
├── agent/
│   ├── core/
│   │   └── mqtt_client.py          # MQTT client wrapper
│   ├── telemetry/
│   │   └── publisher.py            # Telemetry publisher
│   ├── flows/
│   │   ├── health_scan.py          # Health scan flow
│   │   └── backup_now.py           # Backup flow with consent
│   ├── daemon/
│   │   ├── launch_agent.plist      # macOS daemon config
│   │   ├── install_daemon.sh       # Install script
│   │   └── uninstall_daemon.sh     # Uninstall script
│   ├── noizylab_agent.py           # Main agent service
│   └── requirements.txt            # Python dependencies
├── shared/
│   ├── schema/
│   │   └── mqtt_topics.py          # MQTT topic definitions
│   ├── models/
│   │   └── telemetry.py            # Pydantic data models
│   └── config/
│       └── mqtt_config.py          # Configuration management
└── services/
    └── system_health.py            # Existing system health monitor
```

---

**GORUNFREE!** 🚀🔥🎸
