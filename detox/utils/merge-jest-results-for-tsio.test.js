// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/merge-jest-results-for-tsio.test.js`.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {describe, it} = require('node:test');

const {
    mergeJestResultsForTsio,
    toTsioDetoxSuite,
    relativizeDetoxPath,
    writeMergedJestResultsForTsio,
} = require('./merge-jest-results-for-tsio');

describe('merge-jest-results-for-tsio', () => {
    it('should keep already-relative paths (any e2e layout) unchanged', () => {
        assert.equal(
            relativizeDetoxPath('detox/e2e/test/foo.e2e.ts'),
            'detox/e2e/test/foo.e2e.ts',
        );
        assert.equal(
            relativizeDetoxPath('e2e/detox/test/foo.e2e.ts'),
            'e2e/detox/test/foo.e2e.ts',
        );
        assert.equal(
            relativizeDetoxPath('e2e/maestro/flows/calls/mute.yml'),
            'e2e/maestro/flows/calls/mute.yml',
        );
    });

    it('should strip absolute paths against an explicit repo root', () => {
        assert.equal(
            relativizeDetoxPath(
                '/home/runner/work/mattermost-mobile/mattermost-mobile/e2e/detox/test/foo.e2e.ts',
                {repoRoot: '/home/runner/work/mattermost-mobile/mattermost-mobile'},
            ),
            'e2e/detox/test/foo.e2e.ts',
        );
        assert.equal(
            relativizeDetoxPath(
                '/home/runner/work/mattermost-mobile/mattermost-mobile/detox/e2e/test/foo.e2e.ts',
                {repoRoot: '/home/runner/work/mattermost-mobile/mattermost-mobile'},
            ),
            'detox/e2e/test/foo.e2e.ts',
        );
    });

    it('should fall back to GitHub Actions /work/<repo>/<repo>/ stripping', () => {
        assert.equal(
            relativizeDetoxPath(
                '/home/runner/work/mattermost-mobile/mattermost-mobile/e2e/detox/test/foo.e2e.ts',
                {repoRoot: '/tmp/not-the-root'},
            ),
            'e2e/detox/test/foo.e2e.ts',
        );
    });

    it('should convert Jest CLI suites (name + assertionResults) to TSIO Detox shape', () => {
        const converted = toTsioDetoxSuite({
            name: '/repo/e2e/detox/test/products/agents/agent_mention.e2e.ts',
            startTime: 1000,
            assertionResults: [{
                ancestorTitles: ['Autocomplete - Agent Mention'],
                duration: 12,
                failureMessages: ['boom'],
                fullName: 'Autocomplete - Agent Mention should show bot',
                status: 'failed',
                title: 'should show bot',
            }],
        }, {repoRoot: '/repo'});

        assert.deepEqual(converted, {
            testFilePath: 'e2e/detox/test/products/agents/agent_mention.e2e.ts',
            perfStats: {start: 1000},
            testResults: [{
                ancestorTitles: ['Autocomplete - Agent Mention'],
                duration: 12,
                failureMessages: ['boom'],
                fullName: 'Autocomplete - Agent Mention should show bot',
                status: 'failed',
                title: 'should show bot',
            }],
        });
    });

    it('should pass through suites already in TSIO Detox shape', () => {
        const converted = toTsioDetoxSuite({
            testFilePath: 'e2e/detox/test/foo.e2e.ts',
            testResults: [{
                ancestorTitles: [],
                duration: 1,
                failureMessages: [],
                fullName: 'foo',
                status: 'passed',
                title: 'foo',
            }],
        });

        assert.equal(converted.testFilePath, 'e2e/detox/test/foo.e2e.ts');
        assert.equal(converted.testResults.length, 1);
        assert.equal(converted.testResults[0].status, 'passed');
    });

    it('should merge multiple CLI shard files into one TSIO payload with real test cases', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsio-merge-'));
        const a = path.join(dir, 'a.json');
        const b = path.join(dir, 'b.json');
        fs.writeFileSync(a, JSON.stringify({
            numTotalTests: 1,
            testResults: [{
                name: '/x/e2e/detox/test/a.e2e.ts',
                assertionResults: [{
                    ancestorTitles: ['A'],
                    duration: 1,
                    failureMessages: [],
                    fullName: 'A pass',
                    status: 'passed',
                    title: 'pass',
                }],
            }],
        }));
        fs.writeFileSync(b, JSON.stringify({
            numTotalTests: 1,
            testResults: [{
                name: '/x/e2e/detox/test/b.e2e.ts',
                assertionResults: [{
                    ancestorTitles: ['B'],
                    duration: 2,
                    failureMessages: ['fail'],
                    fullName: 'B fail',
                    status: 'failed',
                    title: 'fail',
                }],
            }],
        }));

        const opts = {repoRoot: '/x'};
        const merged = mergeJestResultsForTsio([a, b], opts);
        assert.equal(merged.testResults.length, 2);
        assert.equal(merged.testResults[0].testFilePath, 'e2e/detox/test/a.e2e.ts');
        assert.equal(merged.testResults[0].testResults[0].status, 'passed');
        assert.equal(merged.testResults[1].testFilePath, 'e2e/detox/test/b.e2e.ts');
        assert.equal(merged.testResults[1].testResults[0].status, 'failed');

        assert.equal(merged.testResults[0].assertionResults, undefined);
        assert.equal(merged.testResults[0].name, undefined);

        const out = path.join(dir, 'merged.json');
        const stats = writeMergedJestResultsForTsio([a, b], out, opts);
        assert.deepEqual(stats, {suites: 2, tests: 2});
        assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).testResults.length, 2);

        fs.rmSync(dir, {recursive: true, force: true});
    });
});
