#!/usr/bin/env python3
"""
⚙️ PIPELINE MANAGER - Orchestrate Diagnostic Pipeline
Fish Music Inc - CB_01
🔥 GORUNFREE! 🎸🔥
"""

from engines.diagnostics_engine import run_diagnostics
from engines.foresight_engine import predict_failures
from engines.report_engine import generate_report
from engines.pricing_engine import estimate_price

def run_full_pipeline(device_data: dict):
    """
    Run complete diagnostic + prediction + pricing pipeline
    """
    print("⚙️ Running full Noizy.AI pipeline...")
    
    # Step 1: Diagnostics
    print("[1/4] Running diagnostics...")
    diagnostics = run_diagnostics(device_data)
    
    # Step 2: Predictions
    print("[2/4] Predicting failures...")
    predictions = predict_failures(device_data)
    
    # Step 3: Pricing
    print("[3/4] Calculating pricing...")
    pricing = estimate_price({
        "issues": diagnostics.get("issues", []),
        "urgency": device_data.get("urgency", "normal")
    })
    
    # Step 4: Report
    print("[4/4] Generating report...")
    report = generate_report({
        "session_id": device_data.get("session_id"),
        "diagnostics": diagnostics,
        "prediction": predictions
    })
    
    result = {
        "pipeline_complete": True,
        "diagnostics": diagnostics,
        "predictions": predictions,
        "pricing": pricing,
        "report": report
    }
    
    print("✅ Pipeline complete!")
    
    return result
