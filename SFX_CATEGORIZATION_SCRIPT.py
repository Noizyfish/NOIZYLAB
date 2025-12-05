#!/usr/bin/env python3
"""
SFX SMART CATEGORIZATION SCRIPT
Analyzes and organizes 417 SFX files into production-ready categories
"""

import os
import shutil
import re
from pathlib import Path

SOURCE = "/Volumes/4TB FISH SG/2024 SFX To Sort"
DEST = "/Volumes/6TB/_ORGANIZED/05_SFX/SFX Master/Cinematic Horror Sci-Fi Collection"

# SMART CATEGORIES based on actual content analysis
CATEGORIES = {
    # CREATURES & MONSTERS
    "01_Creatures/Zombies": [
        r"zombie", r"zombies"
    ],
    "01_Creatures/Monsters": [
        r"monster", r"creature", r"demon", r"dragon", r"gorilla"
    ],
    "01_Creatures/Animals": [
        r"wolf", r"lion", r"bull", r"hawk", r"hyena", r"whale", r"horse", r"cat scream", 
        r"scorpion", r"bird", r"rattle.*snake", r"dog(?!s)"
    ],
    
    # HUMAN VOCALS
    "02_Vocals/Screams": [
        r"scream", r"shriek", r"shrill", r"terrified"
    ],
    "02_Vocals/Breaths": [
        r"breath", r"inhale", r"exhale", r"gasp", r"sigh", r"gagging"
    ],
    "02_Vocals/Voices": [
        r"groan", r"moan", r"whisper", r"choir", r"laugh", r"child", r"female", r"male(?!func)"
    ],
    "02_Vocals/Growls_Roars": [
        r"growl", r"roar", r"yell"
    ],
    
    # IMPACTS & HITS
    "03_Impacts/Bass_Impacts": [
        r"bass.*impact", r"bass.*drum", r"bass.*bell", r"sub.*woofer", r"sub.*impact",
        r"deep.*impact", r"thump"
    ],
    "03_Impacts/Explosions": [
        r"explosion", r"explode", r"blast", r"detonate", r"wrecking"
    ],
    "03_Impacts/Metal_Hits": [
        r"metal.*hit", r"metal.*impact", r"metallic", r"clang", r"gong"
    ],
    "03_Impacts/Drums_Percussion": [
        r"drum(?!.*machine)", r"cymbal", r"snare", r"bell(?!.*impact)"
    ],
    
    # WHOOSHES & TRANSITIONS
    "04_Whooshes/Standard": [
        r"whoosh(?!.*explosion)", r"swish", r"swoosh"
    ],
    "04_Whooshes/Flybys": [
        r"fly.*by", r"by(?!.*impact)", r"pass.*by"
    ],
    "04_Whooshes/Risers_Falls": [
        r"riser", r"rise", r"fall(?!.*body)", r"swell", r"build"
    ],
    
    # FIRE & EXPLOSIONS  
    "05_Fire/Flames": [
        r"fire(?!.*ball)", r"flame", r"burn", r"ignite", r"torch", r"lava", r"flare"
    ],
    "05_Fire/Fireballs": [
        r"fire.*ball", r"fireball"
    ],
    
    # WEATHER & NATURE
    "06_Weather/Thunder": [
        r"thunder", r"lightning", r"storm"
    ],
    "06_Weather/Wind": [
        r"wind(?!.*shield)", r"howl"
    ],
    "06_Weather/Water": [
        r"water", r"wave", r"splash", r"underwater", r"rain(?!.*stick)"
    ],
    
    # SCI-FI & TECHNOLOGY
    "07_SciFi/Lasers": [
        r"laser", r"beam", r"ray"
    ],
    "07_SciFi/Power": [
        r"power(?!.*spike)", r"energy", r"electric", r"spark", r"voltage", r"shock"
    ],
    "07_SciFi/Machines": [
        r"machine", r"servo", r"motor", r"engine", r"mechanical"
    ],
    "07_SciFi/Computers": [
        r"computer", r"beep", r"malfunction", r"scanner", r"digital"
    ],
    "07_SciFi/Space": [
        r"space(?!.*explosion)", r"alien", r"ufo", r"communication"
    ],
    
    # WEAPONS
    "08_Weapons/Guns": [
        r"gun", r"shot(?!.*explosion)", r"rifle", r"sniper", r"cannon", r"bullet", r"shell"
    ],
    "08_Weapons/Blades": [
        r"knife", r"sword", r"blade", r"shing", r"sharpen", r"whip"
    ],
    
    # HORROR ELEMENTS
    "09_Horror/Ambiences": [
        r"ambien", r"eerie(?!.*gun|.*hawk|.*choir|.*wolf|.*whale|.*horse|.*breath|.*ricochet|.*synth|.*tone|.*ghost)",
        r"ghost(?!.*dog)", r"haunted", r"creepy", r"sinister"
    ],
    "09_Horror/Gore": [
        r"bone", r"blood", r"splatter", r"gore", r"wound", r"stab", r"body", r"mangled", r"saw.*bone"
    ],
    "09_Horror/Doors": [
        r"door", r"cell", r"slam", r"creak"
    ],
    
    # SYNTHS & TONAL
    "10_Synths/Tonal": [
        r"synth", r"tone", r"tonal", r"drone", r"pad", r"rumble"
    ],
    "10_Synths/Processed": [
        r"processed", r"flange", r"weird", r"distort"
    ],
    
    # DJ & PRODUCTION ELEMENTS
    "11_DJ_Production/DJ_Elements": [
        r"^dj\s", r"dj\.", r"loop"
    ],
    "11_DJ_Production/Kyma": [
        r"kyma"
    ],
    
    # FOLEY & MISC
    "12_Foley/Vehicles": [
        r"train", r"helicopter", r"car"
    ],
    "12_Foley/Objects": [
        r"glass", r"stick", r"light.*switch", r"spotlight"
    ],
    
    # KTEL VINTAGE COLLECTION (Special category)
    "13_KTel_Vintage": [
        r"ktel"
    ]
}

def categorize_file(filename):
    """Determine best category for a file"""
    fname_lower = filename.lower()
    
    for category, patterns in CATEGORIES.items():
        for pattern in patterns:
            if re.search(pattern, fname_lower):
                return category
    
    return "99_Uncategorized"

def main():
    # Create destination structure
    os.makedirs(DEST, exist_ok=True)
    
    # Get all WAV files
    source_path = Path(SOURCE)
    wav_files = list(source_path.glob("*.wav"))
    
    print(f"Found {len(wav_files)} WAV files to categorize")
    
    # Categorize and prepare moves
    categorized = {}
    for wav in wav_files:
        category = categorize_file(wav.name)
        if category not in categorized:
            categorized[category] = []
        categorized[category].append(wav)
    
    # Print summary
    print("\n" + "="*60)
    print("CATEGORIZATION SUMMARY")
    print("="*60)
    
    for category in sorted(categorized.keys()):
        files = categorized[category]
        print(f"\n{category}: {len(files)} files")
        for f in sorted(files)[:5]:
            print(f"  - {f.name}")
        if len(files) > 5:
            print(f"  ... and {len(files)-5} more")
    
    # Create directories and copy files
    print("\n" + "="*60)
    print("CREATING ORGANIZED STRUCTURE...")
    print("="*60)
    
    total_moved = 0
    for category, files in categorized.items():
        dest_dir = Path(DEST) / category
        os.makedirs(dest_dir, exist_ok=True)
        
        for f in files:
            # Clean filename - remove leading numbers
            clean_name = re.sub(r'^[0-9]+\.', '', f.name).strip()
            dest_file = dest_dir / clean_name
            
            # Copy file
            shutil.copy2(f, dest_file)
            total_moved += 1
    
    print(f"\nSUCCESS! Organized {total_moved} files into {len(categorized)} categories")
    print(f"Location: {DEST}")
    
    return categorized

if __name__ == "__main__":
    main()
