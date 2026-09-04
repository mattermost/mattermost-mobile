#!/usr/bin/env bash
# Cursor Cloud Agent start script.
# This environment does not run Docker or app servers — only materialize
# cloud-only instructions for the agent.

set -Eeuo pipefail

log() { printf '[cloud-agent-start] %s\n' "$*" >&2; }

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [ -f .cursor/cursor.md ]; then
  cp .cursor/cursor.md .cursor/AGENTS.md
  log "Materialized Cloud Agent instructions at .cursor/AGENTS.md"
fi

log "Start complete (no long-lived processes)"
