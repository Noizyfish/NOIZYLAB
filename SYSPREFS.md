# NOISYLABZ System Preferences

## Active Mission (Tab) Management

**Goal**: Only one active tab/mission visible unless explicitly changed

### VS Code Configuration

The following is configured in `.vscode/settings.json`:

```json
"workbench.editor.limit.enabled": true,
"workbench.editor.limit.value": 1,
```

This ensures:
- ✅ **Only ONE tab is open at a time**
- ✅ **Auto-save enabled** - no unsaved changes
- ✅ **Clean workspace** - no distractions
- ✅ **Super minimal UI**

### How It Works

1. **Single Tab Mode**
   - Open file A → tab shows "A"
   - Open file B → tab shows "B" (A closes)
   - Go back to A → tab shows "A" (B closes)

2. **Making Changes**
   ```
   Current Mission: Project Alpha
   ↓ (Make a change)
   ↓ (Auto-save triggers)
   ✅ Saved - workspace stays clean
   ```

3. **Switch Missions Intentionally**
   ```bash
   cd projects/different-project
   # New project becomes the active mission
   ```

### Tab Management Rules

| Action | Behavior |
|--------|----------|
| Open new file | Previous file closes |
| Edit active file | Auto-save every 1 second |
| Switch project | Automatically switches active mission |
| Revert changes | Use Git to restore |

### Commands

```bash
# View only this project
code projects/my-project

# Show workspace status
noisylabz-status

# Quick switch
projects          # cd to projects
cd project-name
code .
```

### Customization

To adjust tab limit, edit `.vscode/settings.json`:

```json
// Number of tabs allowed (default: 1)
"workbench.editor.limit.value": 1

// Enable/disable
"workbench.editor.limit.enabled": true
```

---

## File Organization System Prefs

### Auto-Cleanup
```json
"files.exclude": {
  "**/node_modules": true,
  "**/.DS_Store": true,
  "**/__pycache__": true
}
```

### Auto-Save
```json
"files.autoSave": "onFocusChange",
"files.autoSaveDelay": 1000
```

### Hidden Files (Clean View)
```json
"explorer.excludeGitIgnore": true
```

---

## Workflow Philosophy

**CLEAN & MINIMAL**

1. One mission at a time
2. One tab open maximum
3. Auto-save always enabled
4. Auto-cleanup hidden files
5. Git for version control

---

**Last Updated**: November 2025  
**Philosophy**: Focused Development, Zero Distraction
