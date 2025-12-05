# AI Cockpit - Quick Start Guide

## 1. Clone

```bash
git clone https://github.com/Noizyfish/NOIZYLAB.git
cd NOIZYLAB/ai-cockpit
```

## 2. Install VS Code Extensions

Required:
- **GitHub Copilot** - AI autocomplete
- **Continue** - Multi-model AI chat
- **Error Lens** - Inline error display
- **Bookmarks** - Code navigation

Optional:
- **Cursor** - AI-native editor
- **Sourcegraph Cody** - Code intelligence

Install via command palette (`Cmd+Shift+P`):
```
ext install github.copilot
ext install continue.continue
ext install usernamehw.errorlens
ext install alefragnani.bookmarks
```

## 3. Configure Claude API

Add to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
export OPENAI_API_KEY="sk-your-key-here"  # Optional
```

Then reload:
```bash
source ~/.zshrc
```

## 4. Open in DevContainer

For identical environments across devices:

1. Open VS Code in `ai-cockpit/`
2. Press `Cmd+Shift+P`
3. Select "Dev Containers: Reopen in Container"
4. Wait for container build

## 5. Run Governance Setup

```bash
chmod +x governance/pre-commit.sh
./governance/pre-commit.sh

# Install as git hook
cp governance/pre-commit.sh ../.git/hooks/pre-commit
```

## 6. Bind Voice Commands

### Option A: Talon Voice
Copy `voice/commands.talon` to your Talon user directory:
```bash
cp voice/commands.talon ~/.talon/user/
```

### Option B: macOS Voice Control
See `voice/mac-shortcuts.md` for manual setup.

### Option C: macOS Shortcuts App
Import voice commands as Shortcuts for Siri integration.

---

## Quick Reference

| Action | Voice | Keyboard |
|--------|-------|----------|
| Deploy | "deploy suite" | `Cmd+Shift+B` |
| Test | "test suite" | `Cmd+Shift+T` |
| Docs | "docs suite" | `Cmd+Shift+D` |
| Risk Scan | "risk scan" | `Cmd+Shift+R` |
| Export | "export report" | `Cmd+Shift+E` |
| Ask AI | "ask claude" | `Cmd+Shift+I` |

---

## Troubleshooting

### Claude not responding
- Check API key: `echo $ANTHROPIC_API_KEY`
- Verify in Continue settings

### DevContainer fails
- Ensure Docker Desktop is running
- Check `.devcontainer/devcontainer.json` syntax

### Voice commands not working
- Talon: Check `~/.talon/talon.log`
- macOS: System Settings → Accessibility → Voice Control

---

## Support

- GitHub: https://github.com/Noizyfish/NOIZYLAB
- Email: rp@fishmusicinc.com
