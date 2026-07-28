// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI utility script */

/**
 * Build per-platform TSIO upload + GitHub commit-status config.
 *
 * Each Detox/Maestro platform job owns one report group (total_reports_expected=1)
 * and one commit-status context, so jobs cannot clobber each other's finalize.
 */

const PR_MAIN_JOBS = {
    'detox-ios': {statusContext: 'detox-ios', framework: 'detox'},
    'detox-android': {statusContext: 'detox-android', framework: 'detox'},
    'detox-ipad': {statusContext: 'detox-ipad', framework: 'detox'},
    'maestro-ios-e2e': {statusContext: 'maestro-ios', framework: 'maestro'},
    'maestro-android-e2e': {statusContext: 'maestro-android', framework: 'maestro'},
};

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
 * @param {{statusContext?: string, framework?: string}} [overrides]
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
    const statusContext = overrides.statusContext || known?.statusContext || jobKey;

    return {
        composite_identity: {
            ...baseIdentity,
            name: reportName,
            run_group: reportName,
            framework,
        },
        total_reports_expected: 1,
        status_context: statusContext,
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
    frameworkFromJobKey,
    buildTsioJobConfig,
    buildTsioJobConfigMap,
    jobKeysForPlatform,
    webhookBucketForReportName,
};
