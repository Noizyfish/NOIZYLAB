#!/usr/bin/env python3
"""
🍎 MAC PARSER - macOS Log Analysis
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

def parse_mac_logs(data: dict):
    """
    Parse macOS system logs for issues
    """
    logs = data.get("logs", "")
    
    print("🍎 Parsing macOS logs...")
    
    parsed = {
        "kernel_panics": logs.count("panic"),
        "disk_errors": logs.count("I/O error"),
        "thermal_events": logs.count("thermal"),
        "permission_errors": logs.count("Operation not permitted"),
        "network_errors": logs.count("network"),
        
        "issues_detected": []
    }
    
    # Analyze patterns
    if parsed["kernel_panics"] > 0:
        parsed["issues_detected"].append({
            "type": "kernel_panic",
            "count": parsed["kernel_panics"],
            "severity": "critical",
            "description": "System crashes detected"
        })
    
    if parsed["disk_errors"] > 5:
        parsed["issues_detected"].append({
            "type": "disk_error",
            "count": parsed["disk_errors"],
            "severity": "warning",
            "description": "Disk I/O errors detected"
        })
    
    if parsed["thermal_events"] > 10:
        parsed["issues_detected"].append({
            "type": "thermal",
            "count": parsed["thermal_events"],
            "severity": "warning",
            "description": "Thermal throttling events"
        })
    
    print(f"✅ Found {len(parsed['issues_detected'])} issues in logs")
    
    return parsed
