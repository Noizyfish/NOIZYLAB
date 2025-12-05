#!/usr/bin/env python3
"""
🎯 NOIZYLAB Agent Dashboard
Real-time system monitoring dashboard
"""

import sys
import time
import curses
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from agent.flows.system_monitor import SystemMonitorFlow


class Dashboard:
    """Live system monitoring dashboard"""
    
    def __init__(self):
        self.monitor = SystemMonitorFlow()
        self.running = True
    
    def draw(self, stdscr):
        """Draw dashboard"""
        curses.curs_set(0)  # Hide cursor
        stdscr.nodelay(1)   # Non-blocking input
        stdscr.timeout(1000)  # 1 second refresh
        
        while self.running:
            stdscr.clear()
            height, width = stdscr.getmaxyx()
            
            try:
                health = self.monitor.get_system_health()
                
                # Header
                title = "🎯 NOIZYLAB AGENT DASHBOARD"
                stdscr.addstr(0, (width - len(title)) // 2, title, curses.A_BOLD)
                stdscr.addstr(1, (width - len(health['timestamp'])) // 2, health['timestamp'])
                stdscr.addstr(2, 0, "=" * width)
                
                row = 4
                
                # CPU Section
                stdscr.addstr(row, 2, "💻 CPU", curses.A_BOLD)
                row += 1
                cpu_usage = health['cpu']['overall']
                color = self._get_color(cpu_usage)
                stdscr.addstr(row, 4, f"Usage: {cpu_usage:.1f}%")
                stdscr.addstr(row, 25, self._create_bar(cpu_usage, 30))
                row += 1
                stdscr.addstr(row, 4, f"Cores: {health['cpu']['count']}")
                row += 2
                
                # Memory Section
                stdscr.addstr(row, 2, "🧠 MEMORY", curses.A_BOLD)
                row += 1
                mem_pct = health['memory']['percent']
                stdscr.addstr(row, 4, f"Usage: {mem_pct:.1f}%")
                stdscr.addstr(row, 25, self._create_bar(mem_pct, 30))
                row += 1
                stdscr.addstr(row, 4, f"Used: {health['memory']['used_gb']:.1f} GB / {health['memory']['total_gb']:.1f} GB")
                row += 2
                
                # Disk Section
                stdscr.addstr(row, 2, "💾 DISKS", curses.A_BOLD)
                row += 1
                
                important_disks = {k: v for k, v in health['disk'].items() 
                                 if any(x in k for x in ['/', '6TB', '12TB', 'MAG'])}
                
                for mount, stats in list(important_disks.items())[:5]:
                    if row >= height - 5:
                        break
                    
                    disk_name = mount if len(mount) < 25 else mount[:22] + "..."
                    stdscr.addstr(row, 4, disk_name)
                    stdscr.addstr(row, 30, f"{stats['percent']:.1f}%")
                    stdscr.addstr(row, 40, self._create_bar(stats['percent'], 20))
                    row += 1
                
                row += 1
                
                # Alerts Section
                alerts = self.monitor.check_alerts()
                if alerts and row < height - 3:
                    stdscr.addstr(row, 2, "⚠️  ALERTS", curses.A_BOLD)
                    row += 1
                    for alert in alerts[:3]:
                        if row >= height - 2:
                            break
                        alert_text = alert[:width-6] if len(alert) > width-6 else alert
                        stdscr.addstr(row, 4, alert_text)
                        row += 1
                
                # Footer
                stdscr.addstr(height-1, 2, "Press 'q' to quit | Refreshing every 1s...")
                
                stdscr.refresh()
                
                # Check for quit
                key = stdscr.getch()
                if key == ord('q') or key == ord('Q'):
                    self.running = False
                
            except Exception as e:
                stdscr.addstr(row, 0, f"Error: {str(e)}")
                stdscr.refresh()
                time.sleep(1)
    
    def _create_bar(self, percent, width):
        """Create progress bar"""
        filled = int(percent / 100 * width)
        bar = "█" * filled + "░" * (width - filled)
        return bar
    
    def _get_color(self, percent):
        """Get color based on percentage"""
        if percent < 50:
            return curses.COLOR_GREEN
        elif percent < 80:
            return curses.COLOR_YELLOW
        else:
            return curses.COLOR_RED
    
    def run(self):
        """Run dashboard"""
        try:
            curses.wrapper(self.draw)
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    print("🎯 Starting NOIZYLAB Agent Dashboard...")
    dashboard = Dashboard()
    dashboard.run()
