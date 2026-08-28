// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Threads
// See https://api.mattermost.com/#tag/threads
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Get a thread for the current (authenticated) user.
 * See https://api.mattermost.com/#operation/GetThread
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - the team the thread belongs to
 * @param {string} threadId - the thread's root post id
 * @return {Object} returns {thread} on success or {error, status} on error
 */
export const apiGetThread = async (baseUrl: string, teamId: string, threadId: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/users/me/teams/${teamId}/threads/${threadId}`);

        return {thread: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Wait until the server reports the thread's follow state as expected.
 * Verifies the side effect of a follow/unfollow tap before asserting the UI: the tap can
 * fail in a transport blip (run 33122005735, MM-T4806_4: "URLSessionTask failed with error:
 * cannot parse response") and the app only logs that error, leaving the thread followed.
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - the team the thread belongs to
 * @param {string} threadId - the thread's root post id
 * @param {boolean} expectedFollowed - the follow state to wait for
 * @param {number} timeoutMs - how long to poll before giving up
 * @return {Object} returns {followed: boolean, error} — followed=false with error set when
 * the state was not reached within the timeout
 */
export const apiWaitForThreadFollowState = async (
    baseUrl: string,
    teamId: string,
    threadId: string,
    expectedFollowed: boolean,
    timeoutMs = 10000,
): Promise<{followed: boolean; error?: unknown}> => {
    const deadline = Date.now() + timeoutMs;
    let followed = !expectedFollowed;
    let lastError: unknown;

    /* eslint-disable no-await-in-loop -- bounded poll: each probe must complete first */
    while (Date.now() < deadline) {
        const {thread, error} = await apiGetThread(baseUrl, teamId, threadId);
        if (error) {
            lastError = error;
        } else if (Boolean(thread?.is_following) === expectedFollowed) {
            return {followed: expectedFollowed};
        } else {
            followed = Boolean(thread?.is_following);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    /* eslint-enable no-await-in-loop */

    return {followed, error: lastError ?? new Error(`thread follow state did not become ${expectedFollowed ? 'followed' : 'unfollowed'} within ${timeoutMs}ms`)};
};
export const Thread = {
    apiGetThread,
    apiWaitForThreadFollowState,
};

export default Thread;
