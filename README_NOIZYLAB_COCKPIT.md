# 🌌 NOIZYLAB COCKPIT - System Architecture

**Fish Music Inc - CB_01**  
**Build Date:** December 1, 2025  
**🔥 GORUNFREE! 🎸🔥**

---

## 🎯 Vision

NOIZYLAB Cockpit is a **consent-driven creative intelligence platform** that orchestrates:
- **GOD** (Mac Studio M2 Ultra) - The creative powerhouse
- **GABRIEL** (Mac Studio M1 Max) - The sentinel guardian
- **LUCY** (MacBook Pro M2) - The mobile mind
- **Fish Drives** - The memory ocean (4TB Blue Fish, 4TB Big Fish, 12TB, etc.)

---

## 🏗️ Architecture Layers

### 1. **Agent Layer** (Background Service/Daemon)
- **Location:** `agent/`
- **Purpose:** Continuous system monitoring, telemetry collection, background orchestration
- **Platforms:** macOS (launchd), Windows (Service), Linux (systemd)
- **Language:** Python 3.11+ with asyncio
- **Communication:** MQTT publish/subscribe

### 2. **Portal Layer** (Web Cockpit)
- **Location:** `portal/`
- **Purpose:** Visual cockpit interface, consent rituals, tile flows
- **Stack:** React + TypeScript + Tailwind CSS
- **Features:** Voice, gaze, dwell accessibility triggers
- **Communication:** MQTT subscribe, WebSocket real-time

### 3. **Orchestration Layer** (Node-RED + AI)
- **Location:** `orchestration/`
- **Purpose:** Flow automation, AI decision loops, ritual execution
- **Stack:** Node-RED flows + Python AI modules
- **Features:** Health Scan, Backup Now, Content Migration, AI Summaries

### 4. **Shared Layer** (Common utilities)
- **Location:** `shared/`
- **Purpose:** MQTT schema, telemetry models, config management
- **Language:** Python + TypeScript definitions

---

## 📡 MQTT Telemetry Schema

**Broker:** Eclipse Mosquitto (localhost:1883)

### Topic Hierarchy

```
noizylab/
├── machines/
│   ├── god/
│   │   ├── health           # CPU, RAM, disk, network
│   │   ├── processes        # Top processes
│   │   ├── drives           # Fish drive status
│   │   └── events           # System events
│   ├── gabriel/
│   │   └── (same structure)
│   └── lucy/
│       └── (same structure)
├── flows/
│   ├── health_scan/
│   │   ├── trigger          # Start health scan
│   │   ├── progress         # Scan progress updates
│   │   └── result           # Scan results
│   ├── backup_now/
│   │   ├── trigger          # Start backup
│   │   ├── consent          # User consent required
│   │   ├── progress         # Backup progress
│   │   └── result           # Backup results
│   └── content_migration/
│       └── (similar structure)
├── ai/
│   ├── summary/request      # Request AI summary
│   ├── summary/response     # AI summary result
│   └── decision/            # AI decision loops
└── portal/
    ├── tiles/state          # Tile state updates
    ├── consent/request      # Consent ritual requests
    └── consent/response     # User consent responses
```

### Message Format (JSON)

```json
{
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
```

---

## 🎛️ Core Flows

### 1. Health Scan Flow
**Trigger:** Manual (portal tile) or Scheduled (daily)  
**Steps:**
1. Portal publishes to `noizylab/flows/health_scan/trigger`
2. Agent receives trigger, starts scan
3. Agent publishes progress to `noizylab/flows/health_scan/progress`
4. Agent collects: CPU, RAM, disk, drives, processes, network
5. Agent publishes result to `noizylab/flows/health_scan/result`
6. Portal displays branded report with AI summary

### 2. Backup Now Flow
**Trigger:** Manual (portal tile)  
**Steps:**
1. Portal publishes to `noizylab/flows/backup_now/trigger`
2. Agent calculates backup scope, estimates time/space
3. Agent publishes consent request to `noizylab/flows/backup_now/consent`
4. Portal shows **Consent Envelope** with details
5. User grants consent via portal
6. Portal publishes consent to `noizylab/portal/consent/response`
7. Agent executes backup, streams progress
8. Agent publishes completion to `noizylab/flows/backup_now/result`

### 3. Content Migration Flow
**Trigger:** Manual (portal tile) or AI Recommendation  
**Purpose:** Move content from 99% full drives (4TB Blue Fish) to free drives (4TB_02, RED DRAGON)  
**Steps:**
1. AI analyzes drive usage, suggests migrations
2. Portal displays migration plan with consent envelope
3. User reviews, grants consent
4. Agent executes migration with progress streaming
5. Agent verifies integrity, updates catalogs

---

## 🔐 Consent System

### Consent Envelope Structure
```json
{
  "ritual_id": "backup_now_20251201_103000",
  "ritual_type": "backup_now",
  "requested_by": "portal",
  "timestamp": "2025-12-01T10:30:00Z",
  "scope": {
    "source_paths": ["/Users/m2ultra/NOIZYLAB"],
    "destination": "/Volumes/4TB_02/Backups/NOIZYLAB_20251201",
    "estimated_size_gb": 15.2,
    "estimated_time_minutes": 8
  },
  "consent_required": true,
  "consent_granted": null,
  "consent_timestamp": null
}
```

### Consent Levels
- **Automatic:** Health scans, telemetry collection (always allowed)
- **Manual:** Backups, migrations, destructive operations (requires consent)
- **AI-Suggested:** AI recommendations (show rationale, require consent)

---

## 🎨 Portal Cockpit Tiles

### Tile Grid Layout
```
┌─────────────┬─────────────┬─────────────┐
│ GOD Status  │ GABRIEL     │ LUCY        │
│ CPU/RAM/    │ Status      │ Status      │
│ Disk/Net    │             │             │
├─────────────┼─────────────┼─────────────┤
│ Fish Drives │ Health Scan │ Backup Now  │
│ Usage       │ [START]     │ [START]     │
│ Overview    │             │             │
├─────────────┼─────────────┼─────────────┤
│ Content     │ AI Summary  │ System      │
│ Migration   │ [REQUEST]   │ Logs        │
│ Suggestions │             │             │
└─────────────┴─────────────┴─────────────┘
```

### Tile Features
- **Real-time updates** via MQTT
- **Animated transitions** (fade, slide, pulse)
- **Voice commands**: "Start health scan", "Backup now", "Show AI summary"
- **Gaze/dwell triggers** for accessibility
- **Consent rituals** with beautiful envelopes

---

## 🚀 Phase 1 Deliverables

### Agent Layer ✅
- [x] System health monitor (existing: `services/system_health.py`)
- [ ] MQTT telemetry publisher
- [ ] Background service/daemon wrapper
- [ ] Health scan flow executor
- [ ] Backup flow executor
- [ ] Fish drive monitor integration

### Portal Layer 🏗️
- [ ] React + TypeScript scaffold
- [ ] MQTT WebSocket bridge
- [ ] Tile grid layout
- [ ] Real-time telemetry display
- [ ] Consent envelope UI
- [ ] Voice command integration

### Orchestration Layer 🏗️
- [ ] Node-RED flows for Health Scan
- [ ] Node-RED flows for Backup Now
- [ ] AI summary integration (OpenAI)
- [ ] Decision loop framework

### Shared Layer 🏗️
- [ ] MQTT schema definitions
- [ ] Telemetry data models
- [ ] Configuration management
- [ ] TypeScript type definitions

---

## 📦 Technology Stack

### Agent
- **Language:** Python 3.11+
- **Libraries:** `paho-mqtt`, `psutil`, `asyncio`, `pydantic`
- **Service:** `launchd` (macOS), `systemd` (Linux), Windows Service

### Portal
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand (lightweight state management)
- **MQTT:** `mqtt.js` (WebSocket)
- **Voice:** Web Speech API
- **Animation:** Framer Motion

### Orchestration
- **Node-RED:** Visual flow editor
- **Python Nodes:** Custom AI integration
- **Storage:** SQLite for logs, JSON for config

### Infrastructure
- **MQTT Broker:** Eclipse Mosquitto
- **Database:** SQLite (logs), JSON (config)
- **Logging:** Structured JSON logs
- **Backups:** rsync + fish-data-sync

---

## 🔥 Next Steps

1. **Install MQTT Broker**
   ```bash
   brew install mosquitto
   brew services start mosquitto
   ```

2. **Scaffold Agent Service**
   ```bash
   python3 agent/noizylab_agent.py --daemon
   ```

3. **Launch Portal**
   ```bash
   cd portal && npm install && npm run dev
   ```

4. **Test Health Scan Flow**
   - Trigger from portal
   - Watch MQTT messages
   - Verify telemetry collection

5. **Implement Consent Ritual**
   - Trigger Backup Now
   - Review consent envelope
   - Grant consent
   - Execute backup

---

**GORUNFREE!** 🚀🔥🎸
