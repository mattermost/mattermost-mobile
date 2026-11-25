// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/rerun-failed.test.js`.

const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {describe, it} = require('node:test');

const {MAX_SPECS_PER_LANE, differsFrom, planRerun, mainInputs, cmtMatrices, loadRerunResults, lookupRerunResult} = require('./rerun-failed');

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
                {lane: 'maestro-android-e2e', findings: [row('clock_display', 'detox/maestro/flows/timezone/clock_display.yml')]},
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

        it('leaves isolated report-problem flows out of main and CMT re-runs', () => {
            const mail = 'detox/maestro/flows/account/report_problem_mail_mode.yml';
            const link = 'detox/maestro/flows/account/report_problem_link_mode.yml';
            const ordinary = 'detox/maestro/flows/account/report_problem_action.yml';
            const findings = [row('mail', mail), row('link', link), row('action', ordinary)];
            const plan = planRerun([
                {lane: 'maestro-ios-e2e', findings: [row('link', link)]},
                {lane: 'maestro-android-e2e', findings},
                {lane: 'maestro-android-Server_12.0.1', findings},
            ]);

            assert.deepEqual(plan.lanes, {
                'maestro-android-e2e': {files: [ordinary], titles: ['action']},
                'maestro-android-Server_12.0.1': {files: [ordinary], titles: ['action']},
            });
            assert.deepEqual(mainInputs(plan).maestro['maestro-android-e2e'], ordinary);
            assert.deepEqual(cmtMatrices(plan, {server: [{version: '12.0.1'}]})['maestro-android'], {
                server: [{version: '12.0.1', specs: ordinary}],
            });
        });

        it('does not count isolated flows toward the lane limit', () => {
            const findings = Array.from({length: MAX_SPECS_PER_LANE}, (_, i) => row(`t${i}`, `detox/maestro/flows/account/f${i}.yml`));
            findings.push(row('mail', 'detox/maestro/flows/account/report_problem_mail_mode.yml'));
            findings.push(row('link', 'detox/maestro/flows/account/report_problem_link_mode.yml'));
            const plan = planRerun([{lane: 'maestro-android-e2e', findings}]);

            assert.deepEqual(plan.tooMany, {});
            assert.equal(plan.lanes['maestro-android-e2e'].files.length, MAX_SPECS_PER_LANE);
            assert.equal(plan.lanes['maestro-android-e2e'].titles.length, MAX_SPECS_PER_LANE);
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
                'detox-android': new Map([['detox/e2e/test/a.e2e.ts\nMM-T1 - logs in', 'failed'], ['detox/e2e/test/a.e2e.ts\nMM-T2 - logs out', 'passed']]),
                'maestro-android-Server_12.1.0-rc2': new Map([['clock_display', 'passed'], ['leave_call', 'failed']]),
            });
            assert.deepEqual(loadRerunResults(path.join(dir, 'missing')), {});
        } finally {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });

    it('keys Detox rerun results by file and fullName so same-title tests in different specs or blocks do not collide', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rerun-id-'));
        try {
            const folder = path.join(dir, 'e2e-rerun-results-detox-ios-a1');
            fs.mkdirSync(folder);
            fs.writeFileSync(path.join(folder, 'jest-results-merged.json'), JSON.stringify({testResults: [
                {
                    testFilePath: 'detox/e2e/test/a.e2e.ts',
                    testResults: [
                        {title: 'spec did not run', fullName: 'detox/e2e/test/a.e2e.ts — spec did not run', status: 'passed'},
                        {title: 'renders', fullName: 'Suite A > renders', status: 'passed'},
                        {title: 'renders', fullName: 'Suite B > renders', status: 'failed'},
                    ],
                },
                {
                    testFilePath: 'detox/e2e/test/b.e2e.ts',
                    testResults: [
                        {title: 'spec did not run', fullName: 'detox/e2e/test/b.e2e.ts — spec did not run', status: 'failed'},
                    ],
                },
            ]}));
            const loaded = loadRerunResults(dir);
            const lane = loaded['detox-ios'];
            assert.equal(lookupRerunResult(lane, {file: 'detox/e2e/test/a.e2e.ts', full_title: 'detox/e2e/test/a.e2e.ts — spec did not run', title: 'spec did not run'}), 'passed');
            assert.equal(lookupRerunResult(lane, {file: 'detox/e2e/test/b.e2e.ts', full_title: 'detox/e2e/test/b.e2e.ts — spec did not run', title: 'spec did not run'}), 'failed');
            assert.equal(lookupRerunResult(lane, {file: 'detox/e2e/test/c.e2e.ts', full_title: 'detox/e2e/test/c.e2e.ts — spec did not run', title: 'spec did not run'}), undefined);
            assert.equal(lookupRerunResult(lane, {file: 'detox/e2e/test/a.e2e.ts', full_title: 'Suite A > renders', title: 'renders'}), 'passed');
            assert.equal(lookupRerunResult(lane, {file: 'detox/e2e/test/a.e2e.ts', full_title: 'Suite B > renders', title: 'renders'}), 'failed');
        } finally {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });

    it('keys Maestro rerun results by file attribute when present and falls back to title for legacy maps', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rerun-maestro-'));
        try {
            const folder = path.join(dir, 'e2e-rerun-results-maestro-ios-a1');
            fs.mkdirSync(folder);
            fs.writeFileSync(path.join(folder, 'maestro-report.xml'), [
                '<testsuites><testsuite name="flows">',
                '<testcase id="submit" name="submit" file="detox/maestro/flows/a/submit.yml" classname="detox/maestro/flows/a/submit.yml" time="1.0" status="SUCCESS"></testcase>',
                '<testcase id="submit" name="submit" file="detox/maestro/flows/b/submit.yml" classname="detox/maestro/flows/b/submit.yml" time="1.0" status="ERROR"><failure>boom</failure></testcase>',
                '</testsuite></testsuites>',
            ].join('\n'));
            const loaded = loadRerunResults(dir);
            const lane = loaded['maestro-ios'];
            assert.equal(lookupRerunResult(lane, {file: 'detox/maestro/flows/a/submit.yml', full_title: 'detox/maestro/flows/a/submit.yml > submit', title: 'submit'}), 'passed');
            assert.equal(lookupRerunResult(lane, {file: 'detox/maestro/flows/b/submit.yml', full_title: 'detox/maestro/flows/b/submit.yml > submit', title: 'submit'}), 'failed');
            assert.equal(lookupRerunResult(new Map([['submit', 'passed']]), {file: 'detox/maestro/flows/a/submit.yml', full_title: 'detox/maestro/flows/a/submit.yml > submit', title: 'submit'}), 'passed');
        } finally {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });

    it('detects Maestro status="FAILED"/"ERROR" without <failure> child, unescapes XML entities, and handles mixed file/bare maps', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rerun-maestro-xml-'));
        try {
            const folder = path.join(dir, 'e2e-rerun-results-maestro-ios-a1');
            fs.mkdirSync(folder);
            fs.writeFileSync(path.join(folder, 'maestro-report.xml'), [
                '<testsuites><testsuite name="flows">',
                '<testcase id="f1" name="login &amp; &quot;verify&quot;" file="detox/maestro/flows/a/login&amp;1.yml" time="1.0" status="FAILED"/>',
                '<testcase id="f2" name="err" file="detox/maestro/flows/a/err.yml" time="1.0" status="ERROR"></testcase>',
                '<testcase id="f3" name="bare-fail" classname="Suite" time="1.0" status="FAILED"/>',
                '</testsuite></testsuites>',
            ].join('\n'));
            const lane = loadRerunResults(dir)['maestro-ios'];
            assert.equal(lookupRerunResult(lane, {file: 'detox/maestro/flows/a/login&1.yml', title: 'login & "verify"'}), 'failed');
            assert.equal(lookupRerunResult(lane, {file: 'detox/maestro/flows/a/err.yml', title: 'err'}), 'failed');
            assert.equal(lookupRerunResult(lane, {file: 'detox/maestro/flows/other/bare.yml', title: 'bare-fail'}), undefined);
            assert.equal(lookupRerunResult(lane, {title: 'bare-fail'}), 'failed');
        } finally {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });

    it('differsFrom compares two explicit refs so main checkout still detects release-branch stale specs', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'differs-'));
        const prev = process.cwd();
        try {
            const git = (...args) => execFileSync('git', args, {cwd: dir, encoding: 'utf8'}).trim();
            git('init');
            git('config', 'user.email', 'test@example.com');
            git('config', 'user.name', 'Test');
            fs.writeFileSync(path.join(dir, 'a.ts'), 'v1\n');
            fs.writeFileSync(path.join(dir, 'b.ts'), 'same\n');
            git('add', '.');
            git('commit', '-m', 'release');
            const releaseSha = git('rev-parse', 'HEAD');
            fs.writeFileSync(path.join(dir, 'a.ts'), 'v2\n');
            git('add', 'a.ts');
            git('commit', '-m', 'main');
            const mainSha = git('rev-parse', 'HEAD');
            process.chdir(dir);
            const isStale = differsFrom(mainSha, releaseSha);
            assert.equal(isStale('a.ts'), true, 'file changed on main since release commit');
            assert.equal(isStale('b.ts'), false, 'unchanged file is not stale');
        } finally {
            process.chdir(prev);
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });
});
