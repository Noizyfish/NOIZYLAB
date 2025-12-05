#!/usr/bin/env python3
"""Validate Fish Music repository structure and naming conventions.

Purpose: Ensure all files follow naming conventions and required structure exists.

Usage:
    python validate_repo.py [--fix]

Returns:
    0 if valid, 1 if errors found
"""

import csv
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent

REQUIRED_DIRS = [
    "docs",
    "manifests/sessions",
    "metadata",
    "tools",
    ".github/ISSUE_TEMPLATE",
    ".github/workflows",
]

REQUIRED_FILES = [
    "README.md",
    "docs/vision.md",
    "docs/naming.md",
    "docs/workflows.md",
    "docs/security.md",
    "metadata/sessions.csv",
    "metadata/tracklist.csv",
    ".gitignore",
]

SESSION_PATTERN = re.compile(r"^FM_[A-Z0-9]+_\d{4}-\d{2}-\d{2}_S\d{2}\.md$")


def check_structure() -> list[str]:
    """Check required directories and files exist."""
    errors = []

    for dir_path in REQUIRED_DIRS:
        full_path = REPO_ROOT / dir_path
        if not full_path.is_dir():
            errors.append(f"Missing directory: {dir_path}")

    for file_path in REQUIRED_FILES:
        full_path = REPO_ROOT / file_path
        if not full_path.is_file():
            errors.append(f"Missing file: {file_path}")

    return errors


def check_session_naming() -> list[str]:
    """Check session files follow naming convention."""
    errors = []
    sessions_dir = REPO_ROOT / "manifests" / "sessions"

    if not sessions_dir.exists():
        return errors

    for session_file in sessions_dir.glob("*.md"):
        if "TEMPLATE" in session_file.name:
            continue
        if not SESSION_PATTERN.match(session_file.name):
            errors.append(f"Invalid session name: {session_file.name}")

    return errors


def check_csv_integrity() -> list[str]:
    """Check CSV files are valid and have required columns."""
    errors = []

    sessions_csv = REPO_ROOT / "metadata" / "sessions.csv"
    if sessions_csv.exists():
        try:
            with open(sessions_csv) as f:
                reader = csv.DictReader(f)
                required = {"session_id", "project", "date", "status"}
                if not required.issubset(set(reader.fieldnames or [])):
                    errors.append(f"sessions.csv missing columns: {required}")
        except csv.Error as e:
            errors.append(f"sessions.csv parse error: {e}")

    tracklist_csv = REPO_ROOT / "metadata" / "tracklist.csv"
    if tracklist_csv.exists():
        try:
            with open(tracklist_csv) as f:
                reader = csv.DictReader(f)
                required = {"track_id", "project", "title", "status"}
                if not required.issubset(set(reader.fieldnames or [])):
                    errors.append(f"tracklist.csv missing columns: {required}")
        except csv.Error as e:
            errors.append(f"tracklist.csv parse error: {e}")

    return errors


def main() -> int:
    """Run all validation checks."""
    print("Validating Fish Music repository...\n")

    all_errors = []
    all_errors.extend(check_structure())
    all_errors.extend(check_session_naming())
    all_errors.extend(check_csv_integrity())

    if all_errors:
        print("ERRORS FOUND:\n")
        for error in all_errors:
            print(f"  - {error}")
        print(f"\nTotal: {len(all_errors)} errors")
        return 1

    print("All checks passed!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
