#!/usr/bin/env bash
# Resolve effective per-job TSIO config JSON on stdout.
# If TSIO_CONFIG already has status_context (PR/main), pass through.
# Otherwise expand from composite_identity + TSIO_SHARD_NAME (CMT).
set -euo pipefail

if [ -z "${TSIO_CONFIG:-}" ]; then
  echo "resolve-tsio-job-config: TSIO_CONFIG is empty" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export SCRIPT_DIR

node <<'NODE'
const path = require('path');
const {buildTsioJobConfig} = require(path.join(process.env.SCRIPT_DIR, 'build-tsio-job-config.js'));

const raw = process.env.TSIO_CONFIG;
const shard = process.env.TSIO_SHARD_NAME || '';
let cfg;
try {
  cfg = JSON.parse(raw);
} catch (err) {
  console.error('resolve-tsio-job-config: invalid TSIO_CONFIG JSON:', err.message);
  process.exit(1);
}

if (cfg.status_context && cfg.composite_identity?.name) {
  process.stdout.write(JSON.stringify(cfg));
  process.exit(0);
}

if (!shard) {
  console.error('resolve-tsio-job-config: status_context missing and TSIO_SHARD_NAME empty');
  process.exit(1);
}

const base = {...(cfg.composite_identity || {})};
// Ensure prefix is the bucket name (mobile-release / mobile-pr / mobile-main).
const name = base.name || base.run_group || 'mobile-release';
const prefix = name.startsWith('mobile-release')
  ? 'mobile-release'
  : name.startsWith('mobile-main')
    ? 'mobile-main'
    : name.startsWith('mobile-pr')
      ? 'mobile-pr'
      : name;
base.name = prefix;
base.run_group = prefix;

const expanded = buildTsioJobConfig(base, shard);
process.stdout.write(JSON.stringify(expanded));
NODE
