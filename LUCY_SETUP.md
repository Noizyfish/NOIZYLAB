# 🎙️ Lucy Voice Assistant Setup Guide

## Who is Lucy?

Lucy is a sophisticated, knowledgeable AI voice assistant with:
- **Accent**: British with a hint of French elegance
- **Expertise**: Music production, film, VS Code, AI development, universal knowledge
- **Persona**: 45-year-old, ridiculously well-schooled professional
- **Role**: Your intelligent guide and right hand in creative/technical work

---

## Quick Start

### 1. **Enable Lucy in Shell** (30 seconds)

Add to `~/.zshrc`:
```bash
source /Volumes/RSP/NOISYLABZ/.config/lucy.zsh
source /Volumes/RSP/NOISYLABZ/.config/init.zsh
```

Reload:
```bash
source ~/.zshrc
```

### 2. **Test Lucy**

```bash
lucy-start
```

You'll hear: *"Hello. I'm Lucy. Ready to assist you with your NOISYLABZ projects."*

---

## Lucy Commands

### Shell Commands

```bash
# Start Lucy
lucy-start

# Have Lucy read current file changes
lucy-read-changes [filename]

# Have Lucy read VS Code activity
lucy-read-activity

# Ask Lucy a question
lucy-ask "How do I use reverb in music production?"

# Enable/disable notifications
lucy-enable-notifications
lucy-disable-notifications

# Set speaking speed (0.5-2.0)
lucy-set-speed 0.9
```

---

## VS Code Integration

### Installation

Copy Lucy extension to VS Code:
```bash
mkdir -p ~/.vscode/extensions/lucy-voice-assistant
cp /Volumes/RSP/NOISYLABZ/.config/lucy-extension.js \
   ~/.vscode/extensions/lucy-voice-assistant/src/extension.js
cp /Volumes/RSP/NOISYLABZ/.config/lucy-extension-package.json \
   ~/.vscode/extensions/lucy-voice-assistant/package.json
```

### VS Code Keyboard Shortcuts

| Command | Mac | What it does |
|---------|-----|-------------|
| **Start Lucy** | Cmd+Shift+L | Say hello and activate |
| **Read File** | Cmd+Shift+R | Read current file info |
| **Explain Code** | Cmd+Click | Explain selected code |
| **Ask Question** | Cmd+Shift+A | Ask Lucy anything |
| **Stop** | Cmd+Shift+. | Stop speaking |

### VS Code Settings

Open VS Code settings and add:
```json
"lucy.enabled": true,
"lucy.voice": "Victoria",
"lucy.speed": 0.85,
"lucy.autoRead": false,
"lucy.provider": "system"
```

---

## Lucy's Expertise

### 🎵 Music Production
- DAW workflows (Logic, Ableton, Pro Tools, etc.)
- Mixing and mastering techniques
- Audio engineering
- Production tips and tricks

### 🎬 Film Production
- Video editing workflows
- Color grading
- Motion graphics
- Sound design

### 💻 VS Code
- Extensions and workflows
- Debugging techniques
- Git integration
- Performance optimization

### 🤖 AI & Development
- LLM usage and prompt engineering
- AI agents and workflows
- Code optimization
- Best practices

### 🌍 Universal Knowledge
- Any question, any topic
- Industry insights
- Problem-solving guidance

---

## Advanced: Azure Cloud Voice

For a more realistic, professional voice, use Azure Cognitive Services:

### 1. Get Azure Account
- Sign up at https://azure.microsoft.com
- Create Cognitive Services resource

### 2. Configure Lucy

```bash
# Edit environment variables
nano /Volumes/RSP/NOISYLABZ/.config/noisylabz.env

# Add:
export LUCY_AZURE_KEY="your-azure-key"
export LUCY_AZURE_REGION="eastus"
export LUCY_PROVIDER="azure"
```

### 3. Reload

```bash
source ~/.zshrc
```

Now Lucy will use Azure's professional British female voice (LibbyNeural) with perfect pronunciation and natural pacing.

---

## Lucy Voices Available

### macOS System Voices
- **Victoria** ⭐ (Recommended - British)
- **Daniel** (British)
- **Moira** (British)
- **Samantha** (Clear American)

### Azure Voices (Premium)
- **en-GB-LibbyNeural** (British, most natural)
- **en-GB-RyanNeural** (British male alternative)
- **en-GB-AmberNeural** (British alternative)

### Google Cloud Voices
- **en-GB-Neural2-C** (British female)
- **en-GB-Neural2-D** (British female alternative)

---

## Example Workflows

### Workflow 1: Code Review with Lucy

```bash
# Open your code
code /Volumes/RSP/NOISYLABZ/projects/my-project

# Have Lucy read it
lucy-read-changes my-project/src/main.py

# Ask for explanation
lucy-ask "Is this the best approach for this algorithm?"

# Lucy provides expert feedback via voice
```

### Workflow 2: Music Production Session

```bash
# Start session
lucy-start

# Work in your DAW

# Ask production questions
lucy-ask "How do I achieve a modern pop vocal production?"

# Get expert guidance via voice
```

### Workflow 3: Learning New Technology

```bash
# Start Lucy
lucy-start

# Open documentation
code docs/

# Ask Lucy to read and explain
lucy-ask "Explain how this framework works"

# Lucy provides clear, detailed explanation
```

---

## Customization

### Change Lucy's Speed
```bash
# Slower (more deliberate)
lucy-set-speed 0.7

# Faster (more conversational)
lucy-set-speed 1.0

# Normal
lucy-set-speed 0.85
```

### Change Lucy's Voice

Edit `~/.zshrc`:
```bash
export LUCY_VOICE="Daniel"  # or: Victoria, Moira, Samantha
```

### Auto-Read Code Changes

Enable in VS Code settings:
```json
"lucy.autoRead": true
```

Now Lucy will narrate as you type!

---

## Troubleshooting

### Lucy won't speak
```bash
# Check if system voice works
say "test"

# If that fails, check voice availability
say -v ?

# Restart Lucy
lucy-disable-notifications
lucy-enable-notifications
```

### Lucy speaks too fast/slow
```bash
# Adjust speed
lucy-set-speed 0.8

# Reload
source ~/.zshrc
```

### VS Code extension not loading
```bash
# Restart VS Code
code /Volumes/RSP/NOISYLABZ/NOISYLABZ.code-workspace

# Check extension status: Cmd+Shift+X
```

---

## Pro Tips

1. **Use Lucy for Learning**: Have her explain complex code or concepts
2. **Session Companion**: Start Lucy at the beginning of your work session
3. **Question Bank**: Ask anything about your work domain
4. **Code Review**: Have Lucy read and comment on your code
5. **Accessibility**: Perfect for those who prefer audio guidance

---

## The Philosophy

Lucy represents:
- **Expertise** - She knows everything
- **Elegance** - Sophisticated and professional
- **Accessibility** - Audio-based learning and guidance
- **Efficiency** - Get answers without leaving your workflow
- **Personality** - A genuine assistant, not just a bot

---

**Created**: November 2025  
**Lucy Version**: 1.0  
**Status**: 🎙️ Ready to assist

Start with: `lucy-start`
