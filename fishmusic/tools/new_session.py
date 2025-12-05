#!/usr/bin/env python3
"""Create a new Fish Music session manifest.

Purpose: Generate session file with correct naming and template.

Usage:
    python new_session.py --project GORUNFREE [--date 2024-12-04]

Returns:
    Path to created session file
"""

import argparse
import csv
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SESSIONS_DIR = REPO_ROOT / "manifests" / "sessions"
SESSIONS_CSV = REPO_ROOT / "metadata" / "sessions.csv"

SESSION_TEMPLATE = """# {session_id}

## Session Info

| Field | Value |
|-------|-------|
| Project | {project} |
| Date | {date} |
| Duration | |
| DAW | |
| BPM | |
| Key | |

## Goals

- [ ] Goal 1
- [ ] Goal 2
- [ ] Goal 3

## Work Log

### {time} - Session Start

Notes...

## Files Created

| File | Type | Version | Notes |
|------|------|---------|-------|
| | | | |

## Decisions

- Decision 1: Rationale

## Next Session

- [ ] Task 1
- [ ] Task 2

## Notes

"""


def get_next_session_number(project: str, date: str) -> int:
    """Find next available session number for project/date."""
    pattern = f"FM_{project}_{date}_S*.md"
    existing = list(SESSIONS_DIR.glob(pattern))

    if not existing:
        return 1

    numbers = []
    for f in existing:
        try:
            num = int(f.stem.split("_S")[-1])
            numbers.append(num)
        except ValueError:
            continue

    return max(numbers) + 1 if numbers else 1


def create_session(project: str, date: str) -> Path:
    """Create new session file and update CSV."""
    project = project.upper()
    session_num = get_next_session_number(project, date)
    session_id = f"FM_{project}_{date}_S{session_num:02d}"

    # Create session file
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    session_path = SESSIONS_DIR / f"{session_id}.md"

    content = SESSION_TEMPLATE.format(
        session_id=session_id,
        project=project,
        date=date,
        time=datetime.now().strftime("%H:%M"),
    )

    session_path.write_text(content)

    # Update sessions.csv
    with open(SESSIONS_CSV, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([session_id, project, date, 0, "", "", "active", ""])

    print(f"Created: {session_path}")
    return session_path


def main():
    parser = argparse.ArgumentParser(description="Create new Fish Music session")
    parser.add_argument("--project", "-p", required=True, help="Project name")
    parser.add_argument(
        "--date",
        "-d",
        default=datetime.now().strftime("%Y-%m-%d"),
        help="Session date (YYYY-MM-DD)",
    )

    args = parser.parse_args()
    create_session(args.project, args.date)


if __name__ == "__main__":
    main()
