// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isTransportFailure} from '@support/utils/transport_retry';

import Channel from './channel';
import {isTransientHttpStatus, MAX_RETRY_AFTER_SEC} from './client';
import Team from './team';
import User from './user';

// Retry transient CI / edge errors — not test bugs.
const isTransientServerError = (error: any): boolean => {
    if (!error) {
        return false;
    }

    // Cloudflare JSON body uses `status`; Mattermost API errors use `status_code`.
    const statusCode = error.status_code ?? error.statusCode ?? error.status;
    if (error.cloudflare_error === true || error.error_code === 524) {
        return true;
    }
    if (isTransientHttpStatus(statusCode)) {
        return true;
    }
    if (statusCode !== 500) {
        return false;
    }
    const detail = String(error.detailed_error || '');
    return (
        detail.includes('there is already a query being processed') ||
        detail.includes('context deadline exceeded')
    );
};

/**
 * Wall-clock ceiling for apiInit's retries.
 *
 * retryTransient is the sole retry owner for apiInit, but an attempt cap is not a
 * bound when a single attempt can spend the client's whole 90s retry budget:
 * 3 attempts is up to 270s, which on its own exceeds a 300s beforeAll once the
 * app launch and login are added. Bounding by elapsed time makes apiInit fail with
 * the underlying network error while there is still budget left for the hook to
 * report it.
 */
const TRANSIENT_RETRY_BUDGET_MS = 120_000;

const retryTransient = async <T extends {error?: any; status?: number}>(
    fn: () => Promise<T>,
    label: string,
    maxAttempts = 3,
    attempt = 1,
    deadlineAt = Date.now() + TRANSIENT_RETRY_BUDGET_MS,
): Promise<T> => {
    const result = await fn();
    const err = result.error;
    const transient = Boolean(err) && (
        isTransientServerError(err) ||
        isTransientHttpStatus(result.status) ||
        isTransportFailure({error: err, status: result.status})
    );
    if (!err || !transient || attempt >= maxAttempts) {
        return result;
    }
    if (Date.now() >= deadlineAt) {
        // eslint-disable-next-line no-console
        console.warn(`[apiInit] ${label} retry budget spent after attempt ${attempt}; returning the transient error`);
        return result;
    }

    const retryAfterSec = Number(err.retry_after);
    const delayMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0 ?
        Math.min(retryAfterSec, MAX_RETRY_AFTER_SEC) * 1000 :
        1000 * (2 ** (attempt - 1));

    // eslint-disable-next-line no-console
    console.warn(`[apiInit] ${label} transient error attempt ${attempt}/${maxAttempts}, retry in ${delayMs}ms: ${JSON.stringify(err).slice(0, 200)}`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryTransient(fn, label, maxAttempts, attempt + 1, deadlineAt);
};

/**
 * Creates new user, channel and team for test isolation.
 * @param {string} baseUrl - the base server URL
 * @param {Object} options - may pass options to predefine channel, team and user creation
 * @return {Object} returns {channel, team, user} on success or {error, status} on error
 */
export const apiInit = async (baseUrl: string, {
    channelOptions = {type: 'O', prefix: 'channel'},
    teamOptions = {type: 'O', prefix: 'team'},
    userOptions = {prefix: 'user'},
}: any = {}): Promise<any> => {
    const teamResult = await retryTransient(() => Team.apiCreateTeam(baseUrl, teamOptions), 'apiCreateTeam');
    if (teamResult.error) {
        throw new Error(`Failed to create team: ${JSON.stringify(teamResult.error)}`);
    }
    const {team} = teamResult;

    const channelResult = await retryTransient(() => Channel.apiCreateChannel(baseUrl, {...channelOptions, teamId: team.id}), 'apiCreateChannel');
    if (channelResult.error) {
        throw new Error(`Failed to create channel: ${JSON.stringify(channelResult.error)}`);
    }
    const {channel} = channelResult;

    const userResult = await retryTransient(() => User.apiCreateUser(baseUrl, userOptions), 'apiCreateUser');
    if (userResult.error) {
        throw new Error(`Failed to create user: ${JSON.stringify(userResult.error)}`);
    }
    const {user} = userResult;

    const addTeamResult = await retryTransient(() => Team.apiAddUserToTeam(baseUrl, user.id, team.id), 'apiAddUserToTeam');
    if (addTeamResult.error) {
        throw new Error(`Failed to add user to team: ${JSON.stringify(addTeamResult.error)}`);
    }

    const addChannelResult = await retryTransient(() => Channel.apiAddUserToChannel(baseUrl, user.id, channel.id), 'apiAddUserToChannel');
    if (addChannelResult.error) {
        throw new Error(`Failed to add user to channel: ${JSON.stringify(addChannelResult.error)}`);
    }

    return {
        channel,
        team,
        user,
    };
};

export const Setup = {
    apiInit,
};

export default Setup;
