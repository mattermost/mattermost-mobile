// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {describe, it} = require('node:test');

const {
    specKey,
    listRetrySpecs,
    mergeJestResultsPreferLater,
} = require('./failed-jest-specs');

describe('failed-jest-specs', () => {
    it('should key absolute Jest paths to the same spec as the matrix entry', () => {
        assert.equal(
            specKey('/home/runner/work/mattermost-mobile/mattermost-mobile/detox/e2e/test/channels/channel_bookmarks.e2e.ts'),
            'detox/e2e/test/channels/channel_bookmarks.e2e.ts',
        );
        assert.equal(
            specKey('detox/e2e/test/channels/channel_bookmarks.e2e.ts'),
            'detox/e2e/test/channels/channel_bookmarks.e2e.ts',
        );
    });

    it('should retry the whole shard when the Jest report is missing', () => {
        const specs = ['detox/e2e/test/a.e2e.ts', 'detox/e2e/test/b.e2e.ts'];
        assert.deepEqual(listRetrySpecs('/no/such/jest-results.json', specs), specs);
    });

    it('should retry failed and missing files, not passers', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'failed-specs-'));
        const results = path.join(dir, 'jest-results.json');
        fs.writeFileSync(results, JSON.stringify({
            testResults: [
                {
                    name: '/repo/detox/e2e/test/pass.e2e.ts',
                    status: 'passed',
                    assertionResults: [{status: 'passed', title: 'ok'}],
                },
                {
                    name: '/repo/detox/e2e/test/fail.e2e.ts',
                    status: 'failed',
                    numFailingTests: 2,
                    assertionResults: [{status: 'failed', title: 'nope'}],
                },
            ],
        }));

        const retry = listRetrySpecs(results, [
            'detox/e2e/test/pass.e2e.ts',
            'detox/e2e/test/fail.e2e.ts',
            'detox/e2e/test/never-ran.e2e.ts',
        ]);
        assert.deepEqual(retry, [
            'detox/e2e/test/fail.e2e.ts',
            'detox/e2e/test/never-ran.e2e.ts',
        ]);
        fs.rmSync(dir, {recursive: true, force: true});
    });

    it('should not retry a file that only has skipped tests', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'failed-specs-skip-'));
        const results = path.join(dir, 'jest-results.json');
        fs.writeFileSync(results, JSON.stringify({
            testResults: [{
                name: '/repo/detox/e2e/test/skip.e2e.ts',
                status: 'passed',
                assertionResults: [{status: 'pending', title: 'skipped'}],
            }],
        }));
        assert.deepEqual(
            listRetrySpecs(results, ['detox/e2e/test/skip.e2e.ts']),
            [],
        );
        fs.rmSync(dir, {recursive: true, force: true});
    });

    it('should let attempt-2 results replace the same spec from attempt 1', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'failed-specs-merge-'));
        const a = path.join(dir, 'a.json');
        const b = path.join(dir, 'b.json');
        fs.writeFileSync(a, JSON.stringify({
            testResults: [
                {name: '/repo/detox/e2e/test/pass.e2e.ts', status: 'passed', assertionResults: [{status: 'passed'}]},
                {name: '/repo/detox/e2e/test/fail.e2e.ts', status: 'failed', assertionResults: [{status: 'failed'}]},
            ],
        }));
        fs.writeFileSync(b, JSON.stringify({
            testResults: [
                {name: '/repo/detox/e2e/test/fail.e2e.ts', status: 'passed', assertionResults: [{status: 'passed'}]},
            ],
        }));

        const merged = mergeJestResultsPreferLater([a, b]);
        assert.equal(merged.testResults.length, 2);
        assert.equal(merged.success, true);
        assert.equal(merged.numFailedTests, 0);
        const failSuite = merged.testResults.find((s) => specKey(s.name).endsWith('fail.e2e.ts'));
        assert.equal(failSuite.status, 'passed');
        fs.rmSync(dir, {recursive: true, force: true});
    });
});
