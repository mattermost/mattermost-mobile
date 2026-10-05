// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Warmup-only retry predicate for Detox globalSetup / Maestro seed.
 *
 * Matterwick can 403 or redirect `/api` to the inactive HTML portal while the
 * workspace is still coming up. CI 33915931136: Detox iOS `globalSetup` failed
 * on the first Axios 403; Maestro seed already retries `cloud/inactive`.
 *
 * Do not use this for general API calls — a Mattermost 403 is often a real
 * permission answer (`transport_retry` tests encode that).
 *
 * @param {{status?: number, message?: string, body?: unknown}} err
 * @returns {boolean}
 */
function isRetriableCloudWarmupError({status, message = '', body = ''} = {}) {
    if (!status || status >= 500 || status === 429) {
        return true;
    }
    const bodyText = typeof body === 'string' ? body : JSON.stringify(body ?? '');
    const text = `${message} ${bodyText}`;
    if (/cloud\/inactive|<!DOCTYPE html|<html[\s>]/i.test(text)) {
        return true;
    }

    // Inactive portal often 403s the API with an empty/JSON body (no HTML).
    return status === 403;
}

module.exports = {isRetriableCloudWarmupError};
