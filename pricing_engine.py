#!/usr/bin/env python3
"""
💰 PRICING ENGINE - Smart Quote Generation
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

def estimate_price(data: dict):
    """
    Calculate fair, transparent pricing
    """
    issues = data.get("issues", [])
    device_type = data.get("device_type", "laptop")
    urgency = data.get("urgency", "normal")
    
    print(f"💰 Calculating price for {len(issues)} issues")
    
    # Base pricing
    base_price = 79  # Basic diagnostic + tune-up
    
    # Add costs per issue category
    for issue in issues:
        category = issue.get("category", "")
        severity = issue.get("severity", "info")
        
        if severity == "critical":
            base_price += 50
        elif severity == "warning":
            base_price += 20
        elif severity == "info":
            base_price += 10
        
        # Specific categories
        if category == "storage":
            base_price += 15
        elif category == "thermal":
            base_price += 30
        elif category == "malware":
            base_price += 40
    
    # Urgency fee
    urgency_fee = 0
    if urgency == "high":
        urgency_fee = 30
    elif urgency == "emergency":
        urgency_fee = 50
    
    total = base_price + urgency_fee
    
    # Estimate time
    estimated_minutes = 20
    for issue in issues:
        estimated_minutes += issue.get("fix_time_minutes", 5)
    
    quote = {
        "quote_id": f"Q{int(datetime.now().timestamp())}",
        "total": total,
        "currency": "CAD",
        "breakdown": {
            "diagnostic": 0,  # Free diagnostic
            "labor": base_price,
            "parts": 0,
            "urgency_fee": urgency_fee
        },
        "estimated_time_minutes": estimated_minutes,
        "guarantee_days": 7,
        "expires_at": datetime.now().isoformat()
    }
    
    print(f"✅ Quote generated: ${total} CAD ({estimated_minutes} min)")
    
    return quote

from datetime import datetime
