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
 * Add user to channel.
 * See https://api.mattermost.com/#operation/AddChannelMember
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - The ID of user to add into the channel
 * @param {string} channelId - The channel ID
 * @return {Object} returns {member} on success or {error, status} on error
 */
export const apiAddUserToChannel = async (baseUrl: string, userId: string, channelId: string): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/channels/${channelId}/members`,
            {user_id: userId},
        );

        return {member: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Create a channel.
 * See https://api.mattermost.com/#operation/CreateChannel
 * @param {string} baseUrl - the base server URL
 * @param {string} option.teamId - The team ID of the team to create the channel on
 * @param {string} option.type - 'O' (default) for a public channel, 'P' for a private channel
 * @param {string} option.prefix - prefix to name, display name, purpose, and header
 * @param {Object} option.channel - channel object to be created
 * @return {Object} returns {channel} on success or {error, status} on error
 */
export const apiCreateChannel = async (baseUrl: string, {teamId = null, type = 'O', prefix = 'channel', channel = null}: any = {}): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/channels`,
            channel || generateRandomChannel(teamId, type, prefix),
        );

        return {channel: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Create a direct message channel.
 * See https://api.mattermost.com/#operation/CreateDirectChannel
 * @param {string} baseUrl - the base server URL
 * @param {Array} userIds - the two user IDs to be in the direct message
 * @return {Object} returns {channel} on success or {error, status} on error
 */
export const apiCreateDirectChannel = async (baseUrl: string, userIds: string[] = []): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/channels/direct`,
            userIds,
        );

        return {channel: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Create a group message channel.
 * See https://api.mattermost.com/#operation/CreateGroupChannel
 * @param {string} baseUrl - the base server URL
 * @param {Array} userIds - user IDs to be in the group message channel
 * @return {Object} returns {channel} on success or {error, status} on error
 */
export const apiCreateGroupChannel = async (baseUrl: string, userIds: string[] = []): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/channels/group`,
            userIds,
        );

        return {channel: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Delete a channel.
 * See https://api.mattermost.com/#operation/DeleteChannel
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - The channel ID to be deleted
 * @return {Object} returns {deleted} on success or {error, status} on error
 */
export const apiDeleteChannel = async (baseUrl: string, channelId: string): Promise<any> => {
    try {
        const response = await client.delete(`${baseUrl}/api/v4/channels/${channelId}`);

        return {deleted: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get a channel by name.
 * See https://api.mattermost.com/#operation/GetChannelByName
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - team ID
 * @param {string} channelName - channel name
 * @return {Object} returns {channel} on success or {error, status} on error
 */
export const apiGetChannelByName = async (baseUrl: string, teamId: string, channelName: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/teams/${teamId}/channels/name/${channelName}`);

        return {channel: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get a channel by name and team name.
 * See https://api.mattermost.com/#operation/GetChannelByNameForTeamName
 * @param {string} baseUrl - the base server URL
 * @param {string} teamName - team name
 * @param {string} channelName - channel name
 * @return {Object} returns {channel} on success or {error, status} on error
 */
export const apiGetChannelByNameAndTeamName = async (baseUrl: string, teamName: string, channelName: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/teams/name/${teamName}/channels/name/${channelName}`);

        return {channel: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get channels for user.
 * See https://api.mattermost.com/#operation/GetChannelsForTeamForUser
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - The user ID
 * @param {string} teamId - The team ID the user belongs to
 * @return {Object} returns {channels} on success or {error, status} on error
 */
export const apiGetChannelsForUser = async (baseUrl: string, userId: string, teamId: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/users/${userId}/teams/${teamId}/channels`);

        return {channels: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get unread messages.
 * See https://api.mattermost.com/#operation/GetChannelUnread
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - The user ID to perform view actions for
 * @param {string} channelId - The channel ID that is being viewed
 * @return {Object} returns response on success or {error, status} on error
 */
export const apiGetUnreadMessages = async (baseUrl: string, userId: string, channelId: string): Promise<any> => {
    try {
        return await client.get(`${baseUrl}/api/v4/users/${userId}/channels/${channelId}/unread`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Restore a channel.
 * See https://api.mattermost.com/#operation/RestoreChannel
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - The channel ID to be restored
 * @return {Object} returns {restored} on success or {error, status} on error
 */
export const apiRestoreChannel = async (baseUrl: string, channelId: string): Promise<any> => {
    try {
        const response = await client.post(`${baseUrl}/api/v4/channels/${channelId}/restore`);

        return {restored: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Remove user from channel.
 * See https://api.mattermost.com/#operation/RemoveUserFromChannel
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - The channel ID
 * @param {string} userId - The user ID to be removed from channel
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiRemoveUserFromChannel = async (baseUrl: string, channelId: string, userId: string): Promise<any> => {
    try {
        const response = await client.delete(
            `${baseUrl}/api/v4/channels/${channelId}/members/${userId}`,
        );

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * View channel.
 * See https://api.mattermost.com/#operation/ViewChannel
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - The user ID to perform view actions for
 * @param {string} channelId - The channel ID that is being viewed
 * @return {Object} returns {viewed} on success or {error, status} on error
 */
export const apiViewChannel = async (baseUrl: string, userId: string, channelId: string): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/channels/members/${userId}/view`,
            {channel_id: channelId},
        );

        return {viewed: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const generateRandomChannel = (teamId: string, type: string, prefix: string) => {
    const randomId = getRandomId();

    return {
        team_id: teamId,
        name: `${prefix}-${randomId}`,
        display_name: `${capitalize(prefix)} ${randomId}`,
        type,
        purpose: `Channel purpose: ${prefix} ${randomId}`,
        header: `Channel header: ${prefix} ${randomId}`,
    };
};

export const Channel = {
    apiAddUserToChannel,
    apiCreateChannel,
    apiCreateDirectChannel,
    apiCreateGroupChannel,
    apiDeleteChannel,
    apiGetChannelByName,
    apiGetChannelsForUser,
    apiGetUnreadMessages,
    apiRestoreChannel,
    apiRemoveUserFromChannel,
    apiViewChannel,
    generateRandomChannel,
};

export default Channel;
