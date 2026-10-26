// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/e2e-run-breakdown.test.js`.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {
    frameworkOf,
    platformOf,
    summarizeRuns,
    toPlainObject,
    renderMarkdown,
} = require('./e2e-run-breakdown');

describe('e2e-run-breakdown', () => {
    it('should classify CMT shard and aggregate job names', () => {
        assert.equal(frameworkOf('mobile-cmt-ios-full-12.1.0-rc1 / machine-21-os-iOS 26.2'), 'detox');
        assert.equal(frameworkOf('mobile-cmt-ios-full-12.1.0-rc1 / detox-ios-Server_12.1.0-rc1'), 'detox');
        assert.equal(frameworkOf('mobile-cmt-maestro-ios-12.1.0-rc1 / maestro-ios-Server_12.1.0-rc1'), 'maestro');
        assert.equal(frameworkOf('update-final-status'), 'other');
        assert.equal(platformOf('mobile-cmt-ipad-12.1.0-rc1 / machine-1-os-iOS 26.2'), 'ipad');
        assert.equal(platformOf('Detox iOS E2E / iOS / detox-ios'), 'ios');
        assert.equal(platformOf('mobile-cmt-android-full-12.1.0-rc1 / machine-3-api-35'), 'android');
    });

    it('should group conclusions per framework and platform and name failing jobs', () => {
        const summary = summarizeRuns([{jobs: [
            {name: 'cmt / detox-ios-Server_1', conclusion: 'failure'},
            {name: 'cmt / machine-1-os-iOS 26.2', conclusion: 'success'},
            {name: 'cmt / machine-2-os-iOS 26.2', conclusion: 'failure'},
            {name: 'cmt / detox-android-Server_1', conclusion: 'success'},
            {name: 'cmt / maestro-android-Server_1', conclusion: 'skipped'},
            {name: 'update-final-status', conclusion: 'success'},
        ]}]);
        const plain = toPlainObject(summary);
        assert.equal(plain['detox/ios'].total, 3);
        assert.equal(plain['detox/ios'].failure, 2);
        assert.deepEqual(plain['detox/ios'].failingJobs, ['cmt / detox-ios-Server_1', 'cmt / machine-2-os-iOS 26.2']);
        assert.equal(plain['detox/android'].success, 1);
        assert.equal(plain['maestro/android'].skipped, 1);
        assert.equal(plain['other/other'].total, 1);
        assert.match(renderMarkdown(summary), /Failing jobs:/);
    });

    it('should count timed-out jobs as failures', () => {
        const summary = summarizeRuns([{jobs: [
            {name: 'cmt / detox-ios-Server_1', conclusion: 'timed_out'},
            {name: 'cmt / detox-ios-Server_2', conclusion: 'some-future-conclusion'},
        ]}]);
        const plain = toPlainObject(summary);
        assert.equal(plain['detox/ios'].failure, 1);
        assert.deepEqual(plain['detox/ios'].failingJobs, ['cmt / detox-ios-Server_1']);
        assert.equal(plain['detox/ios'].other, 1);
    });

    it('should merge jobs across several run payloads', () => {
        const summary = summarizeRuns([
            {jobs: [{name: 'a / detox-ios', conclusion: 'failure'}]},
            {jobs: [{name: 'b / detox-ios', conclusion: 'failure'}]},
            {jobs: []},
            {},
        ]);
        assert.equal(toPlainObject(summary)['detox/ios'].failure, 2);
    });
});
