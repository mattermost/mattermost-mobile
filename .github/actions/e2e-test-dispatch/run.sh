#!/usr/bin/env bash
# Runs one e2e-test-dispatch action, named by the first argument, from the bundle the actions share. Node is checked
# first: the bundle is built for Node 26.
set -euo pipefail

major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if ! [[ "$major" =~ ^[0-9]+$ ]] || [ "$major" -lt 26 ]; then
  echo "::error::e2e-test-dispatch needs Node 26 or later; found $(node --version 2>/dev/null || echo none). Run actions/setup-node with node-version 26 before it."
  exit 1
fi
node "$(dirname "${BASH_SOURCE[0]}")/bundle/index.js" "$@"
