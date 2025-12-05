#!/usr/bin/env python3
from realmforge.registry import RealityRegistry
from realmforge.fabricator import WorldFabricator
from realmforge.arclaw import ArcLawEngine
from realmforge.entities import EntitySpawner
from realmforge.timeline import MultiTimeline

class RealmManager:
    def __init__(self):
        self.reg = RealityRegistry()
        self.fab = WorldFabricator()
        self.laws = ArcLawEngine()
        self.spawn = EntitySpawner()
        self.time = MultiTimeline()
    def create_realm(self, name, theme):
        world = self.fab.forge(name, theme)
        laws = self.laws.derive(world)
        self.reg.create(name, {"data": world, "laws": laws})
        self.spawn.spawn(name, "Guardian")
        self.spawn.spawn(name, "Composer Spirit")
        self.spawn.spawn(name, "Archivist Entity")
        self.time.branch(f"Realm {name} forged with theme {theme}")
        return world
