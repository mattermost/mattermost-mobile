// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/rerun-failed.test.js`.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {describe, it} = require('node:test');

const {MAX_SPECS_PER_LANE, planRerun, mainInputs, cmtMatrices, loadRerunResults} = require('./rerun-failed');

const row = (title, file, cls = 'REGRESSION', label = 'needs investigation') => ({title, full_title: title, file, class: cls, label});

describe('rerun-failed', () => {
    describe('planRerun', () => {
        it('re-runs only the failures triage could not clear, each spec once', () => {
            const plan = planRerun([
                {lane: 'detox-android',
                    findings: [
                        row('MM-T1 - logs in', 'detox/e2e/test/a.e2e.ts'),
                        row('MM-T2 - logs out', 'detox/e2e/test/a.e2e.ts'),
                        row('MM-T3 - searches', 'detox/e2e/test/b.e2e.ts', 'INSUFFICIENT_DATA'),
                        row('MM-T4 - flaky', 'detox/e2e/test/c.e2e.ts', 'FLAKY_ON_TRUNK', 'flaky'),
                        row('MM-T5 - device died', 'detox/e2e/test/d.e2e.ts', 'INFRA_ERROR'),
                        row('MM-T6 - broken before', 'detox/e2e/test/e.e2e.ts', 'BROKEN_ON_TRUNK', 'broken on main'),
                    ]},
                {lane: 'maestro-android-e2e', findings: [row('clock_display', '/home/runner/work/mobile/detox/maestro/flows/timezone/clock_display.yml')]},
                {lane: 'detox-ios', findings: [row('no file', '')]},
            ]);
            assert.deepEqual(plan, {
                lanes: {
                    'detox-android': {files: ['detox/e2e/test/a.e2e.ts', 'detox/e2e/test/b.e2e.ts'], titles: ['MM-T1 - logs in', 'MM-T2 - logs out', 'MM-T3 - searches']},
                    'maestro-android-e2e': {files: ['detox/maestro/flows/timezone/clock_display.yml'], titles: ['clock_display']},
                },
                tooMany: {},
                stale: {},
            });
            assert.deepEqual(mainInputs(plan), {
                detox: {'detox-android': 'detox/e2e/test/a.e2e.ts detox/e2e/test/b.e2e.ts'},
                maestro: {'maestro-android-e2e': 'detox/maestro/flows/timezone/clock_display.yml'},
            });
        });

        it('does not re-run a lane where too many specs failed at once', () => {
            const findings = Array.from({length: MAX_SPECS_PER_LANE + 1}, (_, i) => row(`t${i}`, `detox/e2e/test/s${i}.e2e.ts`));
            assert.deepEqual(planRerun([{lane: 'detox-android', findings}]), {lanes: {}, tooMany: {'detox-android': MAX_SPECS_PER_LANE + 1}, stale: {}});
        });

        it('does not re-run on a release build a spec that differs from main', () => {
            const plan = planRerun([{lane: 'detox-ios-Server_12.0.0-rc3',
                findings: [
                    row('MM-T4896_1 - markdown image', 'detox/e2e/test/products/channels/messaging/markdown_image.e2e.ts'),
                    row('MM-T1 - logs in', 'detox/e2e/test/a.e2e.ts'),
                ]}], {isStale: (file) => file.endsWith('markdown_image.e2e.ts')});
            assert.deepEqual(plan.lanes, {'detox-ios-Server_12.0.0-rc3': {files: ['detox/e2e/test/a.e2e.ts'], titles: ['MM-T1 - logs in']}});
            assert.deepEqual(plan.stale, {'detox-ios-Server_12.0.0-rc3': ['MM-T4896_1 - markdown image']});
        });

        it('leaves out the tests already known to differ from main, so they do not count toward the limit', () => {
            const findings = Array.from({length: MAX_SPECS_PER_LANE + 1}, (_, i) => row(`t${i}`, `detox/e2e/test/s${i}.e2e.ts`));
            const plan = planRerun([{lane: 'detox-android-Server_12.0.1', findings}], {stale: {'detox-android-Server_12.0.1': ['t0', 't1']}});
            assert.deepEqual(plan.tooMany, {});
            assert.equal(plan.lanes['detox-android-Server_12.0.1'].files.length, MAX_SPECS_PER_LANE - 1);
            assert.deepEqual(plan.stale, {'detox-android-Server_12.0.1': ['t0', 't1']});
        });
    });

    it('re-runs a CMT lane against its own server', () => {
        const plan = planRerun([
            {lane: 'detox-ios-Server_12.0.1', findings: [row('MM-T1 - logs in', 'detox/e2e/test/a.e2e.ts')]},
            {lane: 'maestro-android-Server_12.1.0-rc2', findings: [row('clock_display', 'detox/maestro/flows/timezone/clock_display.yml')]},
            {lane: 'detox-android-Server_9.9.9', findings: [row('MM-T2 - unknown server', 'detox/e2e/test/b.e2e.ts')]},
        ]);
        const matrix = {server: [{version: '12.0.1', latest: false, ios_site_1_url: 'https://a'}, {version: '12.1.0-rc2', latest: true, android_site_1_url: 'https://b'}]};
        assert.deepEqual(cmtMatrices(plan, matrix), {
            'detox-ios': {server: [{version: '12.0.1', latest: false, ios_site_1_url: 'https://a', specs: 'detox/e2e/test/a.e2e.ts'}]},
            'maestro-android': {server: [{version: '12.1.0-rc2', latest: true, android_site_1_url: 'https://b', specs: 'detox/maestro/flows/timezone/clock_display.yml'}]},
        });
    });

    it('reads each re-run test result, and a pass on any try is a pass', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rerun-'));
        try {
            fs.mkdirSync(path.join(dir, 'e2e-rerun-results-detox-android-a1'));
            fs.writeFileSync(path.join(dir, 'e2e-rerun-results-detox-android-a1', 'jest-results-merged.json'), JSON.stringify({testResults: [
                {testFilePath: 'detox/e2e/test/a.e2e.ts',
                    testResults: [
                        {title: 'MM-T1 - logs in', status: 'failed'},
                        {title: 'MM-T2 - logs out', status: 'failed'},
                        {title: 'MM-T2 - logs out', status: 'passed'},
                        {title: 'MM-T9 - skipped', status: 'pending'},
                    ]},
            ]}));
            fs.mkdirSync(path.join(dir, 'e2e-rerun-results-maestro-android-Server_12.1.0-rc2-a2'));
            fs.writeFileSync(path.join(dir, 'e2e-rerun-results-maestro-android-Server_12.1.0-rc2-a2', 'maestro-report.xml'), [
                '<testsuites><testsuite name="flows">',
                '<testcase id="clock_display" name="clock_display" classname="x" time="1.0" status="SUCCESS">',
                '</testcase>',
                '<testcase id="leave_call" name="leave_call" classname="x" time="1.0" status="ERROR">',
                '<failure>Element not found</failure>',
                '</testcase>',
                '<testcase name="skipped_flow"><skipped/></testcase>',
                '</testsuite></testsuites>',
            ].join('\n'));
            fs.mkdirSync(path.join(dir, 'e2e-triage-findings-detox-ios-a1'));
            assert.deepEqual(loadRerunResults(dir), {
                'detox-android': new Map([['MM-T1 - logs in', 'failed'], ['MM-T2 - logs out', 'passed']]),
                'maestro-android-Server_12.1.0-rc2': new Map([['clock_display', 'passed'], ['leave_call', 'failed']]),
            });
            assert.deepEqual(loadRerunResults(path.join(dir, 'missing')), {});
        } finally {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });
});
