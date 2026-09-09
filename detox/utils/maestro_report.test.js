// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/maestro_report.test.js`.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {afterEach, beforeEach, describe, it} = require('node:test');

const {writeMaestroJestJsonForTsio} = require('./maestro_report');

describe('writeMaestroJestJsonForTsio', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maestro-jest-tsio-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    function writeXml(contents) {
        const xmlPath = path.join(tmpDir, 'maestro-report.xml');
        fs.writeFileSync(xmlPath, contents);
        return xmlPath;
    }

    it('returns false without writing when input is missing or empty', () => {
        const missingOut = path.join(tmpDir, 'missing.json');
        assert.equal(writeMaestroJestJsonForTsio(path.join(tmpDir, 'nope.xml'), missingOut), false);
        assert.equal(fs.existsSync(missingOut), false);

        const emptyXml = writeXml(`<?xml version="1.0"?>
<testsuites>
  <testsuite name="s" tests="0" failures="0" errors="0" skipped="0" time="0"/>
</testsuites>`);
        const emptyOut = path.join(tmpDir, 'empty.json');
        assert.equal(writeMaestroJestJsonForTsio(emptyXml, emptyOut), false);
        assert.equal(fs.existsSync(emptyOut), false);
    });

    it('maps Maestro passed/skipped/failed to Jest passed/pending/failed', () => {
        const xmlPath = writeXml(`<?xml version="1.0"?>
<testsuites>
  <testsuite name="s" tests="3" failures="1" errors="0" skipped="1" time="3">
    <testcase name="login" classname="auth" file="detox/maestro/flows/account/login.yml" time="1.5"/>
    <testcase name="skip_me" classname="auth" file="detox/maestro/flows/account/skip.yml" time="0.1">
      <skipped/>
    </testcase>
    <testcase name="broken" classname="channels" file="detox/maestro/flows/channels/broken.yml" time="1.2">
      <failure message="boom">boom</failure>
    </testcase>
  </testsuite>
</testsuites>`);
        const outPath = path.join(tmpDir, 'out.json');
        assert.equal(writeMaestroJestJsonForTsio(xmlPath, outPath), true);

        const payload = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        const byTitle = Object.fromEntries(
            payload.testResults.flatMap((suite) => suite.assertionResults.map((ar) => [ar.title, ar.status])),
        );
        assert.deepEqual(byTitle, {
            login: 'passed',
            skip_me: 'pending',
            broken: 'failed',
        });
        assert.equal(payload.numPassedTests, 1);
        assert.equal(payload.numPendingTests, 1);
        assert.equal(payload.numFailedTests, 1);
        assert.equal(payload.numTotalTests, 3);
        assert.equal(payload.success, false);
        assert.ok(payload.snapshot);
        assert.equal(payload.snapshot.total, 0);
        assert.equal(payload.wasInterrupted, false);
    });

    it('groups assertions by file/classname key', () => {
        const xmlPath = writeXml(`<?xml version="1.0"?>
<testsuites>
  <testsuite name="s" tests="2" failures="0" errors="0" skipped="0" time="2">
    <testcase name="one" classname="auth" file="detox/maestro/flows/account/login.yml" time="1"/>
    <testcase name="two" classname="auth" file="detox/maestro/flows/account/login.yml" time="1"/>
  </testsuite>
</testsuites>`);
        const outPath = path.join(tmpDir, 'grouped.json');
        assert.equal(writeMaestroJestJsonForTsio(xmlPath, outPath), true);

        const payload = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        assert.equal(payload.numTotalTestSuites, 1);
        assert.equal(payload.testResults.length, 1);
        assert.equal(payload.testResults[0].name, 'detox/maestro/flows/account/login.yml');
        assert.deepEqual(
            payload.testResults[0].assertionResults.map((ar) => ar.title),
            ['one', 'two'],
        );
        assert.equal(payload.success, true);
        assert.equal(payload.numPassedTests, 2);
        assert.equal(payload.numFailedTests, 0);
    });
});
