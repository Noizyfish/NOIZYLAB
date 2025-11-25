# Contributing to METABEAST_CC

## Welcome, Build Team

This document outlines how to contribute to METABEAST_CC. **Read RULES.md first** - it contains mandatory guidelines.

---

## Quick Reference

### Before You Start

```bash
# 1. Read the rules
cat RULES.md

# 2. Set up environment
pip install -r requirements.txt

# 3. Verify setup
python3 tools/validate_schema.py
python3 tools/audit/run_audit.py
```

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes
# ... edit files ...

# 3. Validate
python3 tools/validate_schema.py --strict
python3 tools/audit/run_audit.py

# 4. Commit
git add -A
git commit -m "feat: Description of changes"

# 5. Push
git push -u origin feature/your-feature-name

# 6. Create PR
# Request review from team
```

---

## Adding Catalog Items

### Single Item (CLI)

```bash
./tools/audiocat add \
  --name "Product Name" \
  --type plugin \
  --category reverb \
  --developer "Developer Name" \
  --format VST3 AU AAX \
  --os macOS Windows \
  --releaseYear 2024 \
  --status active \
  --tags "tag1" "tag2" \
  --url "https://developer.com/product"
```

### Multiple Items (CSV)

```bash
# 1. Prepare CSV (see data/sample_import.csv for format)
# 2. Import
python3 tools/ingest/add_items.py --csv your_items.csv
```

### Manual Edit

```yaml
# Add to data/catalog.yaml under items:
- itemId: plug-XXX  # Get next available ID
  name: "Product Name"
  type: plugin
  category: reverb
  developer: "Developer Name"
  format: [VST3, AU, AAX]
  os: [macOS, Windows]
  releaseYear: 2024
  status: active
  tags: [algorithmic, lush]
  urls:
    home: "https://developer.com/product"
  notes: "Optional notes"
```

---

## Adding Manifests

### Structure

```
manifests/
├── {Category}/
│   └── {CATEGORY}_MANIFEST.yaml
```

### Template

```yaml
# ==============================================================================
# METABEAST_CC - {CATEGORY} MANIFEST
# ==============================================================================
# Description of this manifest
# Fish Music Inc. / MissionControl96 / NOIZYLAB
# ==============================================================================

meta:
  manifestName: {Category Name}
  version: 1.0.0
  generatedAt: {YYYY-MM-DD}
  totalItems: {count}

# Your content here...
```

---

## Adding Tools

### Location

```
tools/
├── {tool_name}.py      # Standalone tools
├── {category}/         # Grouped tools
│   └── {tool_name}.py
```

### Template

```python
#!/usr/bin/env python3
# ==============================================================================
# METABEAST_CC - {Tool Name}
# ==============================================================================
# Description
# Fish Music Inc. / MissionControl96 / NOIZYLAB
# ==============================================================================

"""
Tool description and usage.
"""

def main():
    """Main entry point."""
    pass

if __name__ == "__main__":
    main()
```

### Requirements

- [ ] Shebang line
- [ ] Header comment block
- [ ] Docstrings
- [ ] Type hints (encouraged)
- [ ] Error handling
- [ ] argparse for CLI

---

## Updating Integrations

### MissionControl96 Dashboard

Edit: `integrations/missioncontrol96_dashboard.yaml`

```yaml
# Add new widgets to appropriate page
pages:
  - id: {page_id}
    widgets:
      - id: your-new-widget
        type: {widget_type}
        # ... config
```

### Home Assistant

Edit: `integrations/homeassistant.yaml`

```yaml
# Add new sensor
sensor:
  - platform: rest
    name: Audio Catalog {New Metric}
    # ... config
```

### Node-RED

Edit: `integrations/nodered_flows.json`

```json
// Add new node to existing flow
// Or create new flow with audio-catalog- prefix
```

---

## Validation Checklist

Before committing:

- [ ] `python3 tools/validate_schema.py --strict` passes
- [ ] `python3 tools/audit/run_audit.py` shows no errors
- [ ] New items have all required fields
- [ ] URLs are HTTPS and verified
- [ ] No duplicate itemIds
- [ ] Proper formatting (2-space indent)
- [ ] Follows naming conventions

---

## Commit Message Format

```
{type}: {description}

Types:
- feat:   New feature
- fix:    Bug fix
- docs:   Documentation
- data:   Catalog data
- tools:  Scripts/CLI
- config: Configuration
- style:  Formatting
- refactor: Code restructure
- test:   Testing
- chore:  Maintenance
```

### Examples

```bash
git commit -m "feat: Add Dolby Atmos support tracking"
git commit -m "data: Add 15 new reverb plugins"
git commit -m "fix: Correct Steinberg developer name"
git commit -m "tools: Add batch validation mode"
git commit -m "docs: Update README with new features"
```

---

## Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Data update

## Checklist
- [ ] Schema validation passes
- [ ] Audit runs clean
- [ ] Checksums generated (if applicable)
- [ ] README updated (if needed)
- [ ] CHANGELOG updated
- [ ] Tested locally

## Screenshots (if applicable)

## Notes
Any additional context
```

---

## Code Review Guidelines

### Reviewers Should Check

1. **Schema compliance** - All items valid
2. **Data quality** - Names correct, URLs working
3. **Code quality** - Follows standards
4. **Documentation** - Updated where needed
5. **Testing** - Validation passes

### Approval Requirements

- Minimum 1 approval for data changes
- Minimum 2 approvals for tool/schema changes
- Owner approval for breaking changes

---

## Release Process

### Version Bump

1. Update version in:
   - `setup.py`
   - `README.md` (stats section)
   - CLI tools (VERSION constant)

2. Update CHANGELOG.md

3. Create snapshot
   ```bash
   python3 tools/snapshot.py create --name "v{version}"
   ```

4. Tag release
   ```bash
   git tag -a v{version} -m "Release v{version}"
   git push origin v{version}
   ```

---

## Getting Help

- **Questions**: Open a discussion
- **Bugs**: Open an issue with reproduction steps
- **Features**: Open an issue with use case
- **Urgent**: Contact team lead directly

---

## Code of Conduct

- Be respectful
- Give constructive feedback
- Help others learn
- Follow the rules (RULES.md)
- Document your work

---

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   Welcome to the METABEAST_CC Build Team                         ║
║                                                                   ║
║   Build with precision. Document everything.                     ║
║   Follow the rules. Ship quality.                                ║
║                                                                   ║
║   Fish Music Inc. / MissionControl96 / NOIZYLAB                  ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```
