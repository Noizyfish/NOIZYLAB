#!/bin/bash
# 🔥 NOIZYLAB MASTER LAUNCHER 🔥

echo "🔥🔥🔥 NOIZYLAB CONTROL CENTER 🔥🔥🔥"
echo ""

cd /Users/m2ultra/NOIZYLAB/backend

case "$1" in
    pulse|p)
        python3 nlctl.py pulse
        ;;
    quick|q)
        python3 nlctl.py quick
        ;;
    volumes|v)
        python3 nlctl.py volumes
        ;;
    status|s)
        python3 nlctl.py status $2
        ;;
    note|n)
        python3 nlctl.py log-note "$2"
        ;;
    ai|a)
        python3 nlctl.py ai-summary --lines ${2:-80}
        ;;
    *)
        echo "NOIZYLAB COMMANDS:"
        echo "  pulse/p    - MC96 Status Pulse"
        echo "  quick/q    - Quick health check"
        echo "  volumes/v  - Show volumes"
        echo "  status/s   - Machine status"
        echo "  note/n     - Log a note"
        echo "  ai/a       - AI summary"
        echo ""
        python3 nlctl.py pulse
        ;;
esac
