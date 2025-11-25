#!/usr/bin/env python3
# ==============================================================================
# METABEAST_CC - Snapshot & Archive Tool
# ==============================================================================
# Create timestamped snapshots of the Audio Canon catalog
# Fish Music Inc. / MissionControl96 / NOIZYLAB
# ==============================================================================

import os
import sys
import shutil
import hashlib
import tarfile
import json
from pathlib import Path
from datetime import datetime
from typing import Optional

# ==============================================================================
# CONFIGURATION
# ==============================================================================

REGISTRY_ROOT = Path(__file__).parent.parent
DATA_DIR = REGISTRY_ROOT / "data"
MANIFESTS_DIR = REGISTRY_ROOT / "manifests"
SNAPSHOTS_DIR = REGISTRY_ROOT / "snapshots"
CHECKSUMS_DIR = REGISTRY_ROOT / "checksums"

# Files to include in snapshot
SNAPSHOT_FILES = [
    DATA_DIR / "catalog.yaml",
    DATA_DIR / "index.json",
]

SNAPSHOT_DIRS = [
    MANIFESTS_DIR,
]

# ==============================================================================
# COLORS
# ==============================================================================

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

# ==============================================================================
# SNAPSHOT CLASS
# ==============================================================================

class SnapshotManager:
    def __init__(self, registry_root: Path = REGISTRY_ROOT):
        self.registry_root = registry_root
        self.snapshots_dir = registry_root / "snapshots"
        self.checksums_dir = registry_root / "checksums"

        # Ensure directories exist
        self.snapshots_dir.mkdir(parents=True, exist_ok=True)
        self.checksums_dir.mkdir(parents=True, exist_ok=True)

    def compute_checksum(self, file_path: Path) -> str:
        """Compute MD5 checksum for a file."""
        with open(file_path, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()

    def create_snapshot(self, name: Optional[str] = None,
                       include_manifests: bool = True) -> Path:
        """Create a timestamped snapshot archive."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_name = name or f"audio_canon_{timestamp}"
        snapshot_dir = self.snapshots_dir / snapshot_name

        print(f"\n{Colors.BOLD}{Colors.CYAN}METABEAST_CC - Creating Snapshot{Colors.END}")
        print(f"{Colors.CYAN}{'─'*50}{Colors.END}")
        print(f"Name: {snapshot_name}")
        print(f"Time: {datetime.now().isoformat()}")
        print()

        # Create snapshot directory
        snapshot_dir.mkdir(parents=True, exist_ok=True)

        # Copy data files
        print(f"{Colors.BLUE}Copying data files...{Colors.END}")
        data_snapshot = snapshot_dir / "data"
        data_snapshot.mkdir(exist_ok=True)

        for file_path in SNAPSHOT_FILES:
            if file_path.exists():
                dest = data_snapshot / file_path.name
                shutil.copy2(file_path, dest)
                checksum = self.compute_checksum(dest)
                print(f"  {Colors.GREEN}✓{Colors.END} {file_path.name} [{checksum[:8]}]")

        # Copy manifests if requested
        if include_manifests:
            print(f"\n{Colors.BLUE}Copying manifests...{Colors.END}")
            manifests_snapshot = snapshot_dir / "manifests"
            if MANIFESTS_DIR.exists():
                shutil.copytree(MANIFESTS_DIR, manifests_snapshot)
                manifest_count = sum(1 for _ in manifests_snapshot.rglob("*.yaml"))
                print(f"  {Colors.GREEN}✓{Colors.END} {manifest_count} manifest files")

        # Create metadata file
        print(f"\n{Colors.BLUE}Creating metadata...{Colors.END}")
        metadata = {
            "snapshot_name": snapshot_name,
            "created_at": datetime.now().isoformat(),
            "registry_version": "1.0.0",
            "files": {},
            "manifests_included": include_manifests
        }

        # Add file checksums to metadata
        for file_path in (data_snapshot).rglob("*"):
            if file_path.is_file():
                rel_path = str(file_path.relative_to(snapshot_dir))
                metadata["files"][rel_path] = {
                    "size": file_path.stat().st_size,
                    "md5": self.compute_checksum(file_path)
                }

        metadata_path = snapshot_dir / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"  {Colors.GREEN}✓{Colors.END} metadata.json")

        # Create tar.gz archive
        print(f"\n{Colors.BLUE}Creating archive...{Colors.END}")
        archive_path = self.snapshots_dir / f"{snapshot_name}.tar.gz"
        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(snapshot_dir, arcname=snapshot_name)

        archive_size = archive_path.stat().st_size
        print(f"  {Colors.GREEN}✓{Colors.END} {archive_path.name} ({archive_size / 1024:.1f} KB)")

        # Clean up uncompressed directory
        shutil.rmtree(snapshot_dir)

        # Save checksum of archive
        archive_checksum = self.compute_checksum(archive_path)
        checksum_file = self.checksums_dir / f"{snapshot_name}.tar.gz.md5"
        with open(checksum_file, 'w') as f:
            f.write(f"{archive_checksum}  {archive_path.name}\n")

        print(f"\n{Colors.GREEN}{Colors.BOLD}Snapshot created successfully!{Colors.END}")
        print(f"  Archive: {archive_path}")
        print(f"  Checksum: {archive_checksum}")

        return archive_path

    def list_snapshots(self) -> list:
        """List all available snapshots."""
        snapshots = []
        for archive in self.snapshots_dir.glob("*.tar.gz"):
            stat = archive.stat()
            snapshots.append({
                "name": archive.stem.replace(".tar", ""),
                "path": archive,
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_mtime)
            })
        return sorted(snapshots, key=lambda x: x["created"], reverse=True)

    def restore_snapshot(self, snapshot_name: str,
                        target_dir: Optional[Path] = None) -> bool:
        """Restore a snapshot."""
        archive_path = self.snapshots_dir / f"{snapshot_name}.tar.gz"
        if not archive_path.exists():
            print(f"{Colors.RED}Snapshot not found: {snapshot_name}{Colors.END}")
            return False

        target = target_dir or self.registry_root
        print(f"\n{Colors.BOLD}{Colors.CYAN}METABEAST_CC - Restoring Snapshot{Colors.END}")
        print(f"{Colors.CYAN}{'─'*50}{Colors.END}")
        print(f"Snapshot: {snapshot_name}")
        print(f"Target: {target}")

        # Verify checksum
        checksum_file = self.checksums_dir / f"{snapshot_name}.tar.gz.md5"
        if checksum_file.exists():
            with open(checksum_file, 'r') as f:
                expected_checksum = f.read().split()[0]
            actual_checksum = self.compute_checksum(archive_path)
            if expected_checksum != actual_checksum:
                print(f"{Colors.RED}Checksum mismatch! Archive may be corrupted.{Colors.END}")
                return False
            print(f"{Colors.GREEN}✓ Checksum verified{Colors.END}")

        # Extract
        print(f"\n{Colors.BLUE}Extracting files...{Colors.END}")
        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(target)

        print(f"\n{Colors.GREEN}{Colors.BOLD}Snapshot restored successfully!{Colors.END}")
        return True

    def cleanup_old_snapshots(self, keep_count: int = 10) -> int:
        """Remove old snapshots, keeping the most recent ones."""
        snapshots = self.list_snapshots()
        removed = 0

        if len(snapshots) > keep_count:
            for snapshot in snapshots[keep_count:]:
                snapshot["path"].unlink()
                # Remove checksum file too
                checksum_file = self.checksums_dir / f"{snapshot['name']}.tar.gz.md5"
                if checksum_file.exists():
                    checksum_file.unlink()
                removed += 1
                print(f"{Colors.YELLOW}Removed: {snapshot['name']}{Colors.END}")

        return removed

    def print_snapshots(self):
        """Print list of snapshots."""
        snapshots = self.list_snapshots()

        print(f"\n{Colors.BOLD}{Colors.CYAN}METABEAST_CC - Available Snapshots{Colors.END}")
        print(f"{Colors.CYAN}{'─'*60}{Colors.END}")

        if not snapshots:
            print(f"  {Colors.YELLOW}No snapshots found{Colors.END}")
            return

        for snap in snapshots:
            size_kb = snap["size"] / 1024
            created = snap["created"].strftime("%Y-%m-%d %H:%M:%S")
            print(f"  {Colors.GREEN}•{Colors.END} {snap['name']}")
            print(f"    Size: {size_kb:.1f} KB | Created: {created}")


# ==============================================================================
# MAIN
# ==============================================================================

def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="METABEAST_CC - Snapshot & Archive Tool"
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Create command
    create_parser = subparsers.add_parser("create", help="Create a snapshot")
    create_parser.add_argument("--name", "-n", type=str, help="Snapshot name")
    create_parser.add_argument("--no-manifests", action="store_true",
                              help="Exclude manifests directory")

    # List command
    list_parser = subparsers.add_parser("list", help="List snapshots")

    # Restore command
    restore_parser = subparsers.add_parser("restore", help="Restore a snapshot")
    restore_parser.add_argument("name", type=str, help="Snapshot name")
    restore_parser.add_argument("--target", "-t", type=str, help="Target directory")

    # Cleanup command
    cleanup_parser = subparsers.add_parser("cleanup", help="Remove old snapshots")
    cleanup_parser.add_argument("--keep", "-k", type=int, default=10,
                               help="Number of snapshots to keep")

    args = parser.parse_args()

    manager = SnapshotManager()

    if args.command == "create":
        manager.create_snapshot(
            name=args.name,
            include_manifests=not args.no_manifests
        )
    elif args.command == "list":
        manager.print_snapshots()
    elif args.command == "restore":
        target = Path(args.target) if args.target else None
        manager.restore_snapshot(args.name, target)
    elif args.command == "cleanup":
        removed = manager.cleanup_old_snapshots(args.keep)
        print(f"Removed {removed} old snapshots")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
