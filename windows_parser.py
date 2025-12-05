#!/usr/bin/env python3
"""
🪟 WINDOWS PARSER - Windows Event Viewer Analysis
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

def parse_windows_logs(data: dict):
    """
    Parse Windows Event Viewer logs
    """
    logs = data.get("logs", "")
    
    print("🪟 Parsing Windows logs...")
    
    parsed = {
        "event_critical": logs.count("CRITICAL"),
        "event_error": logs.count("ERROR"),
        "event_warning": logs.count("WARNING"),
        "blue_screens": logs.count("BSOD"),
        "driver_issues": logs.count("driver"),
        
        "issues_detected": []
    }
    
    # Analyze patterns
    if parsed["event_critical"] > 0:
        parsed["issues_detected"].append({
            "type": "critical_event",
            "count": parsed["event_critical"],
            "severity": "critical",
            "description": "Critical system events detected"
        })
    
    if parsed["blue_screens"] > 0:
        parsed["issues_detected"].append({
            "type": "bsod",
            "count": parsed["blue_screens"],
            "severity": "critical",
            "description": "Blue screen crashes detected"
        })
    
    if parsed["driver_issues"] > 5:
        parsed["issues_detected"].append({
            "type": "driver",
            "count": parsed["driver_issues"],
            "severity": "warning",
            "description": "Driver problems detected"
        })
    
    print(f"✅ Found {len(parsed['issues_detected'])} issues in Event Viewer")
    
    return parsed
