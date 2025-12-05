#!/usr/bin/env python3
"""📁 PATHS - Path constants"""
from pathlib import Path

# Base paths
NOIZYLAB = Path(__file__).parent.parent
HOME = Path.home()
MUSIC = HOME / "Music"
PROJECTS = MUSIC / "Projects"

# External drives
GABRIEL = Path("/Volumes/GABRIEL")
BLUE_FISH = Path("/Volumes/4TB Blue Fish")
BIG_FISH = Path("/Volumes/4TB Big Fish")
FISH_SG = Path("/Volumes/4TB FISH SG")
ARCHIVE = Path("/Volumes/12TB")

# Project folders
def project_path(name):
    return PROJECTS / name

def gabriel_path(name):
    return GABRIEL / "Projects" / name
