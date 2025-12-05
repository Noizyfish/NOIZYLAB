#!/usr/bin/env bash
# Usage: ./scripts/stamp_provenance.sh <file_path> <model_name> <prompt_hash>
set -euo pipefail

FILE="${1:-}"
MODEL="${2:-claude}"
PROMPT="${3:-unknown}"

if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "File required and must exist." >&2
  exit 1
fi

SHA=$(shasum -a 256 "$FILE" | awk '{print $1}')
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "${FILE}.provenance.yaml" <<EOF
artifact:
  name: "${FILE}"
  created_at: "${TS}"
  model: "${MODEL}"
  prompt_id: "${PROMPT}"
  checksum: "${SHA}"
  approver: "rob"
EOF

echo "Provenance stamped: ${FILE}.provenance.yaml"
