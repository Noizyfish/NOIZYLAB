#!/bin/bash
# 🔥 NOIZYLAB LIVE DASHBOARD 🔥

clear
while true; do
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║        🔥 NOIZYLAB LIVE DASHBOARD 🔥                     ║"
    echo "║        $(date '+%Y-%m-%d %H:%M:%S')                              ║"
    echo "╠══════════════════════════════════════════════════════════╣"
    
    cd /Users/m2ultra/NOIZYLAB/backend
    python3 nlctl.py status 2>/dev/null | while read line; do
        printf "║  %-56s ║\n" "$line"
    done
    
    echo "╠══════════════════════════════════════════════════════════╣"
    echo "║  CRITICAL VOLUMES:                                       ║"
    df -h | grep -E "99%|98%|97%|96%|95%" | head -3 | while read line; do
        name=$(echo "$line" | awk '{print $NF}' | xargs basename 2>/dev/null)
        pct=$(echo "$line" | awk '{print $5}')
        printf "║  ⚠️  %-20s %s                          ║\n" "$name" "$pct"
    done
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "Press Ctrl+C to exit | Refreshing in 30s..."
    sleep 30
    clear
done
