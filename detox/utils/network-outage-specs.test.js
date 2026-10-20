// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {describe, it} = require('node:test');

const {hasRouteLossSignature, findTestDeviceLog, listNetworkOutageSpecs} = require('./network-outage-specs');

const ROUTE_LOSS_LOG = [
    'nw_endpoint_flow_failed_with_error [C1 IPv6#5f3b.53] unsatisfied (No network route)',
    'CFNetwork Task <A1>.<7> finished with error [-1009] Error Domain=NSURLErrorDomain Code=-1009',
].join('\n');
const QUIC_LOG = 'quic_conn_keepalive_handler keep-alive timer fired\nTask <B2>.<3> finished with error [-1005] Code=-1005';

function writeRun(dir, tests) {
    const results = {testResults: []};
    for (const [file, cases] of Object.entries(tests)) {
        results.testResults.push({
            name: `/runner/work/repo/detox/e2e/test/${file}`,
            assertionResults: cases.map(({title, status, log}) => {
                const fullName = `Suite ${title}`;
                if (log !== undefined) {
                    const testDir = path.join(dir, 'ios.sim.debug.2026-10-18 10-00-00Z', fullName);
                    fs.mkdirSync(testDir, {recursive: true});
                    fs.writeFileSync(path.join(testDir, 'device.log'), log);
                }
                return {fullName, title, status};
            }),
        });
    }
    const resultsPath = path.join(dir, 'jest-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results));
    return resultsPath;
}

describe('network-outage-specs', () => {
    it('should require both the route loss and a -1009 request failure', () => {
        assert.equal(hasRouteLossSignature(ROUTE_LOSS_LOG), true);
        assert.equal(hasRouteLossSignature('unsatisfied (No network route)'), false);
        assert.equal(hasRouteLossSignature('Code=-1009'), false);
        assert.equal(hasRouteLossSignature(QUIC_LOG), false);
    });

    it('should find a test folder whose name lost unsafe characters or was truncated', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outage-'));
        const run = path.join(dir, 'ios.sim.debug.2026-10-18 10-00-00Z');
        fs.mkdirSync(path.join(run, 'Suite MM-T1 - opens a_b channel'), {recursive: true});
        fs.writeFileSync(path.join(run, 'Suite MM-T1 - opens a_b channel', 'device.log'), 'x');
        const longName = `Suite MM-T2 - ${'very long title '.repeat(10)}`;
        const truncated = longName.slice(0, 80);
        fs.mkdirSync(path.join(run, truncated), {recursive: true});
        fs.writeFileSync(path.join(run, truncated, 'device.log'), 'y');

        assert.equal(findTestDeviceLog(dir, 'Suite MM-T1 - opens a/b channel'), path.join(run, 'Suite MM-T1 - opens a_b channel', 'device.log'));
        assert.equal(findTestDeviceLog(dir, longName), path.join(run, truncated, 'device.log'));
        assert.equal(findTestDeviceLog(dir, 'Suite MM-T3 - not recorded'), null);
    });

    it('should re-run only files whose every failure carries the route-loss signature', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outage-'));
        const results = writeRun(dir, {
            'outage.e2e.ts': [
                {title: 'MM-T1 - a', status: 'failed', log: ROUTE_LOSS_LOG},
                {title: 'MM-T2 - b', status: 'passed'},
            ],
            'mixed.e2e.ts': [
                {title: 'MM-T3 - c', status: 'failed', log: ROUTE_LOSS_LOG},
                {title: 'MM-T4 - d', status: 'failed', log: 'assertion failed'},
            ],
            'quic.e2e.ts': [{title: 'MM-T5 - e', status: 'failed', log: QUIC_LOG}],
            'nolog.e2e.ts': [{title: 'MM-T6 - f', status: 'failed'}],
            'green.e2e.ts': [{title: 'MM-T7 - g', status: 'passed'}],
        });

        const {specs, tests} = listNetworkOutageSpecs(results, dir);
        assert.deepEqual(specs, ['detox/e2e/test/outage.e2e.ts']);
        assert.deepEqual(tests, ['Suite MM-T1 - a']);
    });

    it('should not use a truncated folder that another test\'s name also starts with', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outage-'));
        const run = path.join(dir, 'ios.sim.debug.2026-10-18 10-00-00Z');
        const prefix = `Suite MM-T8 - ${'shared long title '.repeat(5)}`;
        const truncated = prefix.slice(0, 80);
        fs.mkdirSync(path.join(run, truncated), {recursive: true});
        fs.writeFileSync(path.join(run, truncated, 'device.log'), ROUTE_LOSS_LOG);

        assert.equal(findTestDeviceLog(dir, `${prefix} first`, [`${prefix} second`]), null);
        assert.equal(findTestDeviceLog(dir, `${prefix} first`, ['Suite MM-T9 - unrelated']), path.join(run, truncated, 'device.log'));
    });

    it('should keep red a failure whose name another test in the report shares', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outage-'));
        const results = writeRun(dir, {
            'one.e2e.ts': [{title: 'MM-T10 - same', status: 'failed', log: ROUTE_LOSS_LOG}],
            'two.e2e.ts': [{title: 'MM-T10 - same', status: 'failed'}],
        });

        assert.deepEqual(listNetworkOutageSpecs(results, dir), {specs: [], tests: []});
    });

    it('should re-run nothing when the report is missing or unreadable', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outage-'));
        assert.deepEqual(listNetworkOutageSpecs(path.join(dir, 'missing.json'), dir), {specs: [], tests: []});
        fs.writeFileSync(path.join(dir, 'bad.json'), '{');
        assert.deepEqual(listNetworkOutageSpecs(path.join(dir, 'bad.json'), dir), {specs: [], tests: []});
    });
});
