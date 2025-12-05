#!/usr/bin/env python3
"""
Sample Libraries - Deep Scan, Fix Names & Reorganize
=====================================================
Fixes:
1. Replace spaces with underscores in all folder/file names
2. Remove duplicate nested folders
3. Clean up naming inconsistencies
"""

import os
import shutil
from pathlib import Path
import re

BASE_DIR = Path("/Volumes/6TB/Sample_Libraries")
LOG_FILE = BASE_DIR / "rename_log.txt"

def log(message):
    """Log message to console and file"""
    print(message)
    with open(LOG_FILE, "a") as f:
        f.write(message + "\n")

def clean_name(name):
    """
    Clean a file/folder name:
    - Replace spaces with underscores
    - Replace multiple underscores with single
    - Remove leading/trailing underscores
    """
    # Replace spaces with underscores
    new_name = name.replace(" ", "_")
    # Replace dashes surrounded by spaces/underscores with underscore
    new_name = re.sub(r'_-_', '_', new_name)
    new_name = re.sub(r'-_', '_', new_name)
    new_name = re.sub(r'_-', '_', new_name)
    # Replace multiple underscores with single
    new_name = re.sub(r'_+', '_', new_name)
    # Remove leading/trailing underscores (but keep extension)
    parts = new_name.rsplit('.', 1)
    if len(parts) == 2:
        base, ext = parts
        base = base.strip('_')
        new_name = f"{base}.{ext}"
    else:
        new_name = new_name.strip('_')
    return new_name

def get_items_by_depth(base_path):
    """Get all items sorted by depth (deepest first) for safe renaming"""
    items = []
    for root, dirs, files in os.walk(base_path):
        depth = root.count(os.sep)
        for d in dirs:
            items.append((depth + 1, 'dir', os.path.join(root, d)))
        for f in files:
            items.append((depth + 1, 'file', os.path.join(root, f)))
    # Sort by depth descending (deepest first)
    items.sort(key=lambda x: -x[0])
    return items

def find_duplicate_nested_folders(base_path):
    """Find folders that are duplicated inside themselves"""
    duplicates = []
    for root, dirs, files in os.walk(base_path):
        parent_name = os.path.basename(root)
        for d in dirs:
            # Check if folder name is similar to parent (accounting for spaces/underscores)
            d_clean = d.replace(" ", "_").replace("-", "_").lower()
            parent_clean = parent_name.replace(" ", "_").replace("-", "_").lower()
            if d_clean == parent_clean or parent_clean in d_clean:
                full_path = os.path.join(root, d)
                duplicates.append(full_path)
    return duplicates

def merge_duplicate_folder(dup_path):
    """Merge contents of duplicate folder into parent and remove it"""
    parent = os.path.dirname(dup_path)
    if not os.path.exists(dup_path):
        return
    
    log(f"  Merging duplicate: {dup_path}")
    
    # Move all contents up to parent
    for item in os.listdir(dup_path):
        src = os.path.join(dup_path, item)
        dst = os.path.join(parent, item)
        
        if os.path.exists(dst):
            if os.path.isdir(src) and os.path.isdir(dst):
                # Merge directories recursively
                for sub_item in os.listdir(src):
                    sub_src = os.path.join(src, sub_item)
                    sub_dst = os.path.join(dst, sub_item)
                    if not os.path.exists(sub_dst):
                        shutil.move(sub_src, sub_dst)
            else:
                log(f"    Skipping (exists): {item}")
        else:
            shutil.move(src, dst)
    
    # Remove empty duplicate folder
    try:
        os.rmdir(dup_path)
        log(f"  Removed empty folder: {dup_path}")
    except OSError:
        log(f"  Could not remove (not empty): {dup_path}")

def rename_item(old_path, item_type):
    """Rename a single file or folder"""
    dirname = os.path.dirname(old_path)
    basename = os.path.basename(old_path)
    new_name = clean_name(basename)
    
    if new_name != basename:
        new_path = os.path.join(dirname, new_name)
        
        # Handle conflicts
        if os.path.exists(new_path):
            # Add suffix for conflicts
            if item_type == 'file':
                name, ext = os.path.splitext(new_name)
                counter = 1
                while os.path.exists(new_path):
                    new_path = os.path.join(dirname, f"{name}_{counter}{ext}")
                    counter += 1
            else:
                counter = 1
                while os.path.exists(new_path):
                    new_path = os.path.join(dirname, f"{new_name}_{counter}")
                    counter += 1
        
        try:
            os.rename(old_path, new_path)
            log(f"  {item_type.upper()}: {basename} -> {os.path.basename(new_path)}")
            return True
        except Exception as e:
            log(f"  ERROR: {basename}: {e}")
            return False
    return False

def main():
    # Clear log file
    with open(LOG_FILE, "w") as f:
        f.write("=" * 60 + "\n")
        f.write("SAMPLE LIBRARIES - FIX NAMES & REORGANIZE\n")
        f.write("=" * 60 + "\n\n")
    
    log(f"Base directory: {BASE_DIR}\n")
    
    # PHASE 1: Find and merge duplicate nested folders
    log("PHASE 1: Finding duplicate nested folders...")
    log("-" * 40)
    
    duplicates = find_duplicate_nested_folders(BASE_DIR)
    log(f"Found {len(duplicates)} potential duplicates")
    
    # Known duplicate: Earth Moments Indian Street Drummers
    known_duplicates = [
        "/Volumes/6TB/Sample_Libraries/Earth_Moments/Indian_Street_Drummers/Earth Moments Indian Street Drummers"
    ]
    
    for dup in known_duplicates:
        if os.path.exists(dup):
            merge_duplicate_folder(dup)
    
    log("")
    
    # PHASE 2: Rename all items with spaces (deepest first)
    log("PHASE 2: Renaming items with spaces...")
    log("-" * 40)
    
    items = get_items_by_depth(BASE_DIR)
    rename_count = 0
    
    for depth, item_type, path in items:
        if " " in os.path.basename(path):
            if os.path.exists(path):  # Check still exists (parent may have been renamed)
                if rename_item(path, item_type):
                    rename_count += 1
    
    log(f"\nRenamed {rename_count} items")
    log("")
    
    # PHASE 3: Summary
    log("PHASE 3: Final Summary")
    log("-" * 40)
    
    # Count remaining issues
    remaining_spaces = 0
    for root, dirs, files in os.walk(BASE_DIR):
        for d in dirs:
            if " " in d:
                remaining_spaces += 1
        for f in files:
            if " " in f:
                remaining_spaces += 1
    
    log(f"Items still with spaces: {remaining_spaces}")
    log("\n" + "=" * 60)
    log("COMPLETE!")
    log("=" * 60)

if __name__ == "__main__":
    main()
