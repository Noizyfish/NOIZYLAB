# 🔥 NOISYLABZ - Master Setup Complete

## ✅ What's Been Created

Your professional development workspace is ready to **FLOW**:

```
/Volumes/RSP/NOISYLABZ/
├── .config/              → Scripts & environment
├── .vscode/              → VS Code settings (1 TAB ONLY)
├── .github/              → GitHub workflows (ready for future)
├── projects/             → 🎯 YOUR ACTIVE PROJECTS
├── archive/              → Completed/old projects
├── backups/              → Automatic daily backups
├── docs/                 → Documentation
└── NOISYLABZ.code-workspace → Open this in VS Code
```

---

## 🚀 3-STEP STARTUP

### Step 1: Update Shell Profile
```bash
echo 'source /Volumes/RSP/NOISYLABZ/.config/init.zsh' >> ~/.zshrc
source ~/.zshrc
```

### Step 2: Configure Omen (Optional)
Edit `/Volumes/RSP/NOISYLABZ/.config/noisylabz.env`:
```bash
export OMEN_HOST="[your-omen-ip]"
export OMEN_USER="[your-username]"
```

### Step 3: Open in VS Code
```bash
code /Volumes/RSP/NOISYLABZ/NOISYLABZ.code-workspace
```

**That's it. You're ready.**

---

## 🎯 System Preferences Configured

### ✨ **Active Mission Always Single Tab**
```
Only 1 tab open at a time
↓
Auto-save enabled
↓
Super clean interface
↓
Zero distraction
```

**Location**: `.vscode/settings.json`
- Tab limit: **1**
- Auto-save: **onFocusChange**
- Excluded files: Hidden

See `docs/SYSPREFS.md` for details.

---

## 💻 Daily Commands

```bash
# Open workspace
noisylabz
noisylabz-status

# Create new project
newproject my-project

# Switch projects
projects
cd my-project
code .

# Backup
backup

# Sync with Omen
omen-sync      # Send to Omen
omen-pull      # Fetch from Omen
```

---

## 🔄 Sync Strategy

### **Mac Studio** (Primary)
- Local development
- Real-time editing
- Google Drive auto-sync

### **Google Workspace** (Cloud)
- Continuous backup
- Multi-device access
- Automatic versioning

### **Omen** (Processing)
```bash
omen-sync          # Upload project
# SSH into Omen and run heavy tasks
omen-pull          # Download results
```

---

## 💾 Automated Backups

**Setup** (One-time):
```bash
crontab -e
# Add: 0 2 * * * /Volumes/RSP/NOISYLABZ/backups/backup.sh
```

**Manual**:
```bash
backup
```

**Restore**:
```bash
tar -xzf /Volumes/RSP/NOISYLABZ/backups/noisylabz_backup_DATE.tar.gz
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `QUICKSTART.md` | Get started in 5 minutes |
| `docs/SETUP.md` | Detailed configuration |
| `docs/SYSPREFS.md` | Tab/preference system |
| `README.md` | Overview |

---

## 🎬 Create Your First Project

```bash
newproject awesome-app

# Your project has:
# - src/          (your code)
# - tests/        (tests)
# - docs/         (docs)
# - config/       (config)
# - README.md
# - .gitignore

cd projects/awesome-app
code .
```

---

## 🔧 Pro Setup Tips

### 1. **Git Integration**
```bash
cd /Volumes/RSP/NOISYLABZ
git init
git add .
git commit -m "Initialize NOISYLABZ workspace"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### 2. **Google Drive Sync** (Mac)
1. Install Google Drive for Mac
2. Preferences → Select Folder
3. Choose `/Volumes/RSP/NOISYLABZ`
4. Enable real-time sync ✓

### 3. **Keyboard Shortcuts**
- **Cmd+Shift+P**: Command palette
- **Cmd+K**: Split editor
- **Cmd+B**: Toggle sidebar

---

## ⚡ The Philosophy

**CLEAN. MINIMAL. FLOW.**

- ✅ One mission = One tab
- ✅ Auto-save everything
- ✅ Hidden junk files
- ✅ Super organized
- ✅ Backed up daily
- ✅ Synced everywhere

**No distractions. Pure focus.**

---

## 📞 Quick Troubleshooting

### "Commands not found"
```bash
source /Volumes/RSP/NOISYLABZ/.config/init.zsh
```

### VS Code not opening workspace properly
```bash
code /Volumes/RSP/NOISYLABZ/NOISYLABZ.code-workspace
```

### Backup permissions error
```bash
chmod +x /Volumes/RSP/NOISYLABZ/backups/backup.sh
```

---

## 🎉 You're All Set

Your workspace is now:
- ✅ Organized
- ✅ Automated
- ✅ Backed up
- ✅ Synced
- ✅ Clean
- ✅ Ready to **FLOW**

**Next**: Create your first project and start building!

```bash
newproject your-first-project
cd projects/your-first-project
code .
```

---

**Created**: November 2025  
**Version**: 1.0  
**Status**: 🔥 **READY TO GO**
