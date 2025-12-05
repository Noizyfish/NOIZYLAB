# Workflows

## New Session

1. Run `python tools/new_session.py --project NAME`
2. Open session manifest in `manifests/sessions/`
3. Log work as you go
4. Update `metadata/sessions.csv` when done

## Recording

1. Create project folder with naming convention
2. Record stems with element prefixes
3. Log takes in session manifest
4. Bounce and version appropriately

## Mixing

1. Import stems to DAW
2. Name tracks consistently
3. Export versions with `_MIX_v#` suffix
4. Log plugin chains in session notes

## Mastering

1. Import approved mix
2. Process with reference track
3. Export `_MASTER_v#` versions
4. Update tracklist.csv with final metadata

## Archive

1. Verify all files named correctly
2. Run `python tools/validate_repo.py`
3. Copy to 12TB external
4. Update storage-map.md
