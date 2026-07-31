// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI utility script */

/**
 * Build per-platform TSIO upload + GitHub commit-status config.
 *
 * Each Detox/Maestro platform job owns one report group (total_reports_expected=1)
 * and one commit-status context, so jobs cannot clobber each other's finalize.
 */

// Commit-status namespace, aligned with the mattermost monorepo (`e2e-test/*`).
const STATUS_CONTEXT_PREFIX = 'e2e-test';

const PR_MAIN_JOBS = {
    'detox-ios': {statusName: 'detox-ios', framework: 'detox'},
    'detox-android': {statusName: 'detox-android', framework: 'detox'},
    'detox-ipad': {statusName: 'detox-ipad', framework: 'detox'},
    'maestro-ios-e2e': {statusName: 'maestro-ios', framework: 'maestro'},
    'maestro-android-e2e': {statusName: 'maestro-android', framework: 'maestro'},
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
 * @param {object} baseIdentity - shared fields (repository, commit_sha, branch, name prefix, …)
 * @param {string} jobKey - tsio-shard-name / platform key (e.g. detox-ios, detox-ios-Server_11.9.0)
 * @param {{statusName?: string, framework?: string}} [overrides]
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
    const prefix = baseIdentity.name || baseIdentity.run_group || 'mobile-pr';
    const reportName = `${prefix}-${jobKey}`;
    const framework = overrides.framework || known?.framework ||
        frameworkFromJobKey(jobKey) || baseIdentity.framework || 'detox';
    const statusName = overrides.statusName || known?.statusName || jobKey;

    return {
        composite_identity: {
            ...baseIdentity,
            name: reportName,
            run_group: reportName,
            framework,
        },
        total_reports_expected: 1,
        status_context: statusContextFor(statusName),
    };
}

/**
 * @param {object} baseIdentity
 * @param {string[]} jobKeys
 * @returns {Record<string, ReturnType<typeof buildTsioJobConfig>>}
 */
function buildTsioJobConfigMap(baseIdentity, jobKeys) {
    const out = {};
    for (const key of jobKeys) {
        out[key] = buildTsioJobConfig(baseIdentity, key);
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
        return ['detox-ios', 'detox-ipad', 'maestro-ios-e2e'];
    }
    if (p === 'android') {
        return ['detox-android', 'maestro-android-e2e'];
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
 * Map report group name to webhook routing bucket (mobile-pr / mobile-main / mobile-release).
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
    buildTsioJobConfig,
    buildTsioJobConfigMap,
    jobKeysForPlatform,
    cmtJobKeys,
    webhookBucketForReportName,
};
