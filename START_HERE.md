# 🔥 NOIZYLAB COCKPIT - START HERE 🔥

**Fish Music Inc - CB_01**  
**The consent-driven creative intelligence platform**  
**🔥 GORUNFREE! 🎸🔥**

---

## ⚡ Quick Start (5 minutes)

### 1. Install MQTT Broker
```bash
brew install mosquitto
brew services start mosquitto
```

### 2. Install Agent Dependencies
```bash
cd agent
pip3 install -r requirements.txt
```

### 3. Start Agent
```bash
python3 noizylab_agent.py --machine god
```

### 4. Watch Telemetry (New Terminal)
```bash
mosquitto_sub -t "noizylab/#" -v
```

### 5. Trigger Health Scan (New Terminal)
```bash
mosquitto_pub -t "noizylab/flows/health_scan/trigger" -m '{}'
```

**🎉 You're live!**

---

## 📚 Documentation Guide

### New to NOIZYLAB?
👉 **[QUICKSTART.md](QUICKSTART.md)** - 5-minute guide

### Ready to install?
👉 **[SETUP_PHASE1.md](SETUP_PHASE1.md)** - Complete setup guide

### Want to understand the architecture?
👉 **[ARCHITECTURE.md](ARCHITECTURE.md)** - Visual diagrams
👉 **[README_NOIZYLAB_COCKPIT.md](README_NOIZYLAB_COCKPIT.md)** - Full architecture

### What did we build?
👉 **[PHASE1_COMPLETE.md](PHASE1_COMPLETE.md)** - Mission summary
👉 **[PHASE1_FILES.md](PHASE1_FILES.md)** - File inventory

### Working with the agent?
👉 **[agent/README.md](agent/README.md)** - Agent documentation

---

## 🎯 What Is This?

**NOIZYLAB Cockpit** is a real-time system orchestration platform for:

- **GOD** (Mac Studio M2 Ultra) - Creative powerhouse
- **GABRIEL** (Mac Studio M1 Max) - Sentinel guardian  
- **LUCY** (MacBook Pro M2) - Mobile mind
- **Fish Drives** - Memory ocean (4TB Blue Fish, 4TB Big Fish, 12TB, etc.)

**Phase 1** delivers:
✅ Real-time telemetry (CPU, RAM, disk, drives, processes)  
✅ Health scan flow (comprehensive diagnostics)  
✅ Backup flow with consent system  
✅ MQTT architecture (publish/subscribe)  
✅ Background service (macOS daemon)  

---

## 🌟 Key Features

### 🤖 Agent Service
- Runs continuously in background
- Publishes telemetry every 5 seconds
- Monitors all Fish drives
- Executes flows on demand

### 📡 MQTT Telemetry
- Real-time system health
- Top processes by CPU/RAM
- Fish drive status (mounted, usage, capacity)
- System events (startup, shutdown, alerts)

### 🩺 Health Scan Flow
- Comprehensive system diagnostics
- Progress updates (0-100%)
- AI-generated summaries
- Complete in <5 seconds

### 💾 Backup Now Flow
- Consent-driven ritual system
- Size/time estimation
- User approval required
- rsync execution
- Verification

---

## 🎛️ Portal Cockpit (Phase 2)

**Coming soon:**
- React + TypeScript web interface
- Real-time tile grid
- Consent envelope UI
- Voice commands ("Start health scan")
- Gaze tracking, dwell activation
- Branded AI reports

---

## 🔐 The Consent System

**User agency is paramount.**

Operations requiring consent:
- ❌ **Automatic:** Health scans, telemetry (no consent needed)
- ✅ **Manual:** Backups, migrations (consent required)
- 🤖 **AI-Suggested:** Recommendations (consent + rationale)

**Consent Envelope:**
```
╔═══════════════════════════════════════════╗
║    💾 BACKUP NOW                          ║
║                                           ║
║    Source:  /Users/m2ultra/NOIZYLAB       ║
║    Dest:    /Volumes/4TB_02/Backups/...   ║
║                                           ║
║    Size:    15.2 GB                       ║
║    Time:    ~8 minutes                    ║
║                                           ║
║    Do you consent to this backup?         ║
║                                           ║
║    [ GRANT CONSENT ]    [ DENY ]          ║
╚═══════════════════════════════════════════╝
```

---

## 🚀 Installation Paths

### Path 1: Quick Test (Recommended First)
```bash
# 1. Install MQTT
brew install mosquitto && brew services start mosquitto

# 2. Install deps
cd agent && pip3 install -r requirements.txt

# 3. Run agent
python3 noizylab_agent.py --machine god

# 4. Test (new terminal)
mosquitto_pub -t "noizylab/flows/health_scan/trigger" -m '{}'
```

### Path 2: Daemon Installation
```bash
# Run as background service
cd agent/daemon
./install_daemon.sh
```

### Path 3: Full Setup
**Follow:** [SETUP_PHASE1.md](SETUP_PHASE1.md)

---

## 📊 What You Get

### Real-Time Telemetry (every 5s)
```json
{
  "cpu_percent": 45.2,
  "ram_percent": 68.1,
  "disk_percent": 72.5,
  "network_latency_ms": 12.3,
  "uptime": "5d 12h 34m"
}
```

### Fish Drives (every 30s)
```json
{
  "drives": [
    {"name": "4TB Blue Fish", "percent": 99, "free_tb": 0.04},
    {"name": "4TB_02", "percent": 5, "free_tb": 3.8}
  ]
}
```

### Health Scan Result
```json
{
  "success": true,
  "duration_seconds": 2.5,
  "summary": "Health scan completed successfully",
  "ai_summary": "System operating within normal parameters"
}
```

---

## 🎸 The NOIZYLAB Way

**Built on principles:**
- 🎯 **User agency** - Consent-driven rituals
- 🌊 **Flow over force** - Natural orchestration  
- 🔮 **AI as partner** - Suggestions, not commands
- ♿ **Accessibility first** - Voice, gaze, dwell
- 🎨 **Beauty in data** - Branded reports, elegant UI
- 🔧 **Production-ready** - No prototypes, only products

---

## 🔧 Troubleshooting

### MQTT won't start
```bash
brew services restart mosquitto
lsof -i :1883  # Should show mosquitto
```

### Agent crashes
```bash
tail -20 /tmp/noizylab_agent_god.log
```

### No telemetry
```bash
# Test broker
mosquitto_pub -t "test" -m "hello"
mosquitto_sub -t "test"
```

**More help:** [SETUP_PHASE1.md](SETUP_PHASE1.md#troubleshooting)

---

## 🌌 Architecture (30-second version)

```
Agent (Python) → MQTT Broker (Mosquitto) → Portal (React)
       ↓                                           ↓
  Telemetry                               Real-time tiles
  Health scans                            Consent UI
  Backups                                 Voice commands
```

**Full diagrams:** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 📈 Next Steps

1. ✅ **Start agent** - `python3 agent/noizylab_agent.py --machine god`
2. ✅ **Monitor MQTT** - `mosquitto_sub -t "noizylab/#" -v`
3. ✅ **Trigger flows** - Health scan, backup
4. ✅ **Install daemon** - Auto-start on boot
5. 🏗️ **Phase 2** - Build Portal cockpit (coming soon!)

---

## 💬 Questions?

**Read the docs:**
- [QUICKSTART.md](QUICKSTART.md)
- [SETUP_PHASE1.md](SETUP_PHASE1.md)
- [agent/README.md](agent/README.md)

**Check the architecture:**
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [README_NOIZYLAB_COCKPIT.md](README_NOIZYLAB_COCKPIT.md)

**See what we built:**
- [PHASE1_COMPLETE.md](PHASE1_COMPLETE.md)
- [PHASE1_FILES.md](PHASE1_FILES.md)

---

**You're ready! Let's GORUNFREE!** 🚀🔥🎸

**Fish Music Inc - CB_01**  
**December 1, 2025**
