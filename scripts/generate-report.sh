#!/bin/bash
#===============================================================================
# NOIZYLAB HTML REPORT GENERATOR
# Generate beautiful, comprehensive HTML reports
#===============================================================================

set -e

# Configuration
OUTPUT_DIR="${1:-$HOME/.noizylab/reports}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$OUTPUT_DIR/noizylab_report_$TIMESTAMP.html"

# Create output directory
mkdir -p "$OUTPUT_DIR"

#===============================================================================
# DATA COLLECTION
#===============================================================================

get_volume_data() {
    local volumes=("/Volumes/12TB" "/Volumes/4TBSG" "/Users/m2ultra/NOIZYLAB")
    for vol in "${volumes[@]}"; do
        if [ -d "$vol" ]; then
            local info=$(df -k "$vol" 2>/dev/null | tail -1)
            local total=$(echo "$info" | awk '{print $2}')
            local used=$(echo "$info" | awk '{print $3}')
            local pct=$((used * 100 / total))
            echo "$vol|$total|$used|$pct|mounted"
        else
            echo "$vol|0|0|0|unmounted"
        fi
    done
}

get_agent_data() {
    for plist in "$HOME/Library/LaunchAgents"/com.noizylab.*.plist; do
        if [ -f "$plist" ]; then
            local name=$(basename "$plist" .plist)
            local status="inactive"
            launchctl list 2>/dev/null | grep -q "$name" && status="active"
            echo "$name|$status"
        fi
    done
}

get_code_stats() {
    local base="/Users/m2ultra/NOIZYLAB"
    if [ -d "$base" ]; then
        find "$base" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" \) \
            -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | \
            sed 's/.*\.//' | sort | uniq -c | sort -rn | head -10
    fi
}

#===============================================================================
# HTML GENERATION
#===============================================================================

generate_html() {
    cat > "$REPORT_FILE" << 'HTMLHEAD'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NOIZYLAB System Report</title>
    <style>
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #21262d;
            --text-primary: #c9d1d9;
            --text-secondary: #8b949e;
            --accent-blue: #58a6ff;
            --accent-green: #3fb950;
            --accent-yellow: #d29922;
            --accent-red: #f85149;
            --accent-purple: #a371f7;
            --border-color: #30363d;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            padding: 40px 0;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 40px;
        }

        h1 {
            font-size: 3rem;
            background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }

        .subtitle {
            color: var(--text-secondary);
            font-size: 1.2rem;
        }

        .timestamp {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin-top: 10px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }

        .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--border-color);
        }

        .card-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }

        .card-title {
            font-size: 1.3rem;
            font-weight: 600;
        }

        .volume-item {
            display: flex;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .volume-item:last-child {
            border-bottom: none;
        }

        .volume-status {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 15px;
        }

        .volume-status.mounted { background: var(--accent-green); }
        .volume-status.unmounted { background: var(--accent-red); }

        .volume-info {
            flex: 1;
        }

        .volume-name {
            font-weight: 600;
            margin-bottom: 5px;
        }

        .volume-path {
            color: var(--text-secondary);
            font-size: 0.85rem;
            font-family: monospace;
        }

        .progress-bar {
            height: 8px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }

        .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .progress-fill.low { background: var(--accent-green); }
        .progress-fill.medium { background: var(--accent-yellow); }
        .progress-fill.high { background: var(--accent-red); }

        .agent-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .agent-item:last-child { border-bottom: none; }

        .agent-name {
            font-weight: 500;
        }

        .agent-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .agent-badge.active {
            background: rgba(63, 185, 80, 0.2);
            color: var(--accent-green);
        }

        .agent-badge.inactive {
            background: rgba(139, 148, 158, 0.2);
            color: var(--text-secondary);
        }

        .stat-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }

        .stat-item {
            background: var(--bg-tertiary);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--accent-blue);
        }

        .stat-label {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin-top: 5px;
        }

        .lang-bar {
            display: flex;
            align-items: center;
            padding: 8px 0;
        }

        .lang-name {
            width: 100px;
            font-weight: 500;
        }

        .lang-bar-container {
            flex: 1;
            height: 20px;
            background: var(--bg-tertiary);
            border-radius: 4px;
            overflow: hidden;
            margin: 0 15px;
        }

        .lang-bar-fill {
            height: 100%;
            border-radius: 4px;
        }

        .lang-count {
            width: 60px;
            text-align: right;
            color: var(--text-secondary);
        }

        .schedule-table {
            width: 100%;
            border-collapse: collapse;
        }

        .schedule-table th,
        .schedule-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        .schedule-table th {
            color: var(--text-secondary);
            font-weight: 500;
            font-size: 0.85rem;
            text-transform: uppercase;
        }

        footer {
            text-align: center;
            padding: 40px 0;
            margin-top: 40px;
            border-top: 1px solid var(--border-color);
            color: var(--text-secondary);
        }

        .footer-logo {
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }

        @media (max-width: 768px) {
            .grid { grid-template-columns: 1fr; }
            .stat-grid { grid-template-columns: 1fr; }
            h1 { font-size: 2rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>NOIZYLAB</h1>
            <p class="subtitle">System Health & Status Report</p>
HTMLHEAD

    echo "            <p class=\"timestamp\">Generated: $(date '+%Y-%m-%d %H:%M:%S')</p>"
    echo "        </header>"

    # Volumes Section
    cat >> "$REPORT_FILE" << 'VOLUMES'
        <div class="grid">
            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: rgba(88, 166, 255, 0.2);">💾</div>
                    <h2 class="card-title">Storage Volumes</h2>
                </div>
VOLUMES

    # Add volume data
    while IFS='|' read -r path total used pct status; do
        local name=$(basename "$path")
        local status_class="mounted"
        [ "$status" = "unmounted" ] && status_class="unmounted"

        local fill_class="low"
        [ "$pct" -gt 60 ] && fill_class="medium"
        [ "$pct" -gt 80 ] && fill_class="high"

        local total_h="N/A"
        local used_h="N/A"
        if [ "$total" -gt 0 ]; then
            total_h=$(echo "scale=1; $total/1048576" | bc)" GB"
            used_h=$(echo "scale=1; $used/1048576" | bc)" GB"
        fi

        cat >> "$REPORT_FILE" << EOF
                <div class="volume-item">
                    <div class="volume-status $status_class"></div>
                    <div class="volume-info">
                        <div class="volume-name">$name</div>
                        <div class="volume-path">$path</div>
                        <div class="progress-bar">
                            <div class="progress-fill $fill_class" style="width: ${pct}%"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.85rem; color: var(--text-secondary);">
                            <span>$used_h used</span>
                            <span>$total_h total</span>
                        </div>
                    </div>
                </div>
EOF
    done < <(get_volume_data)

    echo "            </div>" >> "$REPORT_FILE"

    # Agents Section
    cat >> "$REPORT_FILE" << 'AGENTS'
            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: rgba(210, 153, 34, 0.2);">⚡</div>
                    <h2 class="card-title">Automation Agents</h2>
                </div>
AGENTS

    while IFS='|' read -r name status; do
        local display_name="${name#com.noizylab.}"
        local badge_class="inactive"
        [ "$status" = "active" ] && badge_class="active"

        cat >> "$REPORT_FILE" << EOF
                <div class="agent-item">
                    <span class="agent-name">$display_name</span>
                    <span class="agent-badge $badge_class">$status</span>
                </div>
EOF
    done < <(get_agent_data)

    echo "            </div>" >> "$REPORT_FILE"
    echo "        </div>" >> "$REPORT_FILE"

    # Stats Section
    local file_count=$(find /Users/m2ultra/NOIZYLAB -type f 2>/dev/null | wc -l | tr -d ' ')
    local dir_count=$(find /Users/m2ultra/NOIZYLAB -type d 2>/dev/null | wc -l | tr -d ' ')
    local git_count=$(find /Users/m2ultra/NOIZYLAB -name ".git" -type d 2>/dev/null | wc -l | tr -d ' ')
    local total_size=$(du -sh /Users/m2ultra/NOIZYLAB 2>/dev/null | cut -f1 || echo "N/A")

    cat >> "$REPORT_FILE" << EOF
        <div class="grid">
            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: rgba(63, 185, 80, 0.2);">📊</div>
                    <h2 class="card-title">Quick Statistics</h2>
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <div class="stat-value">$file_count</div>
                        <div class="stat-label">Total Files</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">$dir_count</div>
                        <div class="stat-label">Directories</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">$git_count</div>
                        <div class="stat-label">Git Repos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">$total_size</div>
                        <div class="stat-label">Total Size</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: rgba(163, 113, 247, 0.2);">🗓️</div>
                    <h2 class="card-title">Agent Schedule</h2>
                </div>
                <table class="schedule-table">
                    <tr><th>Agent</th><th>Schedule</th></tr>
                    <tr><td>Volume Monitor</td><td>Every 5 minutes</td></tr>
                    <tr><td>Backup</td><td>Daily at 2:00 AM</td></tr>
                    <tr><td>Sync</td><td>Every hour</td></tr>
                    <tr><td>Integrity Check</td><td>Sunday at 3:00 AM</td></tr>
                    <tr><td>Security Scan</td><td>Saturday at 4:00 AM</td></tr>
                    <tr><td>Git Fetch</td><td>Monday at 6:00 AM</td></tr>
                    <tr><td>Permission Fix</td><td>Wednesday at 4:00 AM</td></tr>
                </table>
            </div>
        </div>

        <footer>
            <div class="footer-logo">NOIZYLAB</div>
            <p>Ultimate Code Management Toolkit v2.0</p>
            <p style="margin-top: 10px;">Report generated at $(date '+%Y-%m-%d %H:%M:%S')</p>
        </footer>
    </div>
</body>
</html>
EOF

    echo "Report generated: $REPORT_FILE"

    # Open in browser if on macOS
    if command -v open &>/dev/null; then
        open "$REPORT_FILE"
    fi
}

generate_html
