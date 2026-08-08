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
const {mergeRerun} = require('./rerun');

// Every flag main() reads. Anything else is a caller mistake.
//
// Silently ignoring an unknown flag is the worst failure mode available here: a
// typo in `--artifacts` leaves the default path, which is empty in CI, so triage
// reports "no reports found" and the run resolves red. That is the correct
// fail-closed answer to the wrong question, and it looks identical to a genuine
// infrastructure failure — so the typo survives.
const KNOWN_FLAGS = new Set([
    'artifacts',
    'output',
    'repo',
    'commit',
    'branch',
    'pr',
    'tsio-url',
    'skip-history',
    'rerun-artifacts',
    'evidence-in',
    'prior-evidence',
    'expected-reports',
]);

function parseArgs(argv, knownFlags = KNOWN_FLAGS) {
    const args = {};
    const unknown = [];
    for (const arg of argv.slice(2)) {
        const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
        if (!match) {
            continue;
        }
        if (knownFlags && !knownFlags.has(match[1])) {
            unknown.push(`--${match[1]}`);
            continue;
        }
        args[match[1]] = match[2] === undefined ? 'true' : match[2];
    }
    if (unknown.length > 0) {
        throw new Error(
            `unknown flag(s): ${unknown.join(', ')}. ` +
            `Known flags: ${[...knownFlags].map((f) => `--${f}`).join(', ')}`,
        );
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

    const suiteSignal = result.suite_verdict || result.suite_signal;
    if (suiteSignal) {
        const authoritative = suiteSignal.authoritative !== false;
        lines.push(
            `### Suite-level verdict${authoritative ?'' :' (non-authoritative)'}: \`${suiteSignal.verdict}\``,
            '',
            `${suiteSignal.reason} _(rule \`${suiteSignal.rule_id}\`, confidence ${suiteSignal.confidence})_`,
            '',
            authoritative ?
                'This authoritative suite-level verdict outranks per-cluster ones: when the run itself failed, individual assertion messages are noise.' :
                'This suite-level verdict is context only and does not outrank per-cluster evidence.',
            '',
        );
    }

    if (result.clusters.length > 0) {
        lines.push('### Failure clusters', '');
        lines.push('| Members | Signature | Verdict | Conf | Shards | Platforms | Needs model |');
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

    // Comma-separated artifact roots, one per rerun repetition. Present only on
    // the second triage pass, after the rerun jobs have uploaded their results.
    const rerunRoots = (args['rerun-artifacts'] || '').
        split(',').
        map((v) => v.trim()).
        filter(Boolean);

    fs.mkdirSync(outputDir, {recursive: true});

    // Merge-only pass: the plan job already collected, classified, and enriched,
    // and uploaded the result. Re-collecting here would mean re-downloading the
    // whole artifact tree to rebuild something already known — and would have to
    // re-resolve which spec belonged to which cluster.
    const evidenceIn = args['evidence-in'];
    if (evidenceIn) {
        const prior = JSON.parse(fs.readFileSync(evidenceIn, 'utf8'));

        // The prior bundle must describe the run being finalized.
        //
        // This is the reason meta.commit is stamped at all: the plan artifact is
        // downloaded back by a later job, and nothing else checks that what came
        // back belongs here. Merging a stale bundle would attribute one run's
        // rerun results to another commit's clusters.
        //
        // Thrown rather than returned. An early return writes no evidence.json,
        // which reads downstream as "finalize produced nothing" and silently falls
        // back to the plan artifact — the mismatch would be invisible. Throwing
        // exits non-zero and says why; the caller still falls back to the plan
        // bundle, but the reason is in the log instead of being inferred.
        if (args.commit && prior.meta && prior.meta.commit && prior.meta.commit !== args.commit) {
            throw new Error(
                `evidence bundle is for commit ${prior.meta.commit}, but this run is ${args.commit}`,
            );
        }
        const merged = rerunRoots.length > 0 ? mergeRerun(prior, rerunRoots) : prior;
        if (rerunRoots.length > 0) {
            console.log(
                `rerun: ${merged.rerun_meta.usable_repetitions}/${merged.rerun_meta.repetitions} ` +
                `usable repetition(s) over ${merged.rerun_meta.specs_rerun} spec(s)`,
            );
            for (const c of merged.clusters.filter((x) => x.rerun)) {
                console.log(`  cluster ${c.signature_hash}: ${c.rerun.outcome}`);
            }
        } else {
            console.log('no rerun artifacts supplied — passing prior evidence through unchanged');
        }
        fs.writeFileSync(path.join(outputDir, 'evidence.json'), `${JSON.stringify(merged, null, 2)}\n`);
        fs.writeFileSync(path.join(outputDir, 'summary.md'), renderSummary(merged));
        return;
    }

    const expectedReportsPath = args['expected-reports'];
    const expectedReports = expectedReportsPath ?
        JSON.parse(fs.readFileSync(expectedReportsPath, 'utf8')) :
        [];
    const collected = collect(artifacts, {expectedReports});
    console.log(
        `collected ${collected.failures.length} failure(s) from ${collected.summary.reportsFound} report(s) ` +
        `across ${collected.summary.shards.length} shard(s)`,
    );

    let result = classify(collected);
    console.log(`tier ${result.tier}: ${result.tier_reason}`);
    console.log(`${result.clusters.length} cluster(s); needs_ai=${result.needs_ai}`);

    if (rerunRoots.length > 0) {
        // The prior pass's plan says which spec belongs to which cluster, so the
        // rerun results can be attributed. Reclassifying from scratch would lose
        // that mapping.
        const priorPlan = args['prior-evidence'] && fs.existsSync(args['prior-evidence']) ?JSON.parse(fs.readFileSync(args['prior-evidence'], 'utf8')).rerun_plan :result.rerun_plan;
        result = mergeRerun({...result, rerun_plan: priorPlan}, rerunRoots);
        console.log(
            `rerun: ${result.rerun_meta.usable_repetitions}/${result.rerun_meta.repetitions} ` +
            `usable repetition(s) over ${result.rerun_meta.specs_rerun} spec(s)`,
        );
        for (const c of result.clusters.filter((x) => x.rerun)) {
            console.log(`  cluster ${c.signature_hash}: ${c.rerun.outcome}`);
        }
    }

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

    // Stamp what this bundle is about. The evidence artifact outlives the step
    // that produced it — the final pass downloads it back as `prior/evidence.json`
    // and merges rerun results into it — and until now nothing in the file said
    // which commit or run it described. A bundle that cannot identify itself
    // cannot be checked against the run consuming it, so a mismatched artifact
    // would merge silently.
    result = {
        ...result,
        meta: {
            repo: repo || null,
            commit: args.commit || null,
            branch: baselineBranch,
            pr: prNumber === undefined ? null : prNumber,
            generated_at: new Date().toISOString(),
        },
    };

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
