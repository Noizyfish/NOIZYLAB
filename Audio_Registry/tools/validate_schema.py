#!/usr/bin/env python3
# ==============================================================================
# METABEAST_CC - Schema Validation Tool
# ==============================================================================
# Validate catalog entries against schema definition
# Fish Music Inc. / MissionControl96 / NOIZYLAB
# ==============================================================================

import yaml
import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

# ==============================================================================
# CONFIGURATION
# ==============================================================================

REGISTRY_ROOT = Path(__file__).parent.parent
DATA_DIR = REGISTRY_ROOT / "data"
CATALOG_FILE = DATA_DIR / "catalog.yaml"

# ==============================================================================
# SCHEMA DEFINITION - METABEAST_CC
# ==============================================================================

SCHEMA = {
    "item": {
        "required": ["name", "type", "category", "developer"],
        "optional": ["itemId", "format", "os", "minVersion", "releaseYear",
                     "status", "urls", "tags", "notes"],
        "types": {
            "name": str,
            "type": ["daw", "plugin", "instrument", "ai_model"],
            "category": ["daw", "synth", "sampler", "drum", "orchestral",
                        "eq", "compressor", "reverb", "delay", "saturation",
                        "pitch", "spectral", "utility", "hybrid", "limiter",
                        "multiband", "channel-strip", "metering", "modulation",
                        "gate", "exciter", "stereo", "noise_reduction",
                        "stem_separation", "transcription", "voice"],
            "developer": str,
            "itemId": str,
            "format": list,
            "os": list,
            "minVersion": str,
            "releaseYear": int,
            "status": ["active", "legacy", "discontinued", "beta"],
            "urls": dict,
            "tags": list,
            "notes": str
        },
        "formats_allowed": ["VST2", "VST3", "AU", "AAX", "CLAP", "Standalone",
                           "AUv3", "RTAS", "Kontakt", "UAD"],
        "os_allowed": ["macOS", "Windows", "Linux", "iOS", "Web"]
    }
}

# ==============================================================================
# COLORS
# ==============================================================================

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

# ==============================================================================
# VALIDATION CLASSES
# ==============================================================================

@dataclass
class ValidationError:
    item_id: str
    item_name: str
    field: str
    message: str
    severity: str  # error, warning, info

class Validator:
    def __init__(self, schema: Dict):
        self.schema = schema
        self.errors: List[ValidationError] = []
        self.warnings: List[ValidationError] = []

    def validate_item(self, item: Dict, index: int) -> bool:
        """Validate a single catalog item."""
        item_id = item.get("itemId", f"item-{index}")
        item_name = item.get("name", "UNKNOWN")
        item_schema = self.schema["item"]
        is_valid = True

        # Check required fields
        for field in item_schema["required"]:
            if field not in item or not item[field]:
                self.errors.append(ValidationError(
                    item_id=item_id,
                    item_name=item_name,
                    field=field,
                    message=f"Missing required field: {field}",
                    severity="error"
                ))
                is_valid = False

        # Check field types
        for field, value in item.items():
            if field in item_schema["types"]:
                expected = item_schema["types"][field]

                # Enum validation
                if isinstance(expected, list):
                    if value not in expected:
                        self.errors.append(ValidationError(
                            item_id=item_id,
                            item_name=item_name,
                            field=field,
                            message=f"Invalid value '{value}'. Expected one of: {expected}",
                            severity="error"
                        ))
                        is_valid = False

                # Type validation
                elif expected == str and not isinstance(value, str):
                    self.errors.append(ValidationError(
                        item_id=item_id,
                        item_name=item_name,
                        field=field,
                        message=f"Expected string, got {type(value).__name__}",
                        severity="error"
                    ))
                    is_valid = False

                elif expected == int and not isinstance(value, int):
                    self.errors.append(ValidationError(
                        item_id=item_id,
                        item_name=item_name,
                        field=field,
                        message=f"Expected integer, got {type(value).__name__}",
                        severity="error"
                    ))
                    is_valid = False

                elif expected == list and not isinstance(value, list):
                    self.errors.append(ValidationError(
                        item_id=item_id,
                        item_name=item_name,
                        field=field,
                        message=f"Expected list, got {type(value).__name__}",
                        severity="error"
                    ))
                    is_valid = False

                elif expected == dict and not isinstance(value, dict):
                    self.errors.append(ValidationError(
                        item_id=item_id,
                        item_name=item_name,
                        field=field,
                        message=f"Expected dict, got {type(value).__name__}",
                        severity="error"
                    ))
                    is_valid = False

        # Validate format values
        if "format" in item and isinstance(item["format"], list):
            for fmt in item["format"]:
                if fmt not in item_schema["formats_allowed"]:
                    self.warnings.append(ValidationError(
                        item_id=item_id,
                        item_name=item_name,
                        field="format",
                        message=f"Non-standard format: {fmt}",
                        severity="warning"
                    ))

        # Validate OS values
        if "os" in item and isinstance(item["os"], list):
            for os_name in item["os"]:
                if os_name not in item_schema["os_allowed"]:
                    self.warnings.append(ValidationError(
                        item_id=item_id,
                        item_name=item_name,
                        field="os",
                        message=f"Non-standard OS: {os_name}",
                        severity="warning"
                    ))

        # Validate year range
        if "releaseYear" in item:
            year = item["releaseYear"]
            if year < 1980 or year > 2030:
                self.warnings.append(ValidationError(
                    item_id=item_id,
                    item_name=item_name,
                    field="releaseYear",
                    message=f"Unusual year: {year}",
                    severity="warning"
                ))

        # Check for recommended fields
        recommended = ["format", "os", "releaseYear", "status"]
        for field in recommended:
            if field not in item:
                self.warnings.append(ValidationError(
                    item_id=item_id,
                    item_name=item_name,
                    field=field,
                    message=f"Missing recommended field: {field}",
                    severity="info"
                ))

        return is_valid

    def validate_catalog(self, catalog: Dict) -> bool:
        """Validate entire catalog."""
        items = catalog.get("items", [])
        all_valid = True
        item_ids = set()

        for i, item in enumerate(items):
            if not self.validate_item(item, i):
                all_valid = False

            # Check for duplicate IDs
            item_id = item.get("itemId")
            if item_id:
                if item_id in item_ids:
                    self.errors.append(ValidationError(
                        item_id=item_id,
                        item_name=item.get("name", "UNKNOWN"),
                        field="itemId",
                        message=f"Duplicate itemId: {item_id}",
                        severity="error"
                    ))
                    all_valid = False
                item_ids.add(item_id)

        return all_valid

    def print_report(self):
        """Print validation report."""
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}  METABEAST_CC - Schema Validation Report{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.END}\n")

        if not self.errors and not self.warnings:
            print(f"{Colors.GREEN}{Colors.BOLD}All items valid!{Colors.END}")
            return

        if self.errors:
            print(f"{Colors.RED}{Colors.BOLD}ERRORS ({len(self.errors)}):{Colors.END}")
            print(f"{Colors.RED}{'─'*60}{Colors.END}")
            for err in self.errors:
                print(f"  [{err.item_id}] {err.item_name}")
                print(f"    {Colors.RED}✗{Colors.END} {err.field}: {err.message}")
            print()

        if self.warnings:
            print(f"{Colors.YELLOW}{Colors.BOLD}WARNINGS ({len(self.warnings)}):{Colors.END}")
            print(f"{Colors.YELLOW}{'─'*60}{Colors.END}")
            for warn in self.warnings[:20]:  # Limit to first 20
                print(f"  [{warn.item_id}] {warn.item_name}")
                print(f"    {Colors.YELLOW}!{Colors.END} {warn.field}: {warn.message}")
            if len(self.warnings) > 20:
                print(f"  ... and {len(self.warnings) - 20} more warnings")
            print()

        # Summary
        print(f"{Colors.BOLD}SUMMARY:{Colors.END}")
        print(f"  Errors:   {Colors.RED}{len(self.errors)}{Colors.END}")
        print(f"  Warnings: {Colors.YELLOW}{len(self.warnings)}{Colors.END}")

        if self.errors:
            print(f"\n{Colors.RED}Validation FAILED{Colors.END}")
        else:
            print(f"\n{Colors.GREEN}Validation PASSED (with warnings){Colors.END}")

    def export_report(self, output_path: str):
        """Export validation report to JSON."""
        report = {
            "valid": len(self.errors) == 0,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "errors": [
                {
                    "item_id": e.item_id,
                    "item_name": e.item_name,
                    "field": e.field,
                    "message": e.message
                }
                for e in self.errors
            ],
            "warnings": [
                {
                    "item_id": w.item_id,
                    "item_name": w.item_name,
                    "field": w.field,
                    "message": w.message
                }
                for w in self.warnings
            ]
        }

        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)

        print(f"{Colors.GREEN}Report exported to: {output_path}{Colors.END}")


# ==============================================================================
# MAIN
# ==============================================================================

def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="METABEAST_CC - Validate catalog schema"
    )
    parser.add_argument("--catalog", "-c", type=str, default=str(CATALOG_FILE),
                       help="Path to catalog.yaml")
    parser.add_argument("--export", "-e", type=str,
                       help="Export report to JSON file")
    parser.add_argument("--strict", "-s", action="store_true",
                       help="Treat warnings as errors")

    args = parser.parse_args()

    # Load catalog
    catalog_path = Path(args.catalog)
    if not catalog_path.exists():
        print(f"{Colors.RED}Catalog not found: {catalog_path}{Colors.END}")
        sys.exit(1)

    with open(catalog_path, 'r') as f:
        catalog = yaml.safe_load(f)

    # Validate
    validator = Validator(SCHEMA)
    is_valid = validator.validate_catalog(catalog)

    # Print report
    validator.print_report()

    # Export if requested
    if args.export:
        validator.export_report(args.export)

    # Exit code
    if args.strict and (validator.errors or validator.warnings):
        sys.exit(1)
    elif validator.errors:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
