// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {missingShardMatrix, readNameList} = require('./missing-shards');

describe('missingShardMatrix', () => {
    const expected = {
        include: [
            {runId: 1, specs: 'a.e2e.ts'},
            {runId: 16, specs: 'b.e2e.ts'},
            {runId: 28, specs: 'c.e2e.ts'},
        ],
    };
    const prefix = 'ios-results-abc123-';

    it('should return no missing shards when every runId uploaded', () => {
        const result = missingShardMatrix(expected, [
            `${prefix}1`,
            `${prefix}16`,
            `${prefix}28`,
            'unrelated-artifact',
        ], prefix);
        assert.equal(result.has_missing, false);
        assert.equal(result.missing_count, 0);
        assert.equal(result.found_count, 3);
        assert.deepEqual(result.specs.include, []);
    });

    it('should select only the runIds with no matching artifact', () => {
        const result = missingShardMatrix(expected, [
            `${prefix}1`,
            `${prefix}28`,
        ], prefix);
        assert.equal(result.has_missing, true);
        assert.equal(result.missing_count, 1);
        assert.equal(result.found_count, 2);
        assert.deepEqual(result.specs.include, [{runId: 16, specs: 'b.e2e.ts'}]);
    });

    it('should not retry when every shard is missing — that is systemic, not runner deaths', () => {
        const result = missingShardMatrix(expected, [], prefix);
        assert.equal(result.missing_count, 3);
        assert.equal(result.found_count, 0);
        assert.equal(result.has_missing, false, 'a wholesale miss must not spend a second full matrix');
        assert.deepEqual(result.specs.include, []);
        assert.match(result.skipped_reason, /exceeds the 25% retry cap/);
    });

    it('should retry a single dead shard out of a full matrix', () => {
        const twenty = {include: Array.from({length: 20}, (_, i) => ({runId: i + 1, specs: `s${i}.e2e.ts`}))};
        const names = twenty.include.slice(1).map((row) => `${prefix}${row.runId}`);
        const result = missingShardMatrix(twenty, names, prefix);
        assert.equal(result.has_missing, true);
        assert.equal(result.missing_count, 1);
        assert.equal(result.skipped_reason, '');
        assert.deepEqual(result.specs.include.map((r) => r.runId), [1]);
    });

    it('should ignore artifact names that only share a prefix substring', () => {
        // Cap raised to 1 so this exercises only the name matching, not the retry cap.
        const result = missingShardMatrix(expected, [
            'ios-results-abc123-1-extra',
            `${prefix}16`,
        ], prefix, 1);
        assert.equal(result.missing_count, 2);
        assert.deepEqual(result.specs.include.map((r) => r.runId), [1, 28]);
    });
});

describe('readNameList', () => {
    it('should drop blank lines', () => {
        assert.deepEqual(readNameList('a\n\n  b  \n'), ['a', 'b']);
    });
});

describe('missing-shards CLI GITHUB_OUTPUT', () => {
    it('should write has_missing and missing_specs for a dead shard', () => {
        const fs = require('node:fs');
        const os = require('node:os');
        const path = require('node:path');
        const {spawnSync} = require('node:child_process');

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'missing-shards-'));
        const expectedPath = path.join(dir, 'expected.json');
        const namesPath = path.join(dir, 'names.txt');
        const outputPath = path.join(dir, 'out.json');
        const ghOutputPath = path.join(dir, 'github-output');
        fs.writeFileSync(expectedPath, JSON.stringify({
            include: [
                {runId: '1', specs: 'a.e2e.ts'},
                {runId: '16', specs: 'b.e2e.ts'},
            ],
        }));
        fs.writeFileSync(namesPath, 'ios-results-abc123-1\n');
        const result = spawnSync(process.execPath, [
            path.join(__dirname, 'missing-shards.js'),
            '--prefix', 'ios-results-abc123-',
            '--expected-specs', expectedPath,
            '--artifact-names', namesPath,
            '--output', outputPath,
        ], {
            // eslint-disable-next-line no-process-env -- pass GITHUB_OUTPUT to the CLI
            env: {...process.env, GITHUB_OUTPUT: ghOutputPath},
            encoding: 'utf8',
        });
        assert.equal(result.status, 0, result.stderr);
        const gh = fs.readFileSync(ghOutputPath, 'utf8');
        assert.match(gh, /^has_missing=true$/m);
        assert.match(gh, /^missing_count=1$/m);
        assert.match(gh, /missing_specs=\{"include":\[\{"runId":"16","specs":"b.e2e.ts"\}\]\}/);
    });
});
