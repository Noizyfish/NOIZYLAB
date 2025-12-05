# NOIZYLAB Media Storage Policy

## 🎵 Audio & Video Storage Location

**ALL audio and video files are stored on 12TB, NOT in Git/GitHub.**

### Storage Structure

```
/Volumes/12TB/NOIZYLAB_MEDIA/
├── Audio/          # Audio files (.wav, .mp3, .aiff, .flac, etc.)
├── Video/          # Video files (.mp4, .mov, .avi, .mkv, etc.)
├── Samples/        # Sample libraries and sound banks
└── Projects/       # DAW project files (.als, .logic, .flp, etc.)
```

## Excluded File Types

### Audio Formats
- `.wav`, `.aif`, `.aiff`, `.mp3`, `.m4a`
- `.flac`, `.ogg`, `.aac`, `.wma`, `.opus`, `.alac`

### Video Formats
- `.mp4`, `.mov`, `.avi`, `.mkv`, `.wmv`
- `.flv`, `.webm`, `.m4v`, `.mpg`, `.mpeg`, `.3gp`

### Project Files
- `.als` (Ableton Live)
- `.ptx` (Pro Tools)
- `.logic` (Logic Pro)
- `.band` (GarageBand)
- `.flp` (FL Studio)
- `.rpp` (Reaper)

## Why 12TB?

- **Size**: Media files are massive and would bloat the Git repository
- **Speed**: Git operations stay fast without large binary files
- **Cost**: GitHub has storage limits and LFS costs money
- **Performance**: Local 12TB access is faster than remote Git LFS

## Best Practices

1. **Always save media to 12TB first**
2. **Reference media paths in code/docs**
3. **Use relative paths when possible**
4. **Keep metadata in Git (JSON, MD, CSV)**
5. **Backup 12TB regularly**

## For Collaborators

If you need access to media files:
1. Check `/Volumes/12TB/NOIZYLAB_MEDIA/`
2. If not available, request specific assets
3. Never commit media files to Git

---
*Updated: December 4, 2025*
