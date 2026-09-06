#!/usr/bin/env bash
# Optional PR-babysitter smoke check. Not run at boot.
# Mirrors the Ubuntu jobs in .github/workflows/ci.yml that this VM can execute.
#
# Usage:
#   bash .cursor/scripts/cloud-agent-smoke.sh
#   bash .cursor/scripts/cloud-agent-smoke.sh --with-jest

set -Eeuo pipefail

log() { printf '[cloud-agent-smoke] %s\n' "$*" >&2; }

WITH_JEST=0
for arg in "$@"; do
  case "$arg" in
    --with-jest) WITH_JEST=1 ;;
    -h|--help)
      sed -n '2,9p' "$0"
      exit 0
      ;;
    *)
      log "Unknown argument: $arg"
      exit 2
      ;;
  esac
done

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

run() {
  log "+ $*"
  "$@"
}

run npm run lint
run npm run tsc
# extract/clean-empty can rewrite non-en locale files; restore those after the check.
run ./scripts/precommit/i18n.sh
non_en_locales="$(git diff --name-only -- assets/base/i18n | grep -v '/en.json$' || true)"
if [ -n "$non_en_locales" ]; then
  log "Restoring non-en locale files dirtied by i18n.sh"
  printf '%s\n' "$non_en_locales" | xargs -r git checkout --
fi
run npm --prefix detox run tsc
run bash detox/maestro/scripts/validate-flow-headers.sh
run npm --prefix detox run test:unit

if [ "$WITH_JEST" -eq 1 ]; then
  run npm run test:ci
else
  log "Skipping Jest (pass --with-jest to run npm run test:ci)"
fi

log "Smoke checks passed"
