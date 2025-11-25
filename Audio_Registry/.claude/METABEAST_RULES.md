# METABEAST_CC - Claude Code Rules

## AI Assistant Guidelines for METABEAST_CC Development

This file provides persistent context for Claude Code when working on this project.

---

## Project Identity

```yaml
name: METABEAST_CC
fullName: Audio Canon Command Center
owner: Rob (Fish Music Inc. / MissionControl96 / NOIZYLAB)
version: 1.0.0
```

---

## CRITICAL NAMING RULES

### ALWAYS Capitalize

| Term | Usage |
|------|-------|
| METABEAST_CC | Project name - NEVER lowercase |
| NOIZY | Brand - NEVER "Noizy" or "noizy" |
| NOIZYLAB | Brand - NEVER "NoizyLab" |
| MissionControl96 | Product - Exact casing |

### Product Names

- Use FULL official names (e.g., "FabFilter Pro-Q 3" not "Pro-Q")
- Include developer name when referencing
- Match official capitalization

---

## FILE STRUCTURE

```
Audio_Registry/
├── data/           # catalog.yaml, index.json
├── manifests/      # Category manifests
├── integrations/   # Dashboard, HA, Node-RED configs
├── templates/      # Kontakt, etc.
├── tools/          # CLI and scripts
├── snapshots/      # Backups (gitignored contents)
├── checksums/      # MD5 files
├── RULES.md        # Hard rules (READ FIRST)
├── CONTRIBUTING.md # How to contribute
├── CHANGELOG.md    # Version history
└── README.md       # Documentation
```

---

## SCHEMA REQUIREMENTS

### Required Fields (EVERY item)

```yaml
name: string      # Full product name
type: enum        # daw | plugin | instrument | ai_model
category: enum    # See approved list
developer: string # Full company name
```

### Item ID Format

```
{type_prefix}-{number:03d}

daw-001, daw-002, ...
plug-001, plug-002, ...
inst-001, inst-002, ...
ai-001, ai-002, ...
```

---

## VALIDATION COMMANDS

Always run before suggesting commits:

```bash
python3 tools/validate_schema.py --strict
python3 tools/audit/run_audit.py
```

---

## COMMIT FORMAT

```
{type}: {description}

Types: feat, fix, docs, data, tools, config
```

---

## PROHIBITED ACTIONS

- Lowercase METABEAST_CC, NOIZY, NOIZYLAB
- Skip schema validation
- Commit secrets/API keys
- Use HTTP URLs (HTTPS only)
- Delete items without deprecation
- Reuse deleted itemIds
- Use tabs (spaces only, 2-space indent)

---

## WHEN ADDING ITEMS

1. Get next available itemId
2. Include ALL required fields
3. Verify URLs are HTTPS and working
4. Use approved categories/formats/os values
5. Run validation before commit

---

## WHEN MODIFYING TOOLS

1. Keep header comment block
2. Add/update docstrings
3. Follow PEP 8 style
4. Test with `--help` flag
5. Update README if user-facing

---

## HELPFUL COMMANDS

```bash
# Search catalog
./tools/audiocat search "reverb"

# List items
./tools/audiocat list --type plugin --category eq

# Add item
./tools/audiocat add --name "..." --type plugin ...

# Run audit
./tools/audiocat audit --verbose

# Export
./tools/audiocat export --output data/index.json

# Create snapshot
python3 tools/snapshot.py create
```

---

## ACCESSIBILITY REQUIREMENTS

- 48px minimum touch targets
- WCAG AA color contrast
- Support: keyboard, screen reader, voice, gaze, switch
- Never use color alone for meaning

---

## INTEGRATION PATTERNS

### MissionControl96
- Reads from `data/index.json`
- Requires: meta.itemCount, stats.*, items[]

### Home Assistant
- Sensor naming: `sensor.audio_catalog_{metric}`
- REST sensors poll JSON endpoints

### Node-RED
- Flow ID prefix: `audio-catalog-`
- Scheduled automations for audit/export/backup

---

## QUICK REFERENCE

| Task | Command |
|------|---------|
| Validate | `python3 tools/validate_schema.py` |
| Audit | `python3 tools/audit/run_audit.py` |
| Export JSON | `python3 tools/export/export_index.py` |
| Add item | `./tools/audiocat add --name "..." ...` |
| Search | `./tools/audiocat search "query"` |
| Snapshot | `python3 tools/snapshot.py create` |

---

**Remember: Read RULES.md for complete guidelines.**
