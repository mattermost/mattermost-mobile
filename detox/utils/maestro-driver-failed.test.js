// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {isMaestroDriverFailure} = require('./maestro-driver-failed');

const grpcXml = `<?xml version='1.0' encoding='UTF-8'?>
<testsuites>
  <testsuite name="Test Suite" tests="1" failures="1" time="0.0">
    <testcase name="attach_logs_toggle_on_surfaces_option" time="0.0" status="ERROR">
      <failure>io.grpc.StatusRuntimeException: UNAVAILABLE
Caused by: java.io.IOException: Command failed (tcp:43729): closed</failure>
    </testcase>
  </testsuite>
</testsuites>`;

describe('isMaestroDriverFailure', () => {
    it('should match an Android gRPC UNAVAILABLE death that wrote 0s JUnit', () => {
        assert.equal(isMaestroDriverFailure('[Failed] attach_logs_toggle_on_surfaces_option (0s)', grpcXml), true);
    });

    it('should match an iOS driver timeout with no JUnit', () => {
        assert.equal(isMaestroDriverFailure('IOSDriverTimeoutException: iOS driver not ready in time', ''), true);
    });

    it('should not match a real assertion failure that ran for minutes', () => {
        const xml = '<testcase name="clock_display" time="152.4"><failure>Assertion failed: id not visible</failure></testcase>';
        assert.equal(isMaestroDriverFailure('Assertion failed: id not visible', xml), false);
    });

    it('should not match a passing batch', () => {
        const xml = '<testcase name="attach_logs" time="150.0"></testcase>';
        assert.equal(isMaestroDriverFailure('[Passed] attach_logs (2m 30s)', xml), false);
    });

    it('should not match a 0s assertion failure without a driver signature', () => {
        const xml = '<testcase name="clock_display" time="0.0"><failure>Assertion failed: id not visible</failure></testcase>';
        assert.equal(isMaestroDriverFailure('Assertion failed: id not visible', xml), false);
    });
});
