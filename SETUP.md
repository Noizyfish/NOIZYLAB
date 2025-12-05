# NOISYLABZ Setup Guide

## 1. Google Workspace Sync

### Local Sync Configuration
```bash
# Install Google Drive for Mac
# Sync this folder: /Volumes/RSP/NOISYLABZ
# Set to:
# - Auto-sync enabled
# - Real-time updates
# - Selective sync for projects/
```

## 2. Mac Studio Configuration

### VS Code Workspace Setup
```json
{
  "folders": [
    {
      "path": "/Volumes/RSP/NOISYLABZ"
    }
  ],
  "settings": {
    "files.autoSave": "onFocusChange",
    "files.exclude": {
      "**/node_modules": true,
      "**/.git": false,
      "**/backups": true
    }
  }
}
```

## 3. Omen Remote Processing

### SSH Access Configuration
```bash
# Add to ~/.ssh/config
Host omen
    HostName [omen-ip]
    User [username]
    IdentityFile ~/.ssh/omen_key
```

### Usage
```bash
# Transfer project to Omen
rsync -avz ~/NOISYLABZ/projects/[project-name] omen:~/projects/

# Run processing
ssh omen 'cd ~/projects/[project-name] && [process-command]'

# Sync results back
rsync -avz omen:~/projects/[project-name]/results/ ~/NOISYLABZ/projects/[project-name]/
```

## 4. Automated Backups

### Local Backup Script
Create `backups/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/Volumes/RSP/NOISYLABZ/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf "$BACKUP_DIR/noisylabz_$TIMESTAMP.tar.gz" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='backups' \
  /Volumes/RSP/NOISYLABZ/projects/
```

Schedule with cron:
```bash
# Daily backup at 2 AM
0 2 * * * /Volumes/RSP/NOISYLABZ/backups/backup.sh
```

## 5. Project Organization

### Project Template Structure
Each project in `projects/` should follow:
```
[project-name]/
├── src/
├── tests/
├── docs/
├── .env.example
├── README.md
└── .gitignore
```

## 6. Git Integration

```bash
cd /Volumes/RSP/NOISYLABZ
git init
git add .
git commit -m "Initialize NOISYLABZ workspace"
```

## Workflow

1. **Create new project** → Use project template
2. **Work locally** → Auto-save enabled
3. **Heavy compute** → Rsync to Omen, execute remotely
4. **Commit changes** → Push to Git
5. **Automated backup** → Runs daily
6. **Google Workspace** → Real-time cloud sync

---

**Last Updated**: November 2025
