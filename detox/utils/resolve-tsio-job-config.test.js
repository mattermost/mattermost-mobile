// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const {describe, it} = require('node:test');

const SCRIPT = path.join(__dirname, 'resolve-tsio-job-config.sh');
const PASS_THROUGH = JSON.stringify({
    status_context: 'e2e-test/detox-ios',
    composite_identity: {name: 'mobile-pr-detox-ios', commit_sha: 'abc'},
    total_reports_expected: 20,
});

function run(env) {
    return spawnSync('bash', [SCRIPT], {
        env: {...process.env, ...env},
        encoding: 'utf8',
    });
}

describe('resolve-tsio-job-config.sh', () => {
    it('should pass through config and honour a valid TSIO_WORKERS override', () => {
        const result = run({TSIO_CONFIG: PASS_THROUGH, TSIO_WORKERS: '10'});
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(result.stdout).total_reports_expected, 10);
    });

    it('should leave total_reports_expected unchanged when TSIO_WORKERS is unset', () => {
        const result = run({TSIO_CONFIG: PASS_THROUGH, TSIO_WORKERS: ''});
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(result.stdout).total_reports_expected, 20);
    });

    it('should accept Number.MAX_SAFE_INTEGER', () => {
        const result = run({
            TSIO_CONFIG: PASS_THROUGH,
            TSIO_WORKERS: String(Number.MAX_SAFE_INTEGER),
        });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(JSON.parse(result.stdout).total_reports_expected, Number.MAX_SAFE_INTEGER);
    });

    it('should reject the first unsafe integer', () => {
        const result = run({
            TSIO_CONFIG: PASS_THROUGH,
            // MAX_SAFE_INTEGER is 9007199254740991; +2 is the first odd unsafe int.
            TSIO_WORKERS: '9007199254740993',
        });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /TSIO_WORKERS must be a positive integer/);
    });

    it('should reject values that parse to Infinity', () => {
        const result = run({
            TSIO_CONFIG: PASS_THROUGH,
            TSIO_WORKERS: '9'.repeat(309),
        });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /TSIO_WORKERS must be a positive integer/);
    });

    for (const value of ['0', '-1', '2.5', '2workers', '1e3', '01', '+2', 'abc']) {
        it(`should reject invalid TSIO_WORKERS=${JSON.stringify(value)}`, () => {
            const result = run({TSIO_CONFIG: PASS_THROUGH, TSIO_WORKERS: value});
            assert.notEqual(result.status, 0);
        });
    }
});
