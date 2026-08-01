#!/usr/bin/env node
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env -- CI utility script: it reads GITHUB_OUTPUT/GITHUB_STEP_SUMMARY and writes to stdout by design */

/**
 * Triage CLI — stage 0 and stage 1 of E2E failure triage.
 *
 * Reads a run's downloaded artifacts, normalizes them, clusters by failure
 * signature, applies the deterministic rule catalogue, enriches with TSIO
 * history, and emits:
 *
 *   evidence.json    the full bundle (also the model's only input)
 *   rerun-plan.json  which specs to rerun, already capped
 *   spec-list-<platform>.txt  ready to feed generate-specs' spec_list input
 *   summary.md       human-readable, for the job summary
 *
 * Everything here is deterministic. No model is called. The point is that by the
 * time a model runs, most of the decision has already been made by data.
 *
 * Usage:
 *   node detox/triage/triage.js \
 *     --artifacts=detox/artifacts --output=triage-out \
 *     --repo=mattermost/mattermost-mobile --commit=<sha> [--pr=123] [--branch=main]
 */

const fs = require('fs');
const path = require('path');

const {classify} = require('./classify');
const {collect} = require('./collect');
const {enrich, PRODUCTION_URL} = require('./history');

function parseArgs(argv) {
    const args = {};
    for (const arg of argv.slice(2)) {
        const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
        if (match) {
            args[match[1]] = match[2] === undefined ? 'true' : match[2];
        }
    }
    return args;
}

function writeSpecLists(outputDir, rerunPlan) {
    const byPlatform = new Map();
    for (const entry of rerunPlan.specs || []) {
        if (!byPlatform.has(entry.platform)) {
            byPlatform.set(entry.platform, []);
        }
        byPlatform.get(entry.platform).push(entry.spec);
    }
    const written = [];
    for (const [platform, specs] of byPlatform) {
        const file = path.join(outputDir, `spec-list-${platform}.txt`);
        fs.writeFileSync(file, `${[...new Set(specs)].join('\n')}\n`);
        written.push({platform, file, count: new Set(specs).size});
    }
    return written;
}

function renderSummary(result) {
    const lines = [];
    lines.push('## E2E failure triage — deterministic pass', '');
    lines.push(`**Tier ${result.tier}** — ${result.tier_reason}`, '');
    lines.push(
        '| Tests | Passed | Failed | Skipped | Clusters |',
        '|---:|---:|---:|---:|---:|',
        `| ${result.summary.totalTests} | ${result.summary.passed} | ${result.summary.failed} | ${result.summary.skipped} | ${result.clusters.length} |`,
        '',
    );

    if (result.suite_verdict) {
        lines.push(
            `### Suite-level verdict: \`${result.suite_verdict.verdict}\``,
            '',
            `${result.suite_verdict.reason} _(rule \`${result.suite_verdict.rule_id}\`, confidence ${result.suite_verdict.confidence})_`,
            '',
            'A suite-level verdict outranks per-cluster ones: when the run itself failed, individual assertion messages are noise.',
            '',
        );
    }

    if (result.clusters.length > 0) {
        lines.push('### Failure clusters', '');
        lines.push('| # | Signature | Verdict | Conf | Shards | Platforms | Needs model |');
        lines.push('|---:|---|---|---:|---|---|---|');
        for (const c of result.clusters) {
            lines.push([
                '',
                c.member_count,
                `\`${c.signature_hash}\` ${c.signature_label.replace(/\|/g, '\\|').slice(0, 60)}`,
                c.rule_verdict || '—',
                c.confidence,
                c.shards.join(', '),
                c.platforms.join(', '),
                c.needs_ai ? 'yes' : 'no',
                '',
            ].join(' | ').trim());
        }
        lines.push('');
    }

    lines.push('### Rerun plan', '');
    if (result.rerun_plan.enabled) {
        lines.push(`${result.rerun_plan.reason}, ${result.rerun_plan.reps} repetition(s):`, '');
        for (const s of result.rerun_plan.specs) {
            lines.push(`- \`${s.platform}\` ${s.spec}${s.test_id ? ` (${s.test_id})` : ''}`);
        }
    } else {
        lines.push(`Skipped — ${result.rerun_plan.reason}`);
    }
    lines.push('');
    return lines.join('\n');
}

async function main() {
    const args = parseArgs(process.argv);
    const artifacts = args.artifacts || 'detox/artifacts';
    const outputDir = args.output || 'triage-out';
    const repo = args.repo || '';
    const baselineBranch = args.branch || 'main';
    const prNumber = args.pr ? Number(args.pr) : undefined;
    const baseUrl = args['tsio-url'] || PRODUCTION_URL;
    const skipHistory = args['skip-history'] === 'true';

    fs.mkdirSync(outputDir, {recursive: true});

    const collected = collect(artifacts);
    console.log(
        `collected ${collected.failures.length} failure(s) from ${collected.summary.reportsFound} report(s) ` +
        `across ${collected.summary.shards.length} shard(s)`,
    );

    let result = classify(collected);
    console.log(`tier ${result.tier}: ${result.tier_reason}`);
    console.log(`${result.clusters.length} cluster(s); needs_ai=${result.needs_ai}`);

    if (!skipHistory && repo) {
        try {
            result = await enrich(result, {repo, baselineBranch, prNumber, baseUrl});
            console.log(
                `history: looked up ${result.history_meta.looked_up} test(s), ` +
                `${result.history_meta.unavailable} unavailable`,
            );
        } catch (err) {
            // Fail-soft: missing history lowers confidence, which resolves red.
            console.error(`history enrichment failed (continuing without it): ${err.message}`);
        }
    }

    const evidencePath = path.join(outputDir, 'evidence.json');
    fs.writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`);

    const rerunPath = path.join(outputDir, 'rerun-plan.json');
    fs.writeFileSync(rerunPath, `${JSON.stringify(result.rerun_plan, null, 2)}\n`);

    const specLists = writeSpecLists(outputDir, result.rerun_plan);
    for (const s of specLists) {
        console.log(`wrote ${s.count} spec(s) for ${s.platform} → ${s.file}`);
    }

    const summaryPath = path.join(outputDir, 'summary.md');
    fs.writeFileSync(summaryPath, renderSummary(result));

    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, [
            `tier=${result.tier}`,
            `failure_count=${collected.failures.length}`,
            `cluster_count=${result.clusters.length}`,
            `needs_ai=${result.needs_ai}`,
            `rerun_enabled=${result.rerun_plan.enabled}`,
            `evidence_path=${evidencePath}`,
            '',
        ].join('\n'));
    }
    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderSummary(result));
    }
}

if (require.main === module) {
    main().catch((err) => {
        console.error(`triage failed: ${err.stack || err.message}`);

        // Exit non-zero so the caller treats triage as unavailable and falls back
        // to the raw (red) result rather than to silence.
        process.exit(1);
    });
}

module.exports = {parseArgs, renderSummary, writeSpecLists};
