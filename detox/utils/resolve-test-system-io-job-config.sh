#!/usr/bin/env bash
# Resolve effective per-job Test System IO config JSON on stdout.
# If TEST_SYSTEM_IO_CONFIG already has status_context (PR/main), pass through.
# Otherwise expand from composite_identity + TEST_SYSTEM_IO_SHARD_NAME (CMT).
set -euo pipefail

if [ -z "${TEST_SYSTEM_IO_CONFIG:-}" ]; then
  echo "resolve-test-system-io-job-config: TEST_SYSTEM_IO_CONFIG is empty" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export SCRIPT_DIR

node <<'NODE'
const path = require('path');
const {buildTestSystemIoJobConfig, webhookBucketForReportName} = require(path.join(process.env.SCRIPT_DIR, 'build-test-system-io-job-config.js'));

/** @returns {number|undefined} positive safe integer, or undefined when unset */
function parsePositiveWorkers(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  const trimmed = String(raw).trim();
  // Reject decimals, suffixes, exponents, signs, and leading zeros (parseInt traps).
  if (!/^[1-9]\d*$/.test(trimmed)) {
    console.error(`resolve-test-system-io-job-config: TEST_SYSTEM_IO_WORKERS must be a positive integer, got ${JSON.stringify(raw)}`);
    process.exit(1);
  }
  const workers = Number.parseInt(trimmed, 10);
  // Guard unsafe integers / Infinity so JSON never serializes null for the count.
  if (!Number.isSafeInteger(workers) || workers < 1) {
    console.error(`resolve-test-system-io-job-config: TEST_SYSTEM_IO_WORKERS must be a positive integer, got ${JSON.stringify(raw)}`);
    process.exit(1);
  }
  return workers;
}

const raw = process.env.TEST_SYSTEM_IO_CONFIG;
const shard = process.env.TEST_SYSTEM_IO_SHARD_NAME || '';
const workers = parsePositiveWorkers(process.env.TEST_SYSTEM_IO_WORKERS);
let cfg;
try {
  cfg = JSON.parse(raw);
} catch (err) {
  console.error('resolve-test-system-io-job-config: invalid TEST_SYSTEM_IO_CONFIG JSON:', err.message);
  process.exit(1);
}

if (cfg.status_context && cfg.composite_identity?.name) {
  // Keep pass-through total_reports_expected aligned with the worker matrix.
  if (workers !== undefined) {
    cfg.total_reports_expected = workers;
  }
  process.stdout.write(JSON.stringify(cfg));
  process.exit(0);
}

if (!shard) {
  console.error('resolve-test-system-io-job-config: status_context missing and TEST_SYSTEM_IO_SHARD_NAME empty');
  process.exit(1);
}

const base = {...(cfg.composite_identity || {})};
// Ensure prefix is the bucket name (mobile-release / mobile-pr / mobile-main).
const name = base.name || base.run_group || 'mobile-release';
const prefix = webhookBucketForReportName(name) || name;
base.name = prefix;
base.run_group = prefix;

const overrides = workers !== undefined ? {workers} : {};
const expanded = buildTestSystemIoJobConfig(base, shard, overrides);
process.stdout.write(JSON.stringify(expanded));
NODE
