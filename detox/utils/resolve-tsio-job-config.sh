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
const {buildTsioJobConfig, webhookBucketForReportName} = require(path.join(process.env.SCRIPT_DIR, 'build-tsio-job-config.js'));

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
  // Keep pass-through total_reports_expected aligned with the worker matrix.
  const workers = process.env.TSIO_WORKERS ? Number.parseInt(process.env.TSIO_WORKERS, 10) : undefined;
  if (Number.isFinite(workers) && workers > 0) {
    cfg.total_reports_expected = workers;
  }
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
const prefix = webhookBucketForReportName(name) || name;
base.name = prefix;
base.run_group = prefix;

const workers = process.env.TSIO_WORKERS ? Number.parseInt(process.env.TSIO_WORKERS, 10) : undefined;
const overrides = Number.isFinite(workers) ? {workers} : {};
const expanded = buildTsioJobConfig(base, shard, overrides);
process.stdout.write(JSON.stringify(expanded));
NODE
