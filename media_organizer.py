#!/usr/bin/env python3
"""
🌌 NOIZYLAB - Media Organizer Flow
Automatically organize media files to 12TB
"""

import sys
import shutil
import logging
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

logger = logging.getLogger(__name__)


class MediaOrganizerFlow:
    """Automated Media Organization"""
    
    MEDIA_ROOT = Path("/Volumes/12TB/NOIZYLAB_MEDIA")
    
    MEDIA_TYPES = {
        'Audio': ['.wav', '.mp3', '.aiff', '.aif', '.m4a', '.flac', '.ogg', '.aac'],
        'Video': ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm'],
        'Projects': ['.als', '.ptx', '.logic', '.band', '.flp', '.rpp'],
        'Samples': []  # By directory name
    }
    
    def __init__(self):
        logger.info("🎵 Media Organizer Flow ready")
    
    def organize_file(self, source_path: Path, create_symlink: bool = True):
        """Move file to 12TB and optionally create symlink"""
        if not source_path.exists():
            logger.error(f"❌ File not found: {source_path}")
            return False
        
        # Determine media type
        media_type = self._get_media_type(source_path)
        if not media_type:
            logger.warning(f"⚠️  Not a media file: {source_path}")
            return False
        
        # Create destination path
        dest_dir = self.MEDIA_ROOT / media_type / datetime.now().strftime("%Y-%m")
        dest_dir.mkdir(parents=True, exist_ok=True)
        
        dest_path = dest_dir / source_path.name
        
        # Handle duplicates
        counter = 1
        while dest_path.exists():
            dest_path = dest_dir / f"{source_path.stem}_{counter}{source_path.suffix}"
            counter += 1
        
        try:
            # Move file
            shutil.move(str(source_path), str(dest_path))
            logger.info(f"✅ Moved: {source_path.name} -> {dest_path}")
            
            # Create symlink
            if create_symlink:
                try:
                    source_path.symlink_to(dest_path)
                    logger.info(f"🔗 Created symlink: {source_path}")
                except Exception as e:
                    logger.warning(f"⚠️  Symlink failed: {e}")
            
            return True
        except Exception as e:
            logger.error(f"❌ Failed to move {source_path}: {e}")
            return False
    
    def scan_and_organize(self, directory: Path, recursive: bool = True):
        """Scan directory and organize all media files"""
        logger.info(f"🔍 Scanning: {directory}")
        moved = 0
        
        if recursive:
            files = directory.rglob('*')
        else:
            files = directory.glob('*')
        
        for file_path in files:
            if file_path.is_file() and '/Volumes/12TB' not in str(file_path):
                if self.organize_file(file_path):
                    moved += 1
        
        logger.info(f"✅ Organized {moved} media files")
        return moved
    
    def _get_media_type(self, file_path: Path):
        """Determine media type from extension"""
        ext = file_path.suffix.lower()
        for media_type, extensions in self.MEDIA_TYPES.items():
            if ext in extensions:
                return media_type
        return None
    
    def get_stats(self):
        """Get storage statistics"""
        if not self.MEDIA_ROOT.exists():
            return {}
        
        stats = {}
        for media_type in self.MEDIA_TYPES.keys():
            type_dir = self.MEDIA_ROOT / media_type
            if type_dir.exists():
                files = [f for f in type_dir.rglob('*') if f.is_file()]
                total_size = sum(f.stat().st_size for f in files)
                stats[media_type] = {
                    'count': len(files),
                    'size_gb': total_size / (1024**3)
                }
        
        return stats


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    flow = MediaOrganizerFlow()
    print("\n📊 Current Media Storage:")
    for media_type, data in flow.get_stats().items():
        print(f"  {media_type}: {data['count']} files ({data['size_gb']:.2f} GB)")
