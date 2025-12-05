#!/usr/bin/env python3
import time
from realmforge.realm_manager import RealmManager
from realmforge.soundweave import SoundWeave

class RealmForgeLoop:
    def __init__(self):
        self.rm = RealmManager()
        self.sw = SoundWeave()
    def run(self, name, theme):
        realm = self.rm.create_realm(name, theme)
        while True:
            weave = self.sw.weave(realm, "growth + transformation")
            print("🎼 SOUNDWEAVE:", weave)
            time.sleep(180)
    def forge_once(self, name, theme):
        return self.rm.create_realm(name, theme)
