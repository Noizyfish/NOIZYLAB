#!/bin/bash
# 🌌 NOIZYLAB - Uninstall Agent Daemon (macOS)
# Fish Music Inc - CB_01
# 🔥 GORUNFREE! 🎸🔥

set -e

echo "🔊 Uninstalling NOIZYLAB Agent Daemon..."

LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_NAME="com.fishmusic.noizylab.agent.plist"

# Unload if running
if launchctl list | grep -q "com.fishmusic.noizylab.agent"; then
    echo "🛑 Stopping service..."
    launchctl unload "$LAUNCH_AGENTS_DIR/$PLIST_NAME"
fi

# Remove plist
if [ -f "$LAUNCH_AGENTS_DIR/$PLIST_NAME" ]; then
    echo "🗑️  Removing plist..."
    rm "$LAUNCH_AGENTS_DIR/$PLIST_NAME"
fi

echo "✅ NOIZYLAB Agent daemon uninstalled!"
echo "🔥 GORUNFREE! 🎸🔥"
