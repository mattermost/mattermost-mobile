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
const platformWorkflows = [
    '.github/workflows/e2e-ios-template.yml',
    '.github/workflows/e2e-android-template.yml',
    '.github/workflows/e2e-maestro-template.yml',
].map((file) => fs.readFileSync(path.join(repoRoot, file), 'utf8')).join('\n');
const waiverResolver = fs.readFileSync(
    path.join(repoRoot, '.github/actions/e2e-override-label/action.yml'),
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
    assert.match(triageWorkflow, /mode: \$\{\{ needs\.plan\.outputs\.triage_mode \}\}/);
    assert.doesNotMatch(triageWorkflow, /mode: \$\{\{ vars\.E2E_AI_TRIAGE_MODE/);
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

test('automated waiver repost is PR-only and requires exact successful toolkit output', () => {
    const repostJob = triageWorkflow.slice(
        triageWorkflow.indexOf('  repost-platform-contexts:'),
        triageWorkflow.indexOf('  no-verdict:'),
    );

    assert.match(triageWorkflow, /inputs\.run_type == 'PR'/);
    assert.match(triageWorkflow, /needs\.adjudicate\.result == 'success'/);
    assert.match(triageWorkflow, /needs\.adjudicate\.outputs\.waived == 'true'/);
    assert.match(repostJob, /uses: \.\/\.github\/actions\/e2e-override-status/);
    assert.match(repostJob, /description: E2E\/AI-Waived/);
    assert.match(repostJob, /target_url: \$\{\{ needs\.adjudicate\.outputs\.triage_url/);
    assert.match(repostJob, /platform: \$\{\{ inputs\.platform \}\}/);
    assert.doesNotMatch(repostJob, /continue-on-error:/);
});

test('human triage override consumes equivalent fail-closed outputs', () => {
    assert.match(overrideWorkflow, /needs\.override\.result == 'success'/);
    assert.match(overrideWorkflow, /needs\.override\.outputs\.waived == 'true'/);
    assert.match(overrideWorkflow, /needs\.override\.outputs\.commit_sha != ''/);
    assert.match(overrideWorkflow, /description: E2E\/AI-Waived — maintainer triage override/);
    assert.match(overrideWorkflow, /target_url: \$\{\{ needs\.override\.outputs\.triage_url/);
    assert.doesNotMatch(overrideWorkflow, /continue-on-error:/);
});

test('late platform finalizers honor only commit-scoped AI waivers', () => {
    assert.equal((platformWorkflows.match(/commit_sha: \$\{\{ fromJSON\(steps\.tsio-cfg\.outputs\.config\)\.composite_identity\.commit_sha \}\}/g) || []).length, 4);
    assert.equal((platformWorkflows.match(/AI_WAIVER: \$\{\{ steps\.e2e-override\.outputs\.ai_waived \}\}/g) || []).length, 4);
    assert.equal((platformWorkflows.match(/--ai-waiver="\$AI_WAIVER"/g) || []).length, 4);
    assert.match(waiverResolver, /listCommitStatusesForRef/);
    assert.match(waiverResolver, /status\.context === 'e2e-test\/ai-triage'/);
    assert.match(waiverResolver, /triageStatus\?\.state === 'success'/);
});
