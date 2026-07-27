// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const {describe, it} = require('node:test');
const assert = require('node:assert/strict');

const {
    buildTsioJobConfig,
    buildTsioJobConfigMap,
    jobKeysForPlatform,
    webhookBucketForReportName,
} = require('./build-tsio-job-config');

describe('buildTsioJobConfig', () => {
    const base = {
        repository: 'mattermost/mattermost-mobile',
        commit_sha: 'abc1234',
        gh_run_id: '99',
        gh_run_attempt: '1',
        branch: 'feat/x',
        name: 'mobile-pr',
        run_group: 'mobile-pr',
        gh_pr_number: '9893',
        framework: 'detox',
    };

    it('should give each job its own report group and status context', () => {
        const cfg = buildTsioJobConfig(base, 'detox-ios');
        assert.equal(cfg.total_reports_expected, 1);
        assert.equal(cfg.status_context, 'e2e/detox-ios');
        assert.equal(cfg.composite_identity.name, 'mobile-pr-detox-ios');
        assert.equal(cfg.composite_identity.run_group, 'mobile-pr-detox-ios');
        assert.equal(cfg.composite_identity.framework, 'detox');
        assert.equal(cfg.composite_identity.commit_sha, 'abc1234');
    });

    it('should label maestro jobs with maestro framework and context', () => {
        const cfg = buildTsioJobConfig(base, 'maestro-android-e2e');
        assert.equal(cfg.status_context, 'e2e/maestro-android');
        assert.equal(cfg.composite_identity.framework, 'maestro');
        assert.equal(cfg.composite_identity.name, 'mobile-pr-maestro-android-e2e');
    });

    it('should support CMT shard names with e2e/<shard> context', () => {
        const cmtBase = {...base, name: 'mobile-release', run_group: 'mobile-release'};
        const cfg = buildTsioJobConfig(cmtBase, 'detox-ios-Server_11.9.0');
        assert.equal(cfg.total_reports_expected, 1);
        assert.equal(cfg.composite_identity.name, 'mobile-release-detox-ios-Server_11.9.0');
        assert.equal(cfg.status_context, 'e2e/detox-ios-Server_11.9.0');
    });
});

describe('buildTsioJobConfigMap / jobKeysForPlatform', () => {
    it('should only include ios jobs for PLATFORM=ios', () => {
        assert.deepEqual(jobKeysForPlatform('ios'), ['detox-ios', 'detox-ipad', 'maestro-ios-e2e']);
    });

    it('should build a map for the selected keys', () => {
        const base = {name: 'mobile-main', repository: 'mattermost/mattermost-mobile', commit_sha: 'deadbee'};
        const map = buildTsioJobConfigMap(base, jobKeysForPlatform('android'));
        assert.deepEqual(Object.keys(map).sort(), ['detox-android', 'maestro-android-e2e']);
        assert.equal(map['detox-android'].status_context, 'e2e/detox-android');
    });
});

describe('webhookBucketForReportName', () => {
    it('should map per-job report names back to PR/main/release buckets', () => {
        assert.equal(webhookBucketForReportName('mobile-pr-detox-ios'), 'mobile-pr');
        assert.equal(webhookBucketForReportName('mobile-main-maestro-ios-e2e'), 'mobile-main');
        assert.equal(webhookBucketForReportName('mobile-release-detox-android-Server_10.5.0'), 'mobile-release');
        assert.equal(webhookBucketForReportName('mobile-pr'), 'mobile-pr');
    });
});
