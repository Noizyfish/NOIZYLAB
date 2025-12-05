#!/usr/bin/env bash
set -euo pipefail

# Install and configure pre-commit (format, lint, secrets)
if ! command -v pre-commit >/dev/null 2>&1; then
  pipx install pre-commit || pip install pre-commit
fi

cat > .pre-commit-config.yaml << 'YAML'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
  - repo: https://github.com/psf/black
    rev: 24.8.0
    hooks:
      - id: black
        language_version: python3
  - repo: https://github.com/PyCQA/ruff-pre-commit
    rev: v0.6.8
    hooks:
      - id: ruff
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
YAML

pre-commit install

# Conventional commit template
git config commit.template governance/commit-templates.txt

echo "Pre-commit, commit template, and basic hooks installed."
