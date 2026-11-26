#!/bin/bash
# Start Metro in its own session and wait until it can serve a bundle.
# dispatch-run is a later step. The runner kills this step's process group
# when the step ends, so a background Metro started here would die with it.

set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$REPO_ROOT"

log="${RUNNER_TEMP:-/tmp}/metro.log"
: > "$log"

RUNNING_E2E=true python3 -c 'import os, sys; os.setsid(); os.execvp(sys.argv[1], sys.argv[1:])' npm run start >>"$log" 2>&1 &
echo "Metro pid $! log $log"

timeout=120
elapsed=0
echo "Waiting for Metro bundler to be ready..."
while [ "$elapsed" -lt "$timeout" ]; do
  if curl -s http://localhost:8081/status 2>/dev/null | grep -q "packager-status:running"; then
    echo "✅ Metro bundler is ready after ${elapsed}s (verified via health check)"
    break
  elif grep -q "Fast - Scalable - Integrated" "$log" 2>/dev/null; then
    echo "✅ Metro bundler is ready after ${elapsed}s (verified via logs)"
    break
  fi
  if [ $((elapsed % 10)) -eq 0 ] && [ "$elapsed" -gt 0 ]; then
    echo "Still waiting for Metro... (${elapsed}s elapsed)"
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

if [ "$elapsed" -ge "$timeout" ]; then
  echo "⚠️ Warning: Metro bundler may not be fully ready after ${timeout}s, proceeding anyway"
  tail -30 "$log" || true
else
  echo "Metro is serving on http://localhost:8081"
  echo "Allowing Metro to fully stabilize (20s on macos-15)..."
  sleep 20
  if curl -s http://localhost:8081/index.ios.bundle 2>/dev/null | grep -q "__d("; then
    echo "✅ Metro is serving bundles successfully"
  else
    echo "⚠️ Warning: Could not verify Metro is serving bundles, proceeding anyway"
  fi
fi
