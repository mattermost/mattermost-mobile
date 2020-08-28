// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {capitalize, getRandomId} from '@support/utils';

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Channels
// See https://api.mattermost.com/#tag/channels
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Create a channel.
 * See https://api.mattermost.com/#tag/channels/paths/~1channels/post
 * @param {string} option.teamId - The team ID of the team to create the channel on
 * @param {string} option.type - 'O' (default) for a public channel, 'P' for a private channel
 * @param {string} option.prefix - option to add prefix to name and display name
 * @param {Object} option.channel - fix channel object to be created
 * @return {Object} returns {channel} on success or {error, status} on error
 */
export const apiCreateChannel = async ({teamId = null, type = 'O', prefix = 'channel', channel = null} = {}) => {
    try {
        const response = await client.post(
            '/api/v4/channels',
            channel || generateRandomChannel(teamId, type, prefix),
        );

        return {channel: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Add user to channel.
 * See https://api.mattermost.com/#tag/channels/paths/~1channels~1{channel_id}~1members/post
 * @param {string} userId - The ID of user to add into the channel
 * @param {string} channelId - The channel ID
 * @return {Object} returns {member} on success or {error, status} on error
 */
export const apiAddUserToChannel = async (userId, channelId) => {
    try {
        const response = await client.post(
            `/api/v4/channels/${channelId}/members`,
            {user_id: userId},
        );

        return {member: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

function generateRandomChannel(teamId, type, prefix) {
    const randomId = getRandomId();

    return {
        team_id: teamId,
        name: `${prefix}-${randomId}`,
        display_name: `${capitalize(prefix)} ${randomId}`,
        type,
        purpose: `Channel purpose: ${prefix} ${randomId}`,
        header: `Channel header: ${prefix} ${randomId}`,
    };
}

export const Channel = {
    apiAddUserToChannel,
    apiCreateChannel,
};

export default Channel;
