// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {
    E2E_STATUS_CONTEXTS,
    buildTsioJobConfig,
    buildTsioJobConfigMap,
    buildCmtTsioJobConfigMap,
    jobKeysForPlatform,
    cmtJobKeys,
    webhookBucketForReportName,
} = require('./build-tsio-job-config');

// The override/cancel actions waive and reset exactly these contexts; if this
// list drifts from the required checks, a PR either cannot merge or merges
// while a context still blocks it.
describe('E2E_STATUS_CONTEXTS', () => {
    it('should cover every required PR context exactly once', () => {
        assert.deepEqual(E2E_STATUS_CONTEXTS, [
            'e2e-test/detox-ios',
            'e2e-test/detox-android',
            'e2e-test/detox-ipad',
            'e2e-test/maestro-ios',
            'e2e-test/maestro-android',
        ]);
    });
});

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
        assert.equal(cfg.total_reports_expected, 4);
        assert.equal(cfg.status_context, 'e2e-test/detox-ios');
        assert.equal(cfg.composite_identity.name, 'detox-ios');
        assert.equal(cfg.composite_identity.run_group, 'mobile-pr');
        assert.equal(cfg.composite_identity.framework, 'detox');
        assert.equal(cfg.composite_identity.commit_sha, 'abc1234');
    });

    it('should label maestro jobs with maestro framework and context', () => {
        const cfg = buildTsioJobConfig(base, 'maestro-android');
        assert.equal(cfg.total_reports_expected, 1);
        assert.equal(cfg.status_context, 'e2e-test/maestro-android');
        assert.equal(cfg.composite_identity.framework, 'maestro');
        assert.equal(cfg.composite_identity.name, 'maestro-android');
        assert.equal(cfg.composite_identity.run_group, 'mobile-pr');
    });

    it('should support CMT shard names with <shard> context', () => {
        const cmtBase = {...base, name: 'mobile-release', run_group: 'mobile-release'};
        const cfg = buildTsioJobConfig(cmtBase, 'detox-ios-Server_11.9.0');
        assert.equal(cfg.total_reports_expected, 1);
        assert.equal(cfg.composite_identity.name, 'detox-ios-Server_11.9.0');
        assert.equal(cfg.composite_identity.run_group, 'mobile-release');
        assert.equal(cfg.status_context, 'e2e-test/detox-ios-Server_11.9.0');
    });

    it('should honour an explicit workers override', () => {
        const cfg = buildTsioJobConfig(base, 'detox-ios', {workers: 10});
        assert.equal(cfg.total_reports_expected, 10);
    });

    // The CMT base identity hardcodes framework=detox, but the upload action posts
    // framework=maestro for maestro shards — both must describe the same group.
    it('should infer maestro framework for CMT maestro shards', () => {
        const cmtBase = {...base, name: 'mobile-release', run_group: 'mobile-release'};
        const cfg = buildTsioJobConfig(cmtBase, 'maestro-android-Server_11.9.0');
        assert.equal(cfg.composite_identity.framework, 'maestro');
        assert.equal(cfg.status_context, 'e2e-test/maestro-android-Server_11.9.0');
    });

    it('should let an explicit override win over the inferred framework', () => {
        const cfg = buildTsioJobConfig(base, 'maestro-ios-Server_11.9.0', {framework: 'detox'});
        assert.equal(cfg.composite_identity.framework, 'detox');
    });
});

describe('buildTsioJobConfigMap / jobKeysForPlatform', () => {
    it('should only include ios jobs for PLATFORM=ios', () => {
        assert.deepEqual(jobKeysForPlatform('ios'), ['detox-ios', 'detox-ipad', 'maestro-ios']);
    });

    it('should build a map for the selected keys', () => {
        const base = {name: 'mobile-main', repository: 'mattermost/mattermost-mobile', commit_sha: 'deadbee'};
        const map = buildTsioJobConfigMap(base, jobKeysForPlatform('android'));
        assert.deepEqual(Object.keys(map).sort(), ['detox-android', 'maestro-android']);
        assert.equal(map['detox-android'].status_context, 'e2e-test/detox-android');
        assert.equal(map['detox-android'].composite_identity.name, 'detox-android');
        assert.equal(map['detox-android'].composite_identity.run_group, 'mobile-main');
    });
});

describe('cmtJobKeys / buildCmtTsioJobConfigMap', () => {
    const cmtMatrix = {
        server: [
            {version: '11.9.0', latest: true},
            {version: '10.5.14', latest: false},
        ],
    };

    // Maestro has no smoke-on-older variant, so its shards must not be expanded
    // across every server version — otherwise the rollup polls groups that never exist.
    it('should expand detox shards per server version and maestro only for the latest', () => {
        const maestroMatrix = {server: [{version: '11.9.0', latest: true}]};
        assert.deepEqual(cmtJobKeys(cmtMatrix, maestroMatrix), [
            'detox-ios-Server_11.9.0',
            'detox-ipad-Server_11.9.0',
            'detox-android-Server_11.9.0',
            'detox-ios-Server_10.5.14',
            'detox-ipad-Server_10.5.14',
            'detox-android-Server_10.5.14',
            'maestro-ios-Server_11.9.0',
            'maestro-android-Server_11.9.0',
        ]);
    });

    it('should set CMT worker counts to match template parallelism', () => {
        const cmtBase = {
            repository: 'mattermost/mattermost-mobile',
            commit_sha: 'abc1234',
            name: 'mobile-release',
            run_group: 'mobile-release',
        };
        const maestroMatrix = {server: [{version: '11.9.0', latest: true}]};
        const map = buildCmtTsioJobConfigMap(cmtBase, cmtMatrix, maestroMatrix);
        assert.equal(map['detox-ios-Server_11.9.0'].total_reports_expected, 10);
        assert.equal(map['detox-android-Server_11.9.0'].total_reports_expected, 10);
        assert.equal(map['detox-ipad-Server_11.9.0'].total_reports_expected, 1);
        assert.equal(map['detox-ios-Server_10.5.14'].total_reports_expected, 1);
        assert.equal(map['maestro-ios-Server_11.9.0'].total_reports_expected, 1);
    });

    it('should produce keys that resolve to the mobile-release webhook bucket', () => {
        const base = {name: 'mobile-release', run_group: 'mobile-release', commit_sha: 'abc1234'};
        const map = buildTsioJobConfigMap(base, cmtJobKeys(cmtMatrix, {server: [{version: '11.9.0'}]}));
        assert.equal(Object.keys(map).length, 8);
        assert.equal(map['maestro-ios-Server_11.9.0'].composite_identity.framework, 'maestro');
        assert.equal(map['detox-ios-Server_11.9.0'].composite_identity.name, 'detox-ios-Server_11.9.0');
        assert.equal(
            webhookBucketForReportName(map['detox-ios-Server_11.9.0'].composite_identity.run_group),
            'mobile-release',
        );
    });

    it('should omit maestro shards when no maestro matrix is provided', () => {
        assert.deepEqual(cmtJobKeys({server: [{version: '11.9.0'}]}), [
            'detox-ios-Server_11.9.0',
            'detox-ipad-Server_11.9.0',
            'detox-android-Server_11.9.0',
        ]);
    });
});

describe('webhookBucketForReportName', () => {
    it('should map legacy prefixed names and bare buckets', () => {
        assert.equal(webhookBucketForReportName('mobile-pr-detox-ios'), 'mobile-pr');
        assert.equal(webhookBucketForReportName('mobile-main-maestro-ios'), 'mobile-main');
        assert.equal(webhookBucketForReportName('mobile-release-detox-android-Server_10.5.0'), 'mobile-release');
        assert.equal(webhookBucketForReportName('mobile-pr'), 'mobile-pr');
        assert.equal(webhookBucketForReportName('mobile-main'), 'mobile-main');
        assert.equal(webhookBucketForReportName('mobile-release'), 'mobile-release');
    });
});
