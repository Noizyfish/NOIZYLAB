#!/usr/bin/env python3
"""⚡ CLI - Command Line Interface"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class CLI:
    def __init__(self):
        from core import ComposerEngine, MixEngine
        from control import LogicControl
        from auto import FileFlow, GitOps, Network
        
        self.composer = ComposerEngine()
        self.mixer = MixEngine()
        self.daw = LogicControl()
        self.files = FileFlow()
        self.git = GitOps()
        self.net = Network()
    
    def run(self, cmd, *args):
        cmds = {
            "play": self.daw.play,
            "stop": self.daw.stop,
            "save": self.daw.save,
            "bounce": self.daw.bounce,
            "score": lambda: print(self.composer.score(" ".join(args))),
            "mix": lambda: print(self.mixer.analyze(" ".join(args))),
            "sync": lambda: self.files.sync(args[0] if args else "project"),
            "backup": self.git.sync,
            "status": lambda: print(self.net.status()),
            "help": self.help
        }
        cmds.get(cmd, self.help)()
    
    def help(self):
        print("""
🔥 NOIZYLAB CLI
══════════════════════════════
DAW:    play, stop, save, bounce
CREATE: score <brief>
MIX:    mix <desc>
FILES:  sync <name>, backup
NET:    status
══════════════════════════════
🔥 GORUNFREE! 🎸🔥
        """)
    
    def interactive(self):
        print("🔥 NOIZYLAB INTERACTIVE")
        while True:
            try:
                cmd = input("NOIZY > ").strip().split()
                if not cmd:
                    continue
                if cmd[0] == "exit":
                    break
                self.run(cmd[0], *cmd[1:])
            except KeyboardInterrupt:
                break
        print("\n🔥 GORUNFREE!")

def main():
    cli = CLI()
    if len(sys.argv) > 1:
        cli.run(sys.argv[1], *sys.argv[2:])
    else:
        cli.interactive()

if __name__ == "__main__":
    main()
