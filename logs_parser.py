#!/usr/bin/env python3
"""
📋 GENERIC LOGS PARSER - Universal Log Analysis
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

import re

def parse_generic_logs(data: dict):
    """
    Parse generic system logs
    """
    logs = data.get("logs", "")
    
    print("📋 Parsing generic logs...")
    
    parsed = {
        "error_count": len(re.findall(r'\berror\b', logs, re.IGNORECASE)),
        "warning_count": len(re.findall(r'\bwarning\b', logs, re.IGNORECASE)),
        "critical_count": len(re.findall(r'\bcritical\b', logs, re.IGNORECASE)),
        "fail_count": len(re.findall(r'\bfail(ed)?\b', logs, re.IGNORECASE)),
        
        "patterns": []
    }
    
    # Detect common patterns
    patterns = [
        (r'out of memory', 'memory_pressure'),
        (r'disk.*full', 'disk_full'),
        (r'network.*timeout', 'network_timeout'),
        (r'permission denied', 'permission_error'),
        (r'segmentation fault', 'crash'),
    ]
    
    for pattern, pattern_name in patterns:
        matches = len(re.findall(pattern, logs, re.IGNORECASE))
        if matches > 0:
            parsed["patterns"].append({
                "name": pattern_name,
                "count": matches
            })
    
    print(f"✅ Parsed logs: {parsed['error_count']} errors, {parsed['warning_count']} warnings")
    
    return parsed
