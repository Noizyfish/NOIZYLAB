# NOISYLABZ Quick Start

## 🚀 Getting Started (5 minutes)

### 1. **Initialize Git** (Optional but Recommended)
```bash
cd /Volumes/RSP/NOISYLABZ
git init
git add .
git commit -m "Initialize NOISYLABZ workspace"
git remote add origin [your-github-repo]
git push -u origin main
```

### 2. **Add to Your Shell**
Edit `~/.zshrc` and add:
```bash
source /Volumes/RSP/NOISYLABZ/.config/init.zsh
```

Then reload:
```bash
source ~/.zshrc
```

### 3. **Open in VS Code**
```bash
code /Volumes/RSP/NOISYLABZ/NOISYLABZ.code-workspace
```

### 4. **Test Commands**
```bash
# Check status
noisylabz-status

# Create a new project
newproject my-first-project

# Navigate
noisylabz
projects
```

---

## 📋 Directory Structure Explained

```
NOISYLABZ/
├── .config/              # Configuration scripts
│   ├── init.zsh         # Shell setup
│   ├── noisylabz.env    # Environment variables
│   ├── new-project.sh   # Project generator
│   └── omen-sync.sh     # Remote sync script
│
├── .github/              # GitHub workflows (future)
│
├── projects/             # 🔥 ACTIVE PROJECTS GO HERE
│   ├── project-1/
│   ├── project-2/
│   └── ...
│
├── archive/              # Old/completed projects
│
├── backups/              # Automatic backups
│   └── *.tar.gz
│
├── docs/                 # Documentation
│   ├── SETUP.md
│   ├── WORKFLOW.md
│   └── ...
│
├── README.md
├── .gitignore
└── NOISYLABZ.code-workspace
```

---

## 🔄 Daily Workflow

### Morning
```bash
noisylabz          # Navigate to workspace
noisylabz-status   # Check status
```

### Start Working
```bash
cd projects/[project-name]
code .             # Opens in VS Code
```

### After Editing
```bash
git add .
git commit -m "Update: description"
```

### Heavy Processing (Omen)
```bash
omen-sync          # Send to Omen
# SSH into Omen and run processes
omen-pull          # Fetch results back
```

### Before Sleep
```bash
backup             # Manual backup (or automatic nightly)
```

---

## 🔧 Configuration

### Update Omen Access
Edit `/Volumes/RSP/NOISYLABZ/.config/noisylabz.env`:
```bash
export OMEN_HOST="[actual-omen-ip]"
export OMEN_USER="[your-username]"
```

### Google Workspace Sync
1. Install Google Drive for Mac
2. Go to **Google Drive Preferences**
3. Select **My Drive** → **Sync Folder**
4. Choose `/Volumes/RSP/NOISYLABZ`
5. Enable real-time sync

### Schedule Automatic Backups
```bash
# Edit crontab
crontab -e

# Add this line for daily 2 AM backup:
0 2 * * * /Volumes/RSP/NOISYLABZ/backups/backup.sh
```

---

## 🎯 Creating Your First Project

```bash
newproject my-awesome-project
cd projects/my-awesome-project
```

Your project will have:
```
my-awesome-project/
├── src/          # Your code
├── tests/        # Tests
├── docs/         # Documentation
├── config/       # Config files
├── README.md
└── .gitignore
```

Edit `README.md` and start coding!

---

## 🌐 Multi-Device Workflow

### Mac Studio (Primary)
- Local development
- Real-time editing
- Google Drive sync

### Omen (Heavy Processing)
```bash
# Send specific project
rsync -avz projects/analysis-project/ user@omen:~/projects/

# Run on Omen
ssh user@omen 'cd ~/projects/analysis-project && python process.py'

# Get results
rsync -avz user@omen:~/projects/analysis-project/results/ projects/analysis-project/
```

### Google Workspace (Cloud)
- All files auto-synced
- Access from anywhere
- Backup protection

---

## 💾 Backup Strategy

**Automatic**: Daily at 2 AM (if cron configured)
**Manual**: `backup` command
**Retention**: 30 days of backups
**Location**: `/Volumes/RSP/NOISYLABZ/backups/`

Restore a backup:
```bash
cd /Volumes/RSP
tar -xzf NOISYLABZ/backups/noisylabz_backup_20251104_020000.tar.gz
```

---

## ⚡ Pro Tips

1. **Keep It Clean**: Archive projects regularly to `archive/`
2. **Document Everything**: Update project READMEs
3. **Commit Often**: Git commits are your insurance policy
4. **Use Aliases**: Commands like `noisylabz` save time
5. **Monitor Backups**: Check backup size monthly

---

## 🆘 Troubleshooting

### "Command not found: noisylabz"
```bash
source /Volumes/RSP/NOISYLABZ/.config/init.zsh
```

### Backup fails
```bash
# Check permissions
ls -la /Volumes/RSP/NOISYLABZ/backups/
chmod +x /Volumes/RSP/NOISYLABZ/backups/backup.sh
```

### Google Sync not working
- Restart Google Drive for Mac
- Check `/Volumes/RSP/NOISYLABZ` permissions
- Ensure folder is in Google Drive

---

**Created**: November 2025  
**Organization**: NOISYLABZ  
**Environment**: Mac Studio + Omen + Google Workspace
