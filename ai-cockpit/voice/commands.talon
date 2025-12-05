# NOIZYLAB Voice Commands for Talon
# For accessibility - designed for quadriplegic user

# Navigation
go file: key(cmd-p)
go line <number>: key(ctrl-g) insert("{number}") key(enter)
go back: key(ctrl-minus)
go forward: key(ctrl-shift-minus)
go terminal: key(ctrl-`)
go explorer: key(cmd-shift-e)
go search: key(cmd-shift-f)
go git: key(ctrl-shift-g)

# Editing
save: key(cmd-s)
save all: key(cmd-alt-s)
undo: key(cmd-z)
redo: key(cmd-shift-z)
cut line: key(cmd-shift-k)
copy line: key(cmd-c)
paste: key(cmd-v)
select all: key(cmd-a)
select line: key(cmd-l)
comment line: key(cmd-/)

# AI Commands
ask claude: key(cmd-shift-i)
explain this: key(cmd-shift-i) sleep(200ms) insert("explain this code")
refactor this: key(cmd-shift-i) sleep(200ms) insert("refactor this")
add tests: key(cmd-shift-i) sleep(200ms) insert("add tests for this")
fix error: key(cmd-shift-i) sleep(200ms) insert("fix this error")

# Git
git status: key(ctrl-shift-g) sleep(100ms) key(s)
git commit: key(ctrl-shift-g) sleep(100ms) key(c)
git push: key(ctrl-shift-g) sleep(100ms) key(p)
git pull: key(ctrl-shift-g) sleep(100ms) key(l)

# Terminal
run deploy: insert("./ops/deploy.sh\n")
run test: insert("./ops/test.sh\n")
run scan: insert("./ops/risk_scan.sh\n")

# Quick phrases
noizy commit: insert("git commit -m \"")
noizy push: insert("git push origin main")
upgrade improve: insert("python3 scripts/upgrade_improve.py")

# Accessibility
zoom in: key(cmd-=)
zoom out: key(cmd--)
high contrast: key(cmd-k cmd-t) sleep(200ms) insert("high contrast") key(enter)
bigger font: key(cmd-,) sleep(200ms) insert("fontSize") key(enter)
