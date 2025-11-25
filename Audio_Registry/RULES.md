# METABEAST_CC - HARD RULES

```
██╗  ██╗ █████╗ ██████╗ ██████╗     ██████╗ ██╗   ██╗██╗     ███████╗███████╗
██║  ██║██╔══██╗██╔══██╗██╔══██╗    ██╔══██╗██║   ██║██║     ██╔════╝██╔════╝
███████║███████║██████╔╝██║  ██║    ██████╔╝██║   ██║██║     █████╗  ███████╗
██╔══██║██╔══██║██╔══██╗██║  ██║    ██╔══██╗██║   ██║██║     ██╔══╝  ╚════██║
██║  ██║██║  ██║██║  ██║██████╔╝    ██║  ██║╚██████╔╝███████╗███████╗███████║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝
```

## PERMANENT BUILD TEAM GUIDELINES
**Fish Music Inc. / MissionControl96 / NOIZYLAB**

---

## ⚠️ THESE RULES ARE NON-NEGOTIABLE

Every team member MUST read and follow these rules. No exceptions.

---

# SECTION 1: NAMING CONVENTIONS

## 1.1 Brand Names - ALWAYS CAPITALIZE

| Name | Correct | WRONG |
|------|---------|-------|
| METABEAST_CC | METABEAST_CC | Metabeast, metabeast_cc |
| NOIZY | NOIZY | Noizy, noizy |
| NOIZYLAB | NOIZYLAB | NoizyLab, noizylab |
| MissionControl96 | MissionControl96 | missioncontrol96 |

## 1.2 Product Names - Use Official Styling

```yaml
# CORRECT
- name: FabFilter Pro-Q 3
- name: iZotope RX 11
- name: Native Instruments Kontakt
- name: Spectrasonics Omnisphere

# WRONG
- name: Fabfilter Pro Q
- name: Izotope RX
- name: NI Kontakt
- name: Omnisphere  # Missing developer
```

## 1.3 File Naming

```
# Files: snake_case
catalog.yaml
index.json
run_audit.py
ai_host_guide.py

# Manifests: SCREAMING_SNAKE_CASE
DAW_MANIFEST.yaml
PLUGIN_MANIFEST.yaml
AI_MODELS_MANIFEST.yaml

# Directories: lowercase or snake_case
data/
manifests/
tools/
kontakt_quickload/
```

## 1.4 Item IDs

```yaml
# Format: {type}-{number:03d}
daw-001     # DAWs
plug-001    # Plugins
inst-001    # Instruments
ai-001      # AI Models

# NEVER skip numbers
# NEVER reuse deleted IDs
# ALWAYS zero-pad to 3 digits
```

---

# SECTION 2: SCHEMA RULES

## 2.1 Required Fields - MANDATORY

Every catalog item MUST have:

```yaml
name: string        # Full product name
type: enum          # daw | plugin | instrument | ai_model
category: enum      # See approved list
developer: string   # Full company name
```

**NO EXCEPTIONS. NO EMPTY VALUES.**

## 2.2 Approved Types

```yaml
types:
  - daw
  - plugin
  - instrument
  - ai_model
```

## 2.3 Approved Categories

```yaml
categories:
  # DAW
  - daw

  # Instruments
  - synth
  - sampler
  - drum
  - orchestral
  - hybrid

  # Effects
  - eq
  - compressor
  - reverb
  - delay
  - saturation
  - pitch
  - spectral
  - utility
  - limiter
  - multiband
  - channel-strip
  - metering
  - modulation
  - gate
  - exciter
  - stereo

  # AI
  - noise_reduction
  - stem_separation
  - transcription
  - voice
  - video
```

## 2.4 Approved Formats

```yaml
formats:
  - VST2        # Legacy, note if sunset
  - VST3        # Primary
  - AU          # macOS
  - AAX         # Pro Tools
  - CLAP        # New standard
  - Standalone
  - AUv3        # iOS/iPadOS
  - Kontakt     # For libraries
  - UAD         # Universal Audio
```

## 2.5 Approved Operating Systems

```yaml
os:
  - macOS
  - Windows
  - Linux
  - iOS
  - Web
```

## 2.6 Approved Status Values

```yaml
status:
  - active        # Currently supported
  - legacy        # Works but no updates
  - discontinued  # No longer available
  - beta          # Pre-release
```

---

# SECTION 3: DATA INTEGRITY

## 3.1 Validation Requirements

Before ANY commit:

```bash
# MUST pass schema validation
python3 tools/validate_schema.py --strict

# MUST pass audit
python3 tools/audit/run_audit.py
```

## 3.2 Checksum Requirements

After ANY export:

```bash
# MD5 checksums MUST be generated
# Stored in checksums/ directory
# Format: {filename}.md5
```

## 3.3 Backup Requirements

```yaml
snapshots:
  frequency: monthly (minimum)
  retention: 12 months
  format: tar.gz
  checksum: required
```

## 3.4 No Duplicate IDs

```yaml
# EVERY itemId MUST be unique
# Validation will FAIL on duplicates
# Run: python3 tools/validate_schema.py
```

---

# SECTION 4: CODE STANDARDS

## 4.1 Python Requirements

```python
# Version: 3.9+
# Style: PEP 8
# Docstrings: Required for all functions
# Type hints: Encouraged

def add_item(name: str, item_type: str) -> bool:
    """Add an item to the catalog.

    Args:
        name: Product name
        item_type: One of daw, plugin, instrument, ai_model

    Returns:
        True if successful, False otherwise
    """
    pass
```

## 4.2 YAML Formatting

```yaml
# Indentation: 2 spaces (NOT tabs)
# Lists: Use - prefix
# Strings: Quote if contains special chars
# Order: Maintain alphabetical within sections

# CORRECT
items:
  - itemId: plug-001
    name: "FabFilter Pro-Q 3"
    type: plugin

# WRONG
items:
  -  itemId: plug-001  # Wrong indent
     name: FabFilter Pro-Q 3  # Missing quotes
```

## 4.3 JSON Formatting

```json
{
  "indentation": "2 spaces",
  "trailingCommas": "NEVER",
  "quotes": "double only"
}
```

---

# SECTION 5: GIT WORKFLOW

## 5.1 Branch Naming

```bash
# Feature branches
feature/add-new-daw-manifest
feature/update-ai-models

# Fix branches
fix/validation-error
fix/missing-checksums

# NEVER commit directly to main
```

## 5.2 Commit Messages

```bash
# Format: {type}: {description}

# Types:
# - feat: New feature
# - fix: Bug fix
# - docs: Documentation
# - data: Catalog data changes
# - tools: CLI/script changes
# - config: Configuration changes

# Examples:
git commit -m "feat: Add Bitwig Studio to DAW manifest"
git commit -m "data: Add 20 new plugins to catalog"
git commit -m "fix: Correct FabFilter developer name"
git commit -m "tools: Add batch import feature to audiocat"
```

## 5.3 Pull Request Requirements

Before merging ANY PR:

- [ ] Schema validation passes
- [ ] Audit runs clean
- [ ] Checksums generated
- [ ] README updated (if needed)
- [ ] CHANGELOG updated
- [ ] At least 1 reviewer approval

---

# SECTION 6: ACCESSIBILITY REQUIREMENTS

## 6.1 Dashboard Design

```yaml
accessibility:
  minTouchTarget: 48px      # WCAG minimum
  colorContrast: "AA"       # WCAG AA required
  fontSizeMin: 14px         # For readability

  # MUST support:
  - keyboard_navigation
  - screen_readers
  - voice_control
  - gaze_control
  - switch_control
```

## 6.2 Color Usage

```yaml
# NEVER use color alone to convey information
# ALWAYS provide text labels or icons

# Status indicators:
- active: green + "Active" label
- legacy: yellow + "Legacy" label
- discontinued: red + "Discontinued" label
```

---

# SECTION 7: SECURITY RULES

## 7.1 Secrets Management

```yaml
# NEVER commit:
- API keys
- Passwords
- Tokens
- Credentials

# Use .env files (gitignored)
# Use .env.example for templates
```

## 7.2 URL Validation

```yaml
# ALL URLs must be:
- HTTPS (not HTTP)
- Verified working
- Official vendor URLs only
- No affiliate links
```

---

# SECTION 8: DOCUMENTATION RULES

## 8.1 README Requirements

Every new feature MUST update:

- [ ] README.md (if user-facing)
- [ ] CHANGELOG.md (always)
- [ ] Inline comments (for complex code)

## 8.2 Manifest Documentation

Each manifest MUST include:

```yaml
meta:
  manifestName: string      # Required
  version: string           # Required
  generatedAt: date         # Required
  totalItems: number        # If applicable
```

---

# SECTION 9: TESTING REQUIREMENTS

## 9.1 Pre-Commit Checks

```bash
# Run before EVERY commit:

# 1. Schema validation
python3 tools/validate_schema.py

# 2. Audit check
python3 tools/audit/run_audit.py

# 3. Export test
python3 tools/export/export_index.py --format json
```

## 9.2 Import Testing

```bash
# Test CSV imports with sample data:
python3 tools/ingest/add_items.py --csv data/sample_import.csv
```

---

# SECTION 10: RELEASE PROCESS

## 10.1 Version Numbers

```yaml
# Semantic Versioning: MAJOR.MINOR.PATCH

# MAJOR: Breaking changes
# MINOR: New features (backward compatible)
# PATCH: Bug fixes

# Example: 1.2.3
```

## 10.2 Release Checklist

Before ANY release:

- [ ] All tests pass
- [ ] Schema validation clean
- [ ] Audit health score > 80
- [ ] CHANGELOG updated
- [ ] Version bumped in:
  - [ ] setup.py
  - [ ] README.md
  - [ ] tools/audiocat (VERSION constant)
- [ ] Snapshot created
- [ ] Git tag created

---

# SECTION 11: INTEGRATION RULES

## 11.1 MissionControl96

```yaml
# index.json MUST include:
- meta.itemCount
- stats.byType
- stats.byCategory
- items[] with all required fields
- filterOptions
```

## 11.2 Home Assistant

```yaml
# Sensors MUST use naming:
sensor.audio_catalog_{metric}

# Examples:
sensor.audio_catalog_total_items
sensor.audio_catalog_health_score
sensor.audio_catalog_status
```

## 11.3 Node-RED

```json
// Flow IDs MUST be prefixed:
"audio-catalog-{flow-name}"

// Example:
"audio-catalog-monthly-audit"
```

---

# SECTION 12: PROHIBITED ACTIONS

## 12.1 NEVER DO

```yaml
prohibited:
  - Delete items without deprecation period
  - Change itemIds after creation
  - Skip schema validation
  - Commit without testing
  - Use HTTP URLs (HTTPS only)
  - Store secrets in code
  - Ignore accessibility requirements
  - Merge without review
  - Push directly to main
  - Use tabs (spaces only)
```

## 12.2 Data Deletion Policy

```yaml
# To remove an item:
# 1. Set status: discontinued
# 2. Add note explaining why
# 3. Keep in catalog for 6 months
# 4. Archive before deletion
# 5. NEVER reuse the itemId
```

---

# SECTION 13: EMERGENCY PROCEDURES

## 13.1 Data Corruption

```bash
# 1. Stop all operations
# 2. Restore from latest snapshot
python3 tools/snapshot.py list
python3 tools/snapshot.py restore {snapshot_name}

# 3. Verify integrity
python3 tools/validate_schema.py
python3 tools/audit/run_audit.py
```

## 13.2 Failed Deployment

```bash
# 1. Revert to previous commit
git revert HEAD

# 2. Restore snapshot if needed
python3 tools/snapshot.py restore {snapshot_name}

# 3. Document incident
# 4. Root cause analysis
```

---

# SECTION 14: CONTACT & ESCALATION

## 14.1 Build Team Hierarchy

```yaml
roles:
  owner: Rob (Fish Music Inc.)
  lead: [Designated Lead]
  reviewers: [Team Members]
```

## 14.2 Issue Escalation

```yaml
# Level 1: Team discussion
# Level 2: Lead review
# Level 3: Owner decision

# For urgent issues:
# - Data corruption
# - Security breaches
# - Production failures
# Escalate immediately to Level 3
```

---

# SIGNATURES

By working on METABEAST_CC, you agree to follow these rules.

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   METABEAST_CC HARD RULES v1.0.0                                 ║
║                                                                   ║
║   These rules are PERMANENT and BINDING                          ║
║   for all build team members.                                    ║
║                                                                   ║
║   Fish Music Inc. / MissionControl96 / NOIZYLAB                  ║
║                                                                   ║
║   Effective Date: 2025-11-25                                     ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

---

*Last Updated: 2025-11-25*
*Version: 1.0.0*
*Status: ACTIVE & ENFORCED*
