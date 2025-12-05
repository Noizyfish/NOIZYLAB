# 🎨 NOIZY.AI - PAGE ARCHITECTURE

**The Complete UI/UX Skeleton**  
**Fish Music Inc - CB_01**

---

## 📑 CORE PAGES (8 Essential Pages)

### 1. **LANDING PAGE** (Homepage)
**URL:** `noizy.ai`  
**Purpose:** First impression, trust-building, conversion  

**Sections:**
```
┌─────────────────────────────────────────┐
│  HERO                                   │
│  • Headline: "Unorthodox Intelligence"  │
│  • Subhead: "Fix your Mac/PC fast"      │
│  • CTA: "Start Free Scan"               │
│  • Visual: Animated AI brain            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  WHAT WE FIX                            │
│  • Mac problems                         │
│  • Windows problems                     │
│  • Network issues                       │
│  • Malware removal                      │
│  • Performance optimization             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  HOW IT WORKS                           │
│  1. Click "Scan" (30 seconds)           │
│  2. See what's wrong (plain English)    │
│  3. Fix it (automatic or with expert)   │
│  4. Done (faster than making coffee)    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  TRUST SIGNALS                          │
│  • "No downloads required"              │
│  • "Your data stays private"            │
│  • "Works on Mac + Windows"             │
│  • "Free diagnostic scan"               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  TESTIMONIALS                           │
│  Real stories from real people          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  FOOTER                                 │
│  • Links                                │
│  • Contact                              │
│  • 🔥 GORUNFREE! 🎸🔥                  │
└─────────────────────────────────────────┘
```

---

### 2. **PORTAL LOGIN PAGE**
**URL:** `portal.noizy.ai`  
**Purpose:** Secure, frictionless access  

**Layout:**
```
┌─────────────────────────────────────────┐
│           NOIZY.AI LOGO                 │
│                                         │
│     "Welcome Back, Human"               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  📧 Enter your email              │  │
│  │  [____________________________]   │  │
│  │                                   │  │
│  │  [Send Magic Link]                │  │
│  └───────────────────────────────────┘  │
│                                         │
│  OR                                     │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   📱 Scan QR Code                 │  │
│  │   [QR CODE IMAGE]                 │  │
│  └───────────────────────────────────┘  │
│                                         │
│  "No passwords. No hassle. Just you."   │
└─────────────────────────────────────────┘
```

---

### 3. **DEVICE SCAN PAGE**
**URL:** `portal.noizy.ai/scan`  
**Purpose:** Automatic device analysis  

**UI Flow:**
```
┌─────────────────────────────────────────┐
│  "Scanning Your Device..."              │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │      [ANIMATED SCANNING RINGS]    │  │
│  │            🖥️                     │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Currently checking:                    │
│  ✓ CPU health                           │
│  ✓ RAM usage                            │
│  ⏳ Disk integrity (62%)                │
│  ⏸ Network speed                        │
│  ⏸ Malware scan                         │
│  ⏸ Driver status                        │
│                                         │
│  "This takes about 30 seconds.          │
│   Hang tight—I'm faster than            │
│   you can say 'kernel panic.'"          │
└─────────────────────────────────────────┘
```

---

### 4. **DIAGNOSTIC RESULTS PAGE**
**URL:** `portal.noizy.ai/results`  
**Purpose:** Show findings, recommend actions  

**Layout:**
```
┌─────────────────────────────────────────┐
│  "Your Device Health Report"            │
│                                         │
│  ┌───────────────┐                      │
│  │   SCORE       │                      │
│  │               │                      │
│  │     82/100    │  ← Big, bold number  │
│  │               │                      │
│  │   ⚠️ Needs    │                      │
│  │   Attention   │                      │
│  └───────────────┘                      │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│  ✅ EXCELLENT                           │
│  • CPU: Running smooth                  │
│  • Network: Fast & stable               │
│                                         │
│  ⚠️  NEEDS ATTENTION                    │
│  • Storage: 85% full (15GB available)   │
│  • 8 unnecessary startup items          │
│                                         │
│  ❌ CRITICAL                            │
│  • None detected                        │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│  RECOMMENDED ACTIONS:                   │
│  1. Clear cache files (frees 8GB)       │
│  2. Disable startup bloat               │
│  3. Update 2 outdated drivers           │
│                                         │
│  [Fix It All (8 min)] [Pick & Choose]   │
└─────────────────────────────────────────┘
```

---

### 5. **REMOTE SESSION PAGE**
**URL:** `portal.noizy.ai/session/[id]`  
**Purpose:** Live repair status, transparency  

**Layout:**
```
┌─────────────────────────────────────────┐
│  🟢 Connected to Technician             │
│  Session ID: AB12-CD34                  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  CURRENT STATUS                   │  │
│  │  ──────────────────────────────   │  │
│  │  Optimizing startup sequence      │  │
│  │                                   │  │
│  │  Progress: ████████░░ 75%         │  │
│  │  ETA: 3 minutes                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  WHAT I'VE DONE:                        │
│  ✓ Cleared 8GB cache (2 min ago)        │
│  ✓ Disabled 3 startup items (4 min ago) │
│  ⏳ Updating drivers (in progress)       │
│                                         │
│  💬 CHAT                                │
│  ┌───────────────────────────────────┐  │
│  │  Tech: "Almost done here!"        │  │
│  │  You: [Type message...]           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [🔴 Pause Session] [❌ End Session]    │
│                                         │
│  "You're in control. End anytime."      │
└─────────────────────────────────────────┘
```

---

### 6. **REPAIR REPORT PAGE**
**URL:** `portal.noizy.ai/report/[id]`  
**Purpose:** Beautiful summary, shareable, saves trust  

**Layout:**
```
┌─────────────────────────────────────────┐
│  ✅ REPAIR COMPLETE!                    │
│                                         │
│  Device: MacBook Pro M2                 │
│  Date: Dec 1, 2025                      │
│  Technician: Noizy.AI + Rob             │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│  BEFORE                 AFTER           │
│  Health: 67/100  →      92/100          │
│  Startup: 85s    →      28s             │
│  Storage: 92%    →      78%             │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│  WHAT WE FIXED:                         │
│  ✓ Cleared 12GB junk files              │
│  ✓ Disabled 8 startup items             │
│  ✓ Updated 2 critical drivers           │
│  ✓ Repaired disk permissions            │
│  ✓ Optimized network settings           │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│  RECOMMENDATIONS:                       │
│  • Backup weekly (I can automate this)  │
│  • Monitor SSD health (85% lifespan)    │
│  • Update to macOS 14.2 (optional)      │
│                                         │
│  [Download PDF] [Email This Report]     │
└─────────────────────────────────────────┘
```

---

### 7. **CUSTOMER DASHBOARD**
**URL:** `portal.noizy.ai/dashboard`  
**Purpose:** Overview of all devices, history, health  

**Layout:**
```
┌─────────────────────────────────────────┐
│  "Hey Rob, Welcome Back!"               │
│                                         │
│  YOUR DEVICES                           │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ MacBook  │ │ iMac     │ │ Windows │ │
│  │   92/100 │ │  78/100  │ │  65/100 │ │
│  │ Healthy  │ │  OK      │ │ Warning │ │
│  └──────────┘ └──────────┘ └─────────┘ │
│                                         │
│  RECENT ACTIVITY                        │
│  • Scan completed (2 hours ago)         │
│  • Storage cleanup (Yesterday)          │
│  • Malware scan (3 days ago)            │
│                                         │
│  UPCOMING ALERTS                        │
│  ⚠️  Windows PC: Update recommended     │
│  💡 MacBook: Backup due in 3 days       │
│                                         │
│  AI RECOMMENDATIONS                     │
│  "Your iMac could use a tune-up.        │
│   Takes 10 minutes. Want to schedule?"  │
│                                         │
│  [Schedule] [Remind Me Later]           │
└─────────────────────────────────────────┘
```

---

### 8. **SETTINGS PAGE**
**URL:** `portal.noizy.ai/settings`  
**Purpose:** Control, preferences, privacy  

**Sections:**
- Notifications (email, SMS, push)
- Privacy (what we track, what we don't)
- Devices (add, remove, rename)
- Security (2FA, session history)
- Voice Mode (friendly, pro, trash-talk)
- Data (download, delete)

---

## 🎨 DESIGN SYSTEM

### Spacing Scale
```
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
3xl: 64px
```

### Border Radius
```
sm:  4px   (inputs, small cards)
md:  8px   (buttons, cards)
lg:  12px  (modals, large cards)
xl:  16px  (page sections)
full: 9999px (pills, badges)
```

### Shadow System
```
sm:  0 1px 2px rgba(0,0,0,0.1)
md:  0 4px 6px rgba(0,0,0,0.1)
lg:  0 10px 15px rgba(0,0,0,0.15)
xl:  0 20px 25px rgba(0,0,0,0.2)
glow: 0 0 20px rgba(246,200,95,0.3)  (Noizy Gold glow)
```

---

## 🎯 COMPONENT LIBRARY

### Buttons
```jsx
// Primary (Noizy Gold)
<Button variant="primary">Fix It Now</Button>

// Secondary (Slate)
<Button variant="secondary">Maybe Later</Button>

// Danger (Red)
<Button variant="danger">Delete</Button>

// "Hold My Coffee" (Special)
<Button variant="coffee">Fix Everything</Button>
```

### Cards
```jsx
// Standard
<Card>
  <Card.Header>Health Check</Card.Header>
  <Card.Body>Your Mac is healthy!</Card.Body>
</Card>

// Diagnostic
<DiagnosticCard
  title="CPU Usage"
  value="45%"
  status="good"
  icon="cpu"
/>

// Alert (Red/Yellow/Green)
<AlertCard severity="warning">
  Storage 85% full
</AlertCard>
```

### Progress
```jsx
// Bar
<ProgressBar value={75} label="Scanning..." />

// Ring
<ProgressRing value={82} size="large" />

// Timeline
<Timeline>
  <Step completed>Scan</Step>
  <Step current>Repair</Step>
  <Step>Report</Step>
</Timeline>
```

### Charts
```jsx
// CPU Thermometer
<CPUMeter value={45} max={100} />

// Storage Donut
<StorageDonut used={850} total={1000} />

// Network Graph
<NetworkGraph data={speedHistory} />

// Health Score Dial
<HealthScore value={82} />
```

---

## 🌊 USER JOURNEY FLOWS

### Flow 1: First-Time User
```
Landing Page
    ↓ Click "Start Free Scan"
Magic Link Login
    ↓ Click email link
Device Scan (30s)
    ↓ Auto-detect issues
Diagnostic Results
    ↓ Click "Fix It All"
Consent Dialog
    ↓ Grant consent
Remote Session
    ↓ Repair in progress
Repair Complete
    ↓ See report
Dashboard
    ↓ Done!
```

### Flow 2: Returning Customer
```
Login (auto-recognized)
    ↓
Dashboard (shows devices)
    ↓ Select device
Quick Scan
    ↓
"All Good!" or "Issues Found"
    ↓ If issues:
One-Click Fix
    ↓
Done!
```

### Flow 3: Emergency User
```
Landing Page
    ↓ Click "Emergency Help"
Instant Connect
    ↓ No scan, straight to human
Live Session
    ↓ Real-time fix
Crisis Resolved
    ↓
Report + Recommendations
```

---

## 🎨 INTERACTION PATTERNS

### Hover States
```
Button:
  • Lift 2px
  • Glow shadow
  • Lighten 10%

Card:
  • Border glow (gold)
  • Lift 4px
  • Subtle scale (1.02x)

Link:
  • Underline fade-in
  • Color shift to gold
```

### Click/Tap States
```
Button:
  • Shrink to 0.95x
  • Quick spring back
  • Haptic feedback (mobile)

Card:
  • Quick scale pulse
  • Ripple effect from touch point
```

### Loading States
```
Button:
  • Spinner replaces text
  • Disable interaction
  • Shimmer animation

Page:
  • Skeleton screens
  • Fade-in content
  • Progressive load
```

---

## 📱 RESPONSIVE BREAKPOINTS

```
Mobile:   0-640px    (Stack everything)
Tablet:   641-1024px (2-column grid)
Desktop:  1025-1440px (3-column grid)
Large:    1441px+    (Max-width container)
```

---

## 🎭 PERSONALITY IN UI

### Micro-Copy Examples

**Loading States:**
```
"Hang tight—I'm checking your system faster than you can say 'kernel panic.'"
"Scanning... (this is the AI equivalent of me squinting at your device)"
"Almost there... (your CPU is being dramatic)"
```

**Empty States:**
```
"Nothing to see here! Your device is squeaky clean."
"No repairs needed. Go enjoy your healthy Mac."
"Zero issues detected. You're crushing it."
```

**Error States:**
```
"Oops. Something went sideways. Let me try that again."
"Connection hiccup. Reconnecting in 3... 2... 1..."
"That didn't work. But I've got Plan B."
```

---

## ✅ PAGE ARCHITECTURE COMPLETE!

**8 core pages designed**  
**Component library defined**  
**User flows mapped**  
**Responsive system ready**

---

**🔥 GORUNFREE! 🎸🔥**
