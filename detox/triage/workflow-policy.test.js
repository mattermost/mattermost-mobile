// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');
const triageWorkflow = fs.readFileSync(
    path.join(repoRoot, '.github/workflows/e2e-ai-triage.yml'),
    'utf8',
);
const overrideWorkflow = fs.readFileSync(
    path.join(repoRoot, '.github/workflows/e2e-ai-triage-override.yml'),
    'utf8',
);
const ciWorkflow = fs.readFileSync(
    path.join(repoRoot, '.github/workflows/ci.yml'),
    'utf8',
);
const cmtWorkflow = fs.readFileSync(
    path.join(repoRoot, '.github/workflows/compatibility-matrix-testing.yml'),
    'utf8',
);
const platformWorkflows = [
    '.github/workflows/e2e-ios-template.yml',
    '.github/workflows/e2e-android-template.yml',
    '.github/workflows/e2e-maestro-template.yml',
].map((file) => fs.readFileSync(path.join(repoRoot, file), 'utf8')).join('\n');
const waiverResolver = fs.readFileSync(
    path.join(repoRoot, '.github/actions/e2e-override-label/action.yml'),
    'utf8',
);
const overrideStatusAction = fs.readFileSync(
    path.join(repoRoot, '.github/actions/e2e-override-status/action.yml'),
    'utf8',
);

test('diff overlap is tri-state and unknown vetoes the boolean toolkit waiver', () => {
    const unknown = triageWorkflow.indexOf('echo "state=unknown" >> "$GITHUB_OUTPUT"');
    const lookup = triageWorkflow.indexOf('gh api --paginate');
    const resolvedFalse = triageWorkflow.indexOf('echo "state=false" >> "$GITHUB_OUTPUT"');

    assert.ok(unknown >= 0 && unknown < lookup, 'unknown must be emitted before the API call');
    assert.ok(lookup < resolvedFalse, 'false is only emitted after the files API succeeds');
    assert.match(triageWorkflow, /pulls\/\$\{PR_NUMBER\}\/files\?per_page=100/);
    assert.doesNotMatch(triageWorkflow, /FILES=\$\(gh pr diff/);
    assert.match(triageWorkflow, /diff_overlap_state: \$\{\{ steps\.overlap\.outputs\.state \|\| 'unknown' \}\}/);
    assert.match(triageWorkflow, /diff_overlaps_failure: \$\{\{ needs\.plan\.outputs\.diff_overlap_state != 'false' \}\}/);
});

test('only known triage modes reach the toolkit', () => {
    assert.match(triageWorkflow, /shadow\|assist\|gate\)/);
    assert.match(triageWorkflow, /echo "mode=shadow" >> "\$GITHUB_OUTPUT"[\s\S]*exit 1/);
    assert.match(triageWorkflow, /default: "gate"/);
    assert.match(triageWorkflow, /REQUESTED_MODE: \$\{\{ inputs\.mode \}\}/);
    assert.match(triageWorkflow, /mode: \$\{\{ needs\.plan\.outputs\.triage_mode \}\}/);
    assert.doesNotMatch(triageWorkflow, /mode: \$\{\{ vars\.E2E_AI_TRIAGE_MODE/);
});

// GitHub's `cond && a || b` ternary silently returns `b` whenever `a` is falsy,
// and '' is falsy. Written as `run_type == 'PR' && '' || 'main'` the PR branch
// resolved to 'main', so every PR filed its ledger rows against the baseline —
// the branch amnesty budgets and accuracy metrics are keyed on. Nothing else
// catches this: the expression is valid YAML, valid syntax, and actionlint-clean.
// The invariant is that the non-empty value sits on the `&&` side.
test('the ledger branch does not collapse a PR run onto the baseline', () => {
    assert.match(
        triageWorkflow,
        /branch: \$\{\{ inputs\.version_name \|\| \(inputs\.run_type != 'PR' && 'main' \|\| ''\) \}\}/,
    );
    assert.doesNotMatch(triageWorkflow, /inputs\.run_type == 'PR' && '' \|\| 'main'/);
});

test('triage still runs under E2E/Override, but only observes', () => {
    const prWorkflow = fs.readFileSync(
        path.join(repoRoot, '.github/workflows/e2e-detox-pr.yml'), 'utf8');

    // Bounded to this job. Slicing to end-of-file swept in later jobs that
    // legitimately still gate on the override.
    const start = prWorkflow.indexOf('\n  e2e-ai-triage:');
    const rest = prWorkflow.slice(start + 1);
    const nextJob = rest.search(/\n {2}[a-z][a-z0-9-]*:\n/);
    const job = nextJob === -1 ? rest : rest.slice(0, nextJob);

    // Skipping triage on override suppressed the diagnosis at exactly the moment
    // a maintainer had decided to bypass the gate — and left no ledger row, so
    // the false-green metric could never be computed over the runs humans
    // disagreed with. Participation is unconditional; authority is not.
    assert.doesNotMatch(job, /e2e_override != 'true'/);
    assert.match(job, /if: always\(\) && !cancelled\(\)/);
    assert.match(job, /mode: \$\{\{ needs\.resolve-e2e-policy\.outputs\.e2e_override == 'true' && 'shadow' \|\| 'gate' \}\}/);
});

test('the triage context exists before it has an answer', () => {
    const prWorkflow = fs.readFileSync(
        path.join(repoRoot, '.github/workflows/e2e-detox-pr.yml'), 'utf8');

    // An absent context and a context that resolved with no opinion are the same
    // observation to anything polling this commit. The PR babysitter reacts to a
    // red E2E check by pushing an empty commit, which cancels the in-flight run
    // through its concurrency group — so during the ~2h a rerun takes, the
    // retrigger killed the run that was about to explain the failure.
    const pending = prWorkflow.indexOf('Post pending status for AI triage');
    const triageJob = prWorkflow.indexOf('\n  e2e-ai-triage:');

    assert.ok(pending > 0, 'triage must claim its context up front');
    assert.ok(pending < triageJob, 'the claim must precede the job that resolves it');
    assert.match(prWorkflow, /-f context=e2e-test\/ai-triage \\\n\s+-f description="classifying/);
    assert.match(prWorkflow, /do not retrigger until this resolves/);
});

test('the status marker survives repeated application exactly once', () => {
    // Three contexts on #9996 read "... - e2e overridden - e2e overridden": the
    // action runs more than once per SHA and appending is not idempotent.
    assert.match(overrideStatusAction, /const stripMarkers = \(text\) => \{/);
    assert.match(overrideStatusAction, /e2e overridden\|verified to be/);
    assert.equal(
        (overrideStatusAction.match(/stripMarkers\(latestDescription\)/g) || []).length, 2,
        'both suffix-appending branches must strip first',
    );
    assert.doesNotMatch(
        overrideStatusAction,
        /const base = latestDescription\.substring\(0, Math\.max\(0, 140 - suffix\.length\)\)/,
        'no branch may append to the raw description',
    );
});

test('AI hypotheses narrow reruns and safely fall back when unavailable', () => {
    const candidate = triageWorkflow.indexOf('  ai-candidates:');
    const prepare = triageWorkflow.indexOf('  prepare-rerun:');
    const rerun = triageWorkflow.indexOf('  rerun-ios:');

    assert.ok(candidate > 0 && candidate < prepare && prepare < rerun);
    assert.match(triageWorkflow, /needs\.ai-candidates\.outputs\.available == 'true'/);
    assert.match(triageWorkflow, /CANDIDATE_AVAILABLE: \$\{\{ needs\.ai-candidates\.outputs\.available \}\}/);
    assert.match(triageWorkflow, /--candidate-available="\$\{CANDIDATE_AVAILABLE\}"/);
    assert.match(triageWorkflow, /candidate_artifact: \$\{\{ needs\.ai-candidates\.outputs\.available/);
    assert.match(triageWorkflow, /needs\.prepare-rerun\.outputs\.rerun_ios_specs/);
    assert.doesNotMatch(triageWorkflow, /needs\.plan\.outputs\.rerun_ios_specs/);
});

test('pre-merge toolkit integration uses aligned immutable refs', () => {
    for (const workflow of [triageWorkflow, overrideWorkflow]) {
        const usesRef = workflow.match(/mattermost-test-automation-toolkit\/[^\s@]+@([0-9a-f]{40})/)?.[1];
        const checkoutRef = workflow.match(/toolkit_ref:\s*([0-9a-f]{40})/)?.[1];
        assert.ok(usesRef, 'toolkit workflow must use an immutable commit SHA');
        assert.equal(checkoutRef, usesRef, 'toolkit workflow and checkout refs must match');
    }
    assert.match(ciWorkflow, /ref === 'main' \|\| \/\^\[0-9a-f\]\{40\}\$\//);
    assert.match(ciWorkflow, /checkoutRefs\.length > 0 && !checkoutRefs\.includes\(ref\)/);
    assert.doesNotMatch(ciWorkflow, /grep -v "@main"/);
});

test('platform diagnoses only republish contexts that triage clears', () => {
    const repostJob = triageWorkflow.slice(
        triageWorkflow.indexOf('  repost-platform-contexts:'),
        triageWorkflow.indexOf('  no-verdict:'),
    );

    assert.match(triageWorkflow, /needs\.adjudicate\.result == 'success'/);
    assert.match(repostJob, /needs\.adjudicate\.outputs\.platform_outcomes != '\{\}'/);
    assert.match(repostJob, /needs\.adjudicate\.outputs\.operational_outcome == 'FLAKY_CONFIRMED'/);
    assert.match(repostJob, /ci\/prepare-platform-outcomes/);
    assert.match(repostJob, /Toolkit platform outcomes unavailable; using global FLAKY_CONFIRMED fallback/);
    assert.match(repostJob, /suffix: "verified to be flaky"/);
    assert.equal((repostJob.match(/uses: \.\/\.github\/actions\/e2e-override-status/g) || []).length, 2);
    assert.match(repostJob, /steps\.platforms\.outputs\.ios_suffix/);
    assert.match(repostJob, /steps\.platforms\.outputs\.android_suffix/);

    // Both outcomes publish: green flips the required context, red annotates the
    // diagnosis onto the counts already there. Gating on 'success' left a blocked
    // PR showing raw failure counts with no classification anywhere a reviewer
    // looks, since e2e-test/ai-triage is not a required context. Only an empty
    // state — the platform had no verdict — is skipped. e2e-override-status is
    // what guarantees a red publish never touches a context that passed.
    assert.match(repostJob, /if: steps\.platforms\.outputs\.ios_state != ''/);
    assert.match(repostJob, /if: steps\.platforms\.outputs\.android_state != ''/);
    assert.doesNotMatch(repostJob, /if: steps\.platforms\.outputs\.(?:ios|android)_state == 'success'/);
    assert.match(
        overrideStatusAction,
        /state === 'failure' &&\s*\n\s*latest\?\.state !== 'failure' && latest\?\.state !== 'error'/,
        'a failure publish must skip any context that is not already red',
    );
    assert.match(repostJob, /status_suffix:/);
    assert.match(repostJob, /target_url: \$\{\{ needs\.adjudicate\.outputs\.triage_url/);
    assert.match(repostJob, /platform: ios/);
    assert.match(repostJob, /platform: android/);
    assert.doesNotMatch(repostJob, /continue-on-error:/);
});

test('triage enforces the toolkit operational outcome without unused workflow outputs', () => {
    assert.doesNotMatch(triageWorkflow, /value: \$\{\{ jobs\.adjudicate\.outputs\./);
    assert.match(triageWorkflow, /  enforce-outcome:/);
    assert.match(triageWorkflow, /if \[ "\$STATE" != "success" \]/);
});

test('CMT triages every server version with isolated artifacts and status contexts', () => {
    assert.match(cmtWorkflow, /  cmt-ai-triage:/);
    assert.match(cmtWorkflow, /artifact_pattern: "\*-Server_\$\{\{ matrix\.server\.version \}\}\*"/);
    assert.match(cmtWorkflow, /artifact_namespace: -Server_\$\{\{ matrix\.server\.version \}\}/);
    assert.match(cmtWorkflow, /status_context: e2e-test\/ai-triage-Server_\$\{\{ matrix\.server\.version \}\}/);
    assert.match(cmtWorkflow, /UPSTREAM="\$\{\{ needs\.cmt-ai-triage\.result == 'success'/);
});

test('human triage overrides delegate platform reposting to E2E Override label handling', () => {
    assert.match(overrideWorkflow, /e2e-ai-triage-override\.yml@[0-9a-f]{40}/);
    assert.doesNotMatch(overrideWorkflow, /repost-platform-contexts:/);
    assert.doesNotMatch(overrideWorkflow, /E2E\/AI-Waived — maintainer triage override/);
});

test('late platform finalizers honor only commit-scoped AI waivers', () => {
    assert.equal((platformWorkflows.match(/commit_sha: \$\{\{ fromJSON\(steps\.tsio-cfg\.outputs\.config\)\.composite_identity\.commit_sha \}\}/g) || []).length, 4);
    assert.equal((platformWorkflows.match(/AI_WAIVER: \$\{\{ steps\.e2e-override\.outputs\.ai_waived \}\}/g) || []).length, 4);
    assert.equal((platformWorkflows.match(/--ai-waiver="\$AI_WAIVER"/g) || []).length, 4);
    assert.match(waiverResolver, /listCommitStatusesForRef/);
    assert.match(waiverResolver, /status\.context === 'e2e-test\/ai-triage'/);
    assert.match(waiverResolver, /triageStatus\?\.state === 'success'/);
});
