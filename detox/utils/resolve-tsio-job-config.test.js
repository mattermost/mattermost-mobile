// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env -- spawns the bash resolver with inherited PATH */

const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const {describe, it} = require('node:test');

const SCRIPT = path.join(__dirname, 'resolve-tsio-job-config.sh');
const PASS_THROUGH = {
    status_context: 'e2e-test/detox-ios',
    composite_identity: {name: 'mobile-pr-detox-ios', commit_sha: 'abc'},
    total_reports_expected: 20,
};
const PASS_THROUGH_JSON = JSON.stringify(PASS_THROUGH);

function run(env, unsetKeys = []) {
    const childEnv = {...process.env, ...env};
    for (const key of unsetKeys) {
        delete childEnv[key];
    }
    return spawnSync('bash', [SCRIPT], {
        env: childEnv,
        encoding: 'utf8',
    });
}

function assertWorkersRejected(result) {
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /TSIO_WORKERS must be a positive integer/);
}

describe('resolve-tsio-job-config.sh', () => {
    it('should pass through config and honour a valid TSIO_WORKERS override', () => {
        const result = run({TSIO_CONFIG: PASS_THROUGH_JSON, TSIO_WORKERS: '10'});
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(result.stdout), {
            ...PASS_THROUGH,
            total_reports_expected: 10,
        });
    });

    it('should leave total_reports_expected unchanged when TSIO_WORKERS is unset', () => {
        const result = run({TSIO_CONFIG: PASS_THROUGH_JSON}, ['TSIO_WORKERS']);
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(result.stdout), PASS_THROUGH);
    });

    it('should accept Number.MAX_SAFE_INTEGER', () => {
        const result = run({
            TSIO_CONFIG: PASS_THROUGH_JSON,
            TSIO_WORKERS: String(Number.MAX_SAFE_INTEGER),
        });
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(result.stdout), {
            ...PASS_THROUGH,
            total_reports_expected: Number.MAX_SAFE_INTEGER,
        });
    });

    // First unsafe integer is MAX_SAFE_INTEGER + 1 (9007199254740992).
    it('should reject the first unsafe integer', () => {
        const result = run({
            TSIO_CONFIG: PASS_THROUGH_JSON,
            TSIO_WORKERS: String(Number.MAX_SAFE_INTEGER + 1),
        });
        assertWorkersRejected(result);
    });

    it('should reject values that parse to Infinity', () => {
        const result = run({
            TSIO_CONFIG: PASS_THROUGH_JSON,
            TSIO_WORKERS: '9'.repeat(309),
        });
        assertWorkersRejected(result);
    });

    for (const value of ['0', '-1', '2.5', '2workers', '1e3', '01', '+2', 'abc']) {
        it(`should reject invalid TSIO_WORKERS=${JSON.stringify(value)}`, () => {
            assertWorkersRejected(run({TSIO_CONFIG: PASS_THROUGH_JSON, TSIO_WORKERS: value}));
        });
    }
});
