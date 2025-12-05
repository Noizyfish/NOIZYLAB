#!/usr/bin/env python3
"""
🌌 NOIZYLAB - Git Sync Flow
Automatically sync all repos to GitHub
"""

import sys
import logging
import subprocess
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

logger = logging.getLogger(__name__)


class GitSyncFlow:
    """Automated Git Sync Flow"""
    
    def __init__(self, repos_file: str = "repos.txt"):
        self.repos_file = Path(repos_file)
        logger.info("🔄 Git Sync Flow ready")
    
    def sync_all(self, auto_commit: bool = True, push: bool = True):
        """Sync all repositories"""
        if not self.repos_file.exists():
            logger.error(f"❌ Repos file not found: {self.repos_file}")
            return
        
        with open(self.repos_file) as f:
            repos = [line.strip() for line in f if line.strip()]
        
        logger.info(f"🔄 Syncing {len(repos)} repositories...")
        results = {"success": 0, "failed": 0, "skipped": 0}
        
        for git_dir in repos:
            repo_path = Path(git_dir).parent
            if not repo_path.exists():
                logger.warning(f"⚠️  Skipped (not found): {repo_path}")
                results["skipped"] += 1
                continue
            
            try:
                result = self.sync_repo(repo_path, auto_commit, push)
                if result:
                    results["success"] += 1
                else:
                    results["skipped"] += 1
            except Exception as e:
                logger.error(f"❌ Failed {repo_path.name}: {e}")
                results["failed"] += 1
        
        logger.info(f"✅ Sync complete: {results['success']} success, {results['failed']} failed, {results['skipped']} skipped")
        return results
    
    def sync_repo(self, repo_path: Path, auto_commit: bool, push: bool):
        """Sync single repository"""
        logger.info(f"📂 Syncing: {repo_path.name}")
        
        # Check status
        status = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=repo_path,
            capture_output=True,
            text=True
        )
        
        has_changes = bool(status.stdout.strip())
        
        if auto_commit and has_changes:
            # Auto-commit changes
            subprocess.run(["git", "add", "-A"], cwd=repo_path, check=True)
            commit_msg = f"Auto-sync: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            subprocess.run(["git", "commit", "-m", commit_msg], cwd=repo_path, check=True)
            logger.info(f"  ✅ Committed changes")
        
        if push:
            # Get current branch
            branch = subprocess.run(
                ["git", "branch", "--show-current"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True
            ).stdout.strip()
            
            if branch:
                # Push to remote
                result = subprocess.run(
                    ["git", "push", "-u", "origin", branch],
                    cwd=repo_path,
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    logger.info(f"  ✅ Pushed to origin/{branch}")
                    return True
                else:
                    logger.warning(f"  ⚠️  Push failed: {result.stderr}")
                    return False
        
        return True


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    flow = GitSyncFlow()
    flow.sync_all(auto_commit=True, push=True)
