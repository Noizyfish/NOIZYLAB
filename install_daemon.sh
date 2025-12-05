#!/bin/bash
# 🌌 NOIZYLAB - Install Agent Daemon (macOS)
# Fish Music Inc - CB_01
# 🔥 GORUNFREE! 🎸🔥

set -e

echo "🔊 Installing NOIZYLAB Agent Daemon..."

# Variables
PLIST_FILE="$(pwd)/launch_agent.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_NAME="com.fishmusic.noizylab.agent.plist"

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

# Copy plist file
echo "📋 Copying plist to $LAUNCH_AGENTS_DIR..."
cp "$PLIST_FILE" "$LAUNCH_AGENTS_DIR/$PLIST_NAME"

# Unload if already loaded
if launchctl list | grep -q "com.fishmusic.noizylab.agent"; then
    echo "🔄 Unloading existing service..."
    launchctl unload "$LAUNCH_AGENTS_DIR/$PLIST_NAME" 2>/dev/null || true
fi

# Load the service
echo "🚀 Loading service..."
launchctl load "$LAUNCH_AGENTS_DIR/$PLIST_NAME"

# Verify it's running
sleep 2
if launchctl list | grep -q "com.fishmusic.noizylab.agent"; then
    echo "✅ NOIZYLAB Agent daemon installed and running!"
    echo ""
    echo "📝 Logs:"
    echo "   stdout: /tmp/noizylab_agent.out.log"
    echo "   stderr: /tmp/noizylab_agent.err.log"
    echo "   app:    /tmp/noizylab_agent_god.log"
    echo ""
    echo "🔥 Commands:"
    echo "   launchctl list | grep noizylab         # Check status"
    echo "   launchctl unload ~/Library/LaunchAgents/$PLIST_NAME  # Stop"
    echo "   launchctl load ~/Library/LaunchAgents/$PLIST_NAME    # Start"
    echo ""
    echo "🔥 GORUNFREE! 🎸🔥"
else
    echo "❌ Failed to start daemon"
    exit 1
fi
