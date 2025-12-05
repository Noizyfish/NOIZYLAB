#!/bin/bash

# NOISYLABZ Backup Script
# Automated daily backup with timestamp

set -e

NOISYLABZ_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$NOISYLABZ_ROOT/backups"
PROJECTS_DIR="$NOISYLABZ_ROOT/projects"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/noisylabz_backup_$TIMESTAMP.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting NOISYLABZ backup..."
echo "📦 Backup file: $BACKUP_FILE"

# Create compressed backup
tar -czf "$BACKUP_FILE" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='backups/noisylabz_backup_*' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  "$PROJECTS_DIR" \
  "$NOISYLABZ_ROOT/docs" \
  "$NOISYLABZ_ROOT/README.md"

# Get file size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✅ Backup complete: $SIZE"
echo "📅 $(date)"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "noisylabz_backup_*.tar.gz" -mtime +30 -delete

echo "🧹 Cleanup complete (kept last 30 days)"
