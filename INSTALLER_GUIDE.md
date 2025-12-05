# 🪄 NOIZY.AI - INSTALLER WIZARD GUIDE

**One-Command Installation**  
**Fish Music Inc - CB_01**  
**🔥 GORUNFREE! 🎸🔥**

---

## 🎯 WHAT THIS DOES

The **Noizy.AI Installer Wizard** sets up your entire AI empire in one command:

✅ Node.js backend (Express + TypeScript)  
✅ Python AI brain (FastAPI + ML libraries)  
✅ 25 NoizyGeniuses (all squads)  
✅ Miracle Engine (Omega Core)  
✅ React frontend  
✅ System services  
✅ Global `noizy-start` command  

**Time: ~10 minutes**  
**Effort: One command**

---

## 🚀 QUICK INSTALL

### On macOS/Linux:
```bash
cd /Users/m2ultra/NOIZYLAB/NOIZY_AI/installer
./run_installer.sh
```

### On Windows:
```powershell
cd C:\Users\Rob\NOIZYLAB\NOIZY_AI\installer
.\run_installer.ps1
```

**That's it!** The wizard handles everything.

---

## 📋 WHAT GETS INSTALLED

### Step 1: Detect OS
- Verifies macOS, Linux, or Windows
- Exits if unsupported

### Step 2: Install Node.js
- Checks if already installed
- Installs via Homebrew (Mac) or apt (Linux)
- Verifies installation

### Step 3: Install Python
- Checks if Python 3 installed
- Installs FastAPI + Uvicorn
- Verifies installation

### Step 4: Setup Backend
- Installs Node.js dependencies
- Prepares Express server
- Configures routes

### Step 5: Setup Python Brain
- Installs ML libraries (scikit-learn, ChromaDB)
- Configures FastAPI
- Sets up engines & parsers

### Step 6: Setup NoizyGeniuses
- Loads all 25 genius classes
- Verifies TypeScript compilation
- Ready for orchestration

### Step 7: Setup Omega Engine
- Installs Miracle Engine
- Configures Omega Core
- Sets up fusion & routing

### Step 8: Setup Frontend
- Installs React dependencies
- Configures Vite
- Prepares UI components

### Step 9: Create Services
- Creates `noizy-start` global command
- (Optional) Sets up system daemons
- Configures auto-start

### Step 10: Final Check
- Verifies all installations
- Checks file structure
- Reports status

---

## 🎯 AFTER INSTALLATION

### Start Noizy.AI:
```bash
noizy-start
```

**This launches:**
- Backend API (port 5000)
- Python Brain (port 5001)
- React Frontend (port 3000)

**Access at:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- AI Brain: http://localhost:5001/docs (FastAPI docs)

---

## 🔧 MANUAL START (If Needed)

```bash
# Terminal 1: Backend
cd backend/core
npm run dev

# Terminal 2: Python Brain
cd backend/brain
python3 app.py

# Terminal 3: Frontend
cd frontend
npm run dev
```

---

## 📊 VERIFICATION

### Check Services Running:
```bash
# Check Node backend
curl http://localhost:5000

# Check Python brain
curl http://localhost:5001

# Check frontend
curl http://localhost:3000
```

### Check Logs:
```bash
tail -f /tmp/noizy-backend.log
tail -f /tmp/noizy-brain.log
tail -f /tmp/noizy-frontend.log
```

---

## 🛠️ TROUBLESHOOTING

### Installer Fails
```bash
# Check which step failed
# Re-run from that step manually
./steps/step_XX_name.sh
```

### Node.js Won't Install
```bash
# Install manually
brew install node  # macOS
```

### Python Issues
```bash
# Verify Python 3
python3 --version

# Reinstall dependencies
pip3 install -r backend/brain/requirements.txt
```

### Services Won't Start
```bash
# Check ports aren't already in use
lsof -i :5000
lsof -i :5001
lsof -i :3000
```

---

## 🎨 CUSTOMIZATION

### Change Ports:
Edit `.env` files in each directory:
```
PORT=5000  # Backend
PORT=5001  # Brain
PORT=3000  # Frontend
```

### Skip Steps:
Comment out unwanted steps in `run_installer.sh`

### Add Custom Steps:
Create `step_11_custom.sh` and add to installer

---

## 🔥 ONE-COMMAND FUTURE UPDATES

Create update script:
```bash
cd installer
./run_updater.sh  # (Create this for updates)
```

---

**🔥 GORUNFREE! 🎸🔥**
