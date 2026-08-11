// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI utility script */

/**
 * Build per-platform TSIO upload + GitHub commit-status config.
 *
 * Each Detox/Maestro platform job owns one report group and one commit-status
 * context. With orchestration, total_reports_expected equals the worker matrix
 * size so the report group finalizes when every worker shard uploads.
 */

// Commit-status namespace, aligned with the mattermost monorepo (`e2e-test/*`).
const STATUS_CONTEXT_PREFIX = 'e2e-test';

// workers = orchestration matrix size (must match template `parallelism` defaults).
// PR defaults: Android full (20 Detox workers); iOS phone complementary (~30 tagged specs / 4 workers).
// MAIN/MASTER/RELEASE override detox-ios parallelism back to 20 in e2e-detox.yml.
const PR_MAIN_JOBS = {
    'detox-ios': {statusName: 'detox-ios', framework: 'detox', workers: 4},
    'detox-android': {statusName: 'detox-android', framework: 'detox', workers: 20},
    'detox-ipad': {statusName: 'detox-ipad', framework: 'detox', workers: 1},
    'maestro-ios': {statusName: 'maestro-ios', framework: 'maestro', workers: 1},
    'maestro-android': {statusName: 'maestro-android', framework: 'maestro', workers: 1},
};

/**
 * @param {string} name - unprefixed check name (e.g. detox-ios, detox-ios-Server_11.9.0)
 * @returns {string} namespaced commit-status context (e.g. e2e-test/detox-ios)
 */
function statusContextFor(name) {
    return `${STATUS_CONTEXT_PREFIX}/${name}`;
}

// The required contexts a PR must satisfy to merge. Single source of truth for
// .github/actions/e2e-override-status, which waives them and requires this file
// from the workspace checkout.
const E2E_STATUS_CONTEXTS = Object.values(PR_MAIN_JOBS).map((job) => statusContextFor(job.statusName));

/**
 * CMT shard keys (detox-ios-Server_11.9.0, maestro-android-Server_11.9.0) are not in
 * PR_MAIN_JOBS, so infer the framework from the key. Without this a Maestro shard
 * inherits the base identity's `detox`, disagreeing with the `framework: maestro`
 * the upload action posts for the same report group.
 * @param {string} jobKey
 * @returns {string|undefined}
 */
function frameworkFromJobKey(jobKey) {
    if (jobKey.startsWith('maestro-')) {
        return 'maestro';
    }
    if (jobKey.startsWith('detox-')) {
        return 'detox';
    }
    return undefined;
}

/**
 * Default worker count for a CMT shard key when not overridden.
 * Latest Detox phone shards use 10; everything else uses 1.
 * @param {string} jobKey
 * @param {boolean} latest
 * @returns {number}
 */
function cmtWorkersForJobKey(jobKey, latest) {
    if (!latest) {
        return 1;
    }
    if (jobKey.startsWith('detox-ios-') && !jobKey.includes('ipad')) {
        return 10;
    }
    if (jobKey.startsWith('detox-android-')) {
        return 10;
    }
    return 1;
}

/**
 * @param {object} baseIdentity - shared fields (repository, commit_sha, branch, name prefix, …)
 * @param {string} jobKey - tsio-shard-name / platform key (e.g. detox-ios, detox-ios-Server_11.9.0)
 * @param {{statusName?: string, framework?: string, workers?: number, totalReportsExpected?: number}} [overrides]
 * @returns {{composite_identity: object, total_reports_expected: number, status_context: string}}
 */
function buildTsioJobConfig(baseIdentity, jobKey, overrides = {}) {
    if (!baseIdentity || typeof baseIdentity !== 'object') {
        throw new Error('buildTsioJobConfig: baseIdentity is required');
    }
    if (!jobKey || typeof jobKey !== 'string') {
        throw new Error('buildTsioJobConfig: jobKey is required');
    }

    const known = PR_MAIN_JOBS[jobKey];

    // Report group names are the shard key only (detox-ios, maestro-android, …).
    // Keep the mobile-pr/main/release bucket on run_group for webhook routing.
    const prefix = baseIdentity.name || baseIdentity.run_group || 'mobile-pr';
    const webhookBucket = webhookBucketForReportName(prefix) || prefix;
    const framework = overrides.framework || known?.framework ||
        frameworkFromJobKey(jobKey) || baseIdentity.framework || 'detox';
    const statusName = overrides.statusName || known?.statusName || jobKey;
    const workers = overrides.totalReportsExpected ?? overrides.workers ?? known?.workers ?? 1;

    return {
        composite_identity: {
            ...baseIdentity,
            name: jobKey,
            run_group: webhookBucket,
            framework,
        },
        total_reports_expected: workers,
        status_context: statusContextFor(statusName),
    };
}

/**
 * @param {object} baseIdentity
 * @param {string[]} jobKeys
 * @param {(jobKey: string) => ({workers?: number, totalReportsExpected?: number, framework?: string}|undefined)} [overrideForKey]
 * @returns {Record<string, ReturnType<typeof buildTsioJobConfig>>}
 */
function buildTsioJobConfigMap(baseIdentity, jobKeys, overrideForKey) {
    const out = {};
    for (const key of jobKeys) {
        const overrides = typeof overrideForKey === 'function' ? (overrideForKey(key) || {}) : {};
        out[key] = buildTsioJobConfig(baseIdentity, key, overrides);
    }
    return out;
}

/**
 * Job keys that run for a given PLATFORM input (ios | android | both).
 * @param {string} [platform]
 * @returns {string[]}
 */
function jobKeysForPlatform(platform) {
    const p = (platform || 'both').toLowerCase();
    if (p === 'ios') {
        return ['detox-ios', 'detox-ipad', 'maestro-ios'];
    }
    if (p === 'android') {
        return ['detox-android', 'maestro-android'];
    }
    return Object.keys(PR_MAIN_JOBS);
}

// CMT shard names are `<framework>-<platform>-Server_<version>` (see
// compatibility-matrix-testing.yml tsio-shard-name inputs).
const CMT_DETOX_SHARD_PREFIXES = ['detox-ios', 'detox-ipad', 'detox-android'];
const CMT_MAESTRO_SHARD_PREFIXES = ['maestro-ios', 'maestro-android'];

/**
 * CMT shard keys for the channel rollup. Detox runs against every server version in
 * the matrix; Maestro only against the latest-filtered `prepare-maestro-matrix` output.
 *
 * @param {{server?: Array<{version?: string}>}} cmtMatrix - inputs.CMT_MATRIX
 * @param {{server?: Array<{version?: string}>}} [maestroMatrix] - prepare-maestro-matrix output
 * @returns {string[]}
 */
function cmtJobKeys(cmtMatrix, maestroMatrix) {
    const versionsOf = (matrix) => (matrix && Array.isArray(matrix.server) ? matrix.server : []).
        map((entry) => entry && entry.version).
        filter(Boolean);

    const keys = [];
    for (const version of versionsOf(cmtMatrix)) {
        for (const prefix of CMT_DETOX_SHARD_PREFIXES) {
            keys.push(`${prefix}-Server_${version}`);
        }
    }
    for (const version of versionsOf(maestroMatrix)) {
        for (const prefix of CMT_MAESTRO_SHARD_PREFIXES) {
            keys.push(`${prefix}-Server_${version}`);
        }
    }
    return keys;
}

/**
 * Build CMT per-shard TSIO configs with total_reports_expected matching each
 * template's parallelism (10 for latest Detox phone, else 1).
 *
 * @param {object} baseIdentity
 * @param {{server?: Array<{version?: string, latest?: boolean}>}} cmtMatrix
 * @param {{server?: Array<{version?: string, latest?: boolean}>}} [maestroMatrix]
 * @returns {Record<string, ReturnType<typeof buildTsioJobConfig>>}
 */
function buildCmtTsioJobConfigMap(baseIdentity, cmtMatrix, maestroMatrix) {
    const latestVersions = new Set(
        (cmtMatrix && Array.isArray(cmtMatrix.server) ? cmtMatrix.server : []).
            filter((entry) => entry && entry.latest && entry.version).
            map((entry) => entry.version),
    );
    const keys = cmtJobKeys(cmtMatrix, maestroMatrix);
    return buildTsioJobConfigMap(baseIdentity, keys, (jobKey) => {
        const versionMatch = /Server_(.+)$/.exec(jobKey);
        const version = versionMatch ? versionMatch[1] : '';
        const latest = latestVersions.has(version);
        return {workers: cmtWorkersForJobKey(jobKey, latest)};
    });
}

/**
 * Map report group name or run_group to webhook routing bucket
 * (mobile-pr / mobile-main / mobile-release).
 * Accepts legacy prefixed names (mobile-pr-detox-ios) and bare buckets (mobile-pr).
 * @param {string} reportName
 * @returns {string}
 */
function webhookBucketForReportName(reportName) {
    if (!reportName || typeof reportName !== 'string') {
        return '';
    }
    if (reportName === 'mobile-release' || reportName.startsWith('mobile-release-')) {
        return 'mobile-release';
    }
    if (reportName === 'mobile-main' || reportName.startsWith('mobile-main-')) {
        return 'mobile-main';
    }
    if (reportName === 'mobile-pr' || reportName.startsWith('mobile-pr-')) {
        return 'mobile-pr';
    }
    return reportName;
}

module.exports = {
    PR_MAIN_JOBS,
    E2E_STATUS_CONTEXTS,
    frameworkFromJobKey,
    cmtWorkersForJobKey,
    buildTsioJobConfig,
    buildTsioJobConfigMap,
    buildCmtTsioJobConfigMap,
    jobKeysForPlatform,
    cmtJobKeys,
    webhookBucketForReportName,
};
