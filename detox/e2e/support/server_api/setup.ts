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

// A fixture name collided with one already on the server. apiCreateTeam / apiCreateChannel /
// apiCreateUser each build a *fresh* random name on every call, so re-invoking them resolves
// this — unlike a payload replay, retrying here cannot repeat the collision.
// getRandomId() is only 6 hex chars (16^6 names), so against a long-lived shared test server
// this is a birthday collision, not a test bug: run 32232550302 lost the whole
// file_upload.e2e.ts beforeAll on iOS — and with it MM-T307_1/T325_1/T328_1/T330_1/T339_1 —
// to "A team with this URL already exists".
const isNameCollisionError = (error: any): boolean => {
    const id = String(error?.id || '');
    return (
        id === 'store.sql_team.save_team.existing.app_error' ||
        id === 'store.sql_channel.save_channel.exists.app_error' ||
        id === 'store.sql_user.save.username_exists.app_error' ||
        id === 'store.sql_user.save.email_exists.app_error'
    );
};

const retryTransient = async <T extends {error?: any; status?: number}>(
    fn: () => Promise<T>,
    label: string,
    maxAttempts = 3,
    attempt = 1,
): Promise<T> => {
    const result = await fn();
    const err = result.error;
    const transient = Boolean(err) && (
        isTransientServerError(err) ||
        isNameCollisionError(err) ||
        isTransientHttpStatus(result.status) ||
        isTransportFailure({error: err, status: result.status})
    );
    if (!err || !transient || attempt >= maxAttempts) {
        return result;
    }

    const retryAfterSec = Number(err.retry_after);
    const delayMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0 ?
        Math.min(retryAfterSec, MAX_RETRY_AFTER_SEC) * 1000 :
        1000 * (2 ** (attempt - 1));

    // eslint-disable-next-line no-console
    console.warn(`[apiInit] ${label} transient error attempt ${attempt}/${maxAttempts}, retry in ${delayMs}ms: ${JSON.stringify(err).slice(0, 200)}`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return retryTransient(fn, label, maxAttempts, attempt + 1);
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
