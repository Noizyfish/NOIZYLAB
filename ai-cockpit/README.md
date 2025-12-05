# AI Cockpit - NOIZYLAB

Unified AI development environment with accessibility features, governance, and automation.

## Quick Start

```bash
# Clone and enter
cd /Users/m2ultra/NOIZYLAB/ai-cockpit

# Make scripts executable
chmod +x ops/*.sh governance/*.sh

# Open in VS Code
code .
```

## Structure

```
ai-cockpit/
├── .devcontainer/          # Identical environments across devices
│   └── devcontainer.json
├── .vscode/                # VS Code settings & tasks
│   ├── settings.json       # High contrast, 18pt font, accessibility
│   └── tasks.json          # Build tasks
├── configs/                # AI model routing & context packs
│   └── continue.json       # Claude, Copilot, Cursor configs
├── governance/             # Provenance & commit discipline
│   ├── pre-commit.sh       # Security checks
│   └── provenance.yaml     # AI artifact tracking
├── voice/                  # Talon/macOS voice maps
│   └── commands.talon      # Accessibility commands
└── ops/                    # Automation scripts
    ├── deploy.sh           # Git commit & push
    ├── test.sh             # Run all tests
    ├── docs.sh             # Generate documentation
    ├── risk_scan.sh        # Security scanner
    └── export_xls.sh       # Database -> Excel
```

## Accessibility Features

- **High Contrast Theme**: Default for visibility
- **18pt Font Size**: Large readable text
- **Block Cursor**: Easy to locate
- **Voice Commands**: Talon integration
- **Auto-save**: On focus change

## AI Models Configured

| Model | Provider | Use Case |
|-------|----------|----------|
| Claude 3.5 Sonnet | Anthropic | Default coding |
| Claude Opus 4.5 | Anthropic | Complex tasks |
| Copilot | GitHub | Autocomplete |
| Cursor | Cursor | IDE integration |

## Commands

### Voice (Talon)
- "ask claude" - Open AI chat
- "explain this" - Explain code
- "git commit" - Stage & commit
- "run deploy" - Deploy script

### VS Code Tasks
- `Cmd+Shift+B` → Deploy
- `Cmd+Shift+T` → Test
- Risk Scan, Docs, Export available

## Governance

All AI-generated code includes:
- Model attribution
- Timestamp
- Checksum
- Approver field

Pre-commit hook blocks:
- Sensitive files (.env, .key)
- Large files (>10MB)
- Audio/video files

## Author

Rob Plowman - rp@fishmusicinc.com
NOIZYLAB / Fish Music Inc.
