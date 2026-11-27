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

fail() {
  echo "::error::$1"
  tail -50 "$log" || true
  exit 1
}

timeout=120
elapsed=0
echo "Waiting for Metro bundler to be ready..."
until curl -s --max-time 5 http://localhost:8081/status 2>/dev/null | grep -q "packager-status:running"; do
  if [ "$elapsed" -ge "$timeout" ]; then
    fail "Metro did not report packager-status:running within ${timeout}s"
  fi
  if [ $((elapsed % 10)) -eq 0 ] && [ "$elapsed" -gt 0 ]; then
    echo "Still waiting for Metro... (${elapsed}s elapsed)"
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done
echo "Metro is running after ${elapsed}s"

# One bounded request: the first bundle builds the whole graph, so it can take minutes.
echo "Requesting the iOS bundle..."
if ! curl -sf --max-time 300 'http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false' 2>/dev/null | grep -q "__d("; then
  fail "Metro did not serve an iOS bundle within 300s"
fi
echo "Metro is serving bundles on http://localhost:8081"
