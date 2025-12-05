# Fish Music

> Music production workflow management for NOIZYLAB

## Quick Start

```bash
# Create new session
python tools/new_session.py --project GORUNFREE --date 2024-12-04

# Validate repository
python tools/validate_repo.py
```

## Structure

| Directory | Purpose |
|-----------|---------|
| `docs/` | Vision, naming conventions, workflows |
| `manifests/` | Storage maps, session logs |
| `metadata/` | CSV databases (sessions, tracks) |
| `tools/` | Python automation scripts |

## Session Naming

```
FM_<PROJECT>_<YYYY-MM-DD>_S<##>.md
```

Example: `FM_GORUNFREE_2024-12-04_S01.md`

## Workflow

1. Create session manifest
2. Log work in session file
3. Update metadata CSVs
4. Commit with semantic message

## Storage

- **Local**: M2ULTRA SSD (active projects)
- **Archive**: 12TB external (completed sessions)
- **Backup**: Google Drive (metadata only)
