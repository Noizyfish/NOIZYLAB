# ⚙️ NOIZY.AI - BACKEND ARCHITECTURE

**The Engine Room**  
**Fish Music Inc - CB_01**  
**🔥 GORUNFREE! 🎸🔥**

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    NOIZY.AI BACKEND                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  Core API   │  │ Brain Engine │  │  Real-Time WS   │   │
│  │             │  │              │  │                 │   │
│  │  Node.js    │  │  Python      │  │  WebSocket      │   │
│  │  Express    │  │  FastAPI     │  │  Socket.io      │   │
│  │  TypeScript │  │  ML/AI       │  │                 │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                │                    │            │
│         └────────────────┼────────────────────┘            │
│                          │                                 │
│                  ┌───────▼────────┐                        │
│                  │  Event Bus     │                        │
│                  │  (Redis)       │                        │
│                  └───────┬────────┘                        │
│                          │                                 │
│         ┌────────────────┼────────────────┐               │
│         │                │                │               │
│   ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐         │
│   │ PostgreSQL│   │   Redis   │   │   S3/     │         │
│   │ (main DB) │   │  (cache)  │   │   Local   │         │
│   └───────────┘   └───────────┘   └───────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 BACKEND STRUCTURE

```
backend/
├── core/                       # Node.js API server
│   ├── server.ts               # Main server
│   ├── routes/                 # API endpoints
│   │   ├── auth.ts             # Authentication
│   │   ├── devices.ts          # Device management
│   │   ├── diagnostics.ts      # Scan & analysis
│   │   ├── session.ts          # Remote sessions
│   │   ├── reports.ts          # Repair reports
│   │   ├── pricing.ts          # Quote generation
│   │   └── users.ts            # User management
│   ├── controllers/            # Business logic
│   ├── models/                 # Data models
│   ├── middlewares/            # Auth, logging, etc.
│   └── utils/                  # Helpers
│
├── brain/                      # Python AI engine
│   ├── app.py                  # FastAPI server
│   ├── engines/                # Core AI engines
│   │   ├── diagnostics_engine.py    # Device analysis
│   │   ├── foresight_engine.py      # Failure prediction
│   │   ├── pricing_engine.py        # Smart pricing
│   │   ├── report_engine.py         # Report generation
│   │   └── prediction_engine.py     # Pattern learning
│   ├── parsers/                # Log/data parsers
│   │   ├── mac_parser.py       # macOS logs
│   │   ├── windows_parser.py   # Windows Event Viewer
│   │   └── logs_parser.py      # Generic logs
│   └── geniuses_bridge.py      # 25 NoizyGeniuses interface
│
├── realtime/                   # WebSocket server
│   └── socket_server.ts        # Live updates
│
├── storage/                    # Data layer
│   ├── db_schema.sql           # PostgreSQL schema
│   └── redis_config.json       # Redis config
│
└── shared/                     # Shared types/constants
    ├── constants/              # System constants
    ├── types/                  # TypeScript types
    └── events/                 # Event definitions
```

---

## 🔌 API ENDPOINTS

### Authentication
```
POST   /api/v1/auth/login
POST   /api/v1/auth/magic-link
POST   /api/v1/auth/verify
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

### Devices
```
POST   /api/v1/devices/register       # Register new device
GET    /api/v1/devices                # List user's devices
GET    /api/v1/devices/:id            # Get device details
GET    /api/v1/devices/:id/health     # Health score
POST   /api/v1/devices/:id/scan       # Start diagnostic scan
DELETE /api/v1/devices/:id            # Remove device
```

### Diagnostics
```
POST   /api/v1/diagnostics/start          # Start scan
GET    /api/v1/diagnostics/:sessionId     # Get scan results
POST   /api/v1/diagnostics/:sessionId/fix # Apply fixes
GET    /api/v1/diagnostics/history        # Past scans
```

### Sessions (Remote Repair)
```
POST   /api/v1/sessions/start         # Start remote session
GET    /api/v1/sessions/:id           # Session status
POST   /api/v1/sessions/:id/action    # Send action/command
POST   /api/v1/sessions/:id/end       # End session
GET    /api/v1/sessions/history       # Past sessions
```

### Reports
```
POST   /api/v1/reports/generate       # Generate report
GET    /api/v1/reports/:id            # Get report
GET    /api/v1/reports/:id/pdf        # Download PDF
POST   /api/v1/reports/:id/email      # Email report
```

### Pricing
```
POST   /api/v1/pricing/estimate       # Get price quote
GET    /api/v1/pricing/packages       # Available packages
```

### Users
```
GET    /api/v1/users/profile          # User profile
PUT    /api/v1/users/profile          # Update profile
GET    /api/v1/users/preferences      # Settings
PUT    /api/v1/users/preferences      # Update settings
```

---

## 🧠 DIAGNOSTICS ENGINE

**File:** `brain/engines/diagnostics_engine.py`

**Purpose:** Analyze device health, find issues, score systems

**Input:**
```json
{
  "device_id": "mac_abc123",
  "os": "macOS 14.1",
  "cpu_cores": 8,
  "ram_gb": 16,
  "storage_gb": 512,
  "logs": "...",
  "smart_data": "..."
}
```

**Output:**
```json
{
  "health_score": 82,
  "issues": [
    {
      "severity": "warning",
      "category": "storage",
      "title": "Storage 85% full",
      "description": "15GB available. Consider cleanup.",
      "fix_time_minutes": 5,
      "auto_fixable": true
    },
    {
      "severity": "info",
      "category": "startup",
      "title": "8 unnecessary startup items",
      "description": "Slowing boot time by ~30 seconds",
      "fix_time_minutes": 2,
      "auto_fixable": true
    }
  ],
  "recommendations": [
    "Clear cache files",
    "Disable startup bloat",
    "Update macOS"
  ],
  "predicted_failures": [],
  "timestamp": "2025-12-01T10:30:00Z"
}
```

---

## 🔮 FORESIGHT ENGINE

**File:** `brain/engines/foresight_engine.py`

**Purpose:** Predict failures BEFORE they happen

**Algorithm:**
1. Analyze SMART data trends
2. Check thermal history
3. Compare against failure database
4. Calculate probability scores
5. Generate timeline predictions

**Output:**
```json
{
  "predictions": [
    {
      "component": "SSD",
      "failure_probability": 0.73,
      "timeline_days": 14,
      "confidence": 0.89,
      "recommendation": "Backup immediately. Replace within 2 weeks.",
      "urgency": "high"
    }
  ],
  "overall_risk_score": 67,
  "next_scan_recommended": "2025-12-08"
}
```

---

## 💰 PRICING ENGINE

**File:** `brain/engines/pricing_engine.py`

**Purpose:** Generate fair, transparent quotes

**Factors:**
- Issue complexity
- Estimated time
- Parts needed
- Urgency level
- Customer history

**Output:**
```json
{
  "quote_id": "Q12345",
  "total": 129.00,
  "currency": "CAD",
  "breakdown": {
    "diagnostic": 0,
    "labor": 99.00,
    "parts": 0,
    "urgency_fee": 30.00
  },
  "estimated_time_minutes": 45,
  "guarantee_days": 7,
  "expires_at": "2025-12-02T10:30:00Z"
}
```

---

## 📄 REPORT ENGINE

**File:** `brain/engines/report_engine.py`

**Purpose:** Generate beautiful, shareable repair reports

**Generates:**
- HTML version (web)
- PDF version (download)
- JSON version (API)
- Email-friendly version

**Template Structure:**
```
NOIZY.AI REPAIR REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Device: MacBook Pro M2
Date: December 1, 2025
Technician: Noizy.AI + Rob
Session ID: AB12-CD34

BEFORE & AFTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Health Score:  67 → 92
Startup Time:  85s → 28s
Storage Used:  92% → 78%

ISSUES FIXED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Cleared 12GB junk files
✓ Disabled 8 startup items
✓ Updated 2 critical drivers
✓ Repaired disk permissions
✓ Optimized network settings

RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Backup weekly (automated service available)
• Monitor SSD health (85% lifespan remaining)
• Update to macOS 14.2 (optional)

NEXT SCAN: December 15, 2025

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered by Noizy.AI
🔥 GORUNFREE! 🎸🔥
```

---

## 🗄️ DATABASE SCHEMA

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    preferences JSONB
);
```

### Devices Table
```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    type VARCHAR(50),
    os VARCHAR(100),
    specs JSONB,
    health_score INTEGER,
    last_scan TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Diagnostics Table
```sql
CREATE TABLE diagnostics (
    id UUID PRIMARY KEY,
    device_id UUID REFERENCES devices(id),
    session_id VARCHAR(255),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    health_score INTEGER,
    issues JSONB,
    predictions JSONB,
    status VARCHAR(50)
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    device_id UUID REFERENCES devices(id),
    user_id UUID REFERENCES users(id),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    actions_performed JSONB,
    technician VARCHAR(255),
    status VARCHAR(50)
);
```

### Reports Table
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    device_id UUID REFERENCES devices(id),
    generated_at TIMESTAMP,
    before_state JSONB,
    after_state JSONB,
    fixes_performed JSONB,
    recommendations JSONB,
    pdf_url TEXT
);
```

---

## 🔴 REDIS CACHE STRUCTURE

### Device Health Cache
```
Key: device:health:{device_id}
TTL: 1 hour
Value: { health_score, last_updated, issues: [...] }
```

### Session State
```
Key: session:state:{session_id}
TTL: 24 hours
Value: { status, progress, current_action, eta }
```

### User Preferences
```
Key: user:prefs:{user_id}
TTL: Persistent
Value: { voice_mode, notifications, timezone }
```

### Prediction Cache
```
Key: predict:{device_id}
TTL: 7 days
Value: { predictions: [...], risk_score, next_scan }
```

---

## 📡 EVENT BUS (Redis Pub/Sub)

### Channel Structure
```
noizyai:diagnostics:started
noizyai:diagnostics:progress
noizyai:diagnostics:complete
noizyai:session:connected
noizyai:session:action
noizyai:session:ended
noizyai:genius:called
noizyai:report:generated
noizyai:alert:critical
```

### Event Payload Example
```json
{
  "event": "diagnostics:complete",
  "timestamp": "2025-12-01T10:30:00Z",
  "device_id": "mac_abc123",
  "data": {
    "health_score": 82,
    "issues_found": 3,
    "critical_issues": 0
  }
}
```

---

## 🧩 MODULE INTEGRATION

### How Modules Connect:

```
Frontend (Module 2)
    ↓ HTTP/WebSocket
Core API (Module 3)
    ↓ Internal calls
Brain Engine (Module 3)
    ↓ AI processing
25 NoizyGeniuses (Module 4)
    ↓ Specialized logic
Miracle Engine (Module 5)
    ↓ Orchestration
```

---

## ⚡ PERFORMANCE TARGETS

- **API Response:** < 100ms (p95)
- **Diagnostic Scan:** < 30 seconds
- **Health Score Calc:** < 2 seconds
- **Report Generation:** < 5 seconds
- **WebSocket Latency:** < 50ms
- **Database Queries:** < 10ms

---

## 🔐 SECURITY LAYERS

### 1. **Authentication**
- Magic link (no passwords)
- JWT tokens
- Refresh tokens
- Session expiry (24 hours)

### 2. **Authorization**
- User can only access their devices
- Role-based access (user/admin/tech)
- Session permissions

### 3. **Data Protection**
- Encrypt at rest (AES-256)
- Encrypt in transit (TLS 1.3)
- No logging of sensitive data
- GDPR compliant

### 4. **Rate Limiting**
- 100 requests/minute per user
- 10 scans/hour per device
- DDoS protection

---

## 🔄 DATA FLOW EXAMPLES

### Diagnostic Scan Flow
```
1. Frontend calls: POST /api/v1/diagnostics/start
2. Core API validates request
3. Core API calls Brain Engine: POST /internal/analyze
4. Brain Engine:
   a. Parses device data
   b. Runs diagnostics
   c. Calculates health score
   d. Generates predictions
   e. Returns results
5. Core API saves to database
6. Core API publishes event: diagnostics:complete
7. WebSocket pushes update to Frontend
8. Frontend displays results
```

### Remote Session Flow
```
1. User clicks "Connect to Technician"
2. Frontend calls: POST /api/v1/sessions/start
3. Core API:
   a. Creates session record
   b. Generates secure token
   c. Opens WebSocket channel
   d. Notifies technician
4. Tech connects via WebSocket
5. Actions flow: Tech → API → Device
6. Progress updates: Device → API → Frontend
7. Session ends: POST /api/v1/sessions/:id/end
8. Report generated automatically
```

---

## 📊 MONITORING & LOGGING

### Application Logs
```
Location: /var/log/noizyai/
Files:
  - api.log          (Core API logs)
  - brain.log        (Python engine logs)
  - websocket.log    (Real-time events)
  - error.log        (Errors only)
  - access.log       (HTTP access)
```

### Metrics (Prometheus)
```
- Request count
- Response time
- Error rate
- Active sessions
- Device scans/hour
- Health score distribution
```

### Alerts
```
- API down
- Database slow
- Error rate spike
- Disk space low
- Memory pressure
```

---

## 🔥 BACKEND FEATURES

### ✅ Implemented:
- RESTful API design
- WebSocket real-time updates
- AI-powered diagnostics
- Failure prediction
- Smart pricing
- Report generation
- Event-driven architecture
- Caching layer
- Security best practices

### 🏗️ Ready for Integration:
- 25 NoizyGeniuses (Module 4)
- Miracle Engine orchestration (Module 5)
- OMEGA BRAIN distributed compute
- GABRIEL + OMEN GPU offloading

---

## 📦 TECHNOLOGY STACK

### Core API
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Validation:** Zod
- **Auth:** JWT + Magic Links

### Brain Engine
- **Runtime:** Python 3.11+
- **Framework:** FastAPI
- **ML Libraries:** scikit-learn, ChromaDB
- **Data:** Pandas, NumPy

### Real-Time
- **Library:** Socket.io
- **Protocol:** WebSocket
- **Fallback:** Long polling

### Data Layer
- **Primary DB:** PostgreSQL 15
- **Cache:** Redis 7
- **Storage:** S3 or local filesystem
- **Queue:** Redis Queue

---

## 🎯 BACKEND COMPLETE!

**The engine room is built.**

**Noizy.AI now has:**
- ✅ Complete API
- ✅ AI diagnostic engine
- ✅ Prediction system
- ✅ Real-time updates
- ✅ Security layers
- ✅ Event bus
- ✅ Database schema

**Ready for Module 4: 25 NoizyGeniuses!**

---

**🔥 GORUNFREE! 🎸🔥**
