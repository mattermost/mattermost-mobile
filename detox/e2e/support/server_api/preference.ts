// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Preferences
// See https://api.mattermost.com/#tag/preferences
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

export type UserPreference = {
    user_id: string;
    category: string;
    name: string;
    value: string;
};

/**
 * Get the user's preferences.
 * See https://api.mattermost.com/#operation/GetPreferences
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - the user ID
 * @return {Object} returns {preferences} on success or {error, status} on error
 */
export const apiGetUserPreferences = async (baseUrl: string, userId: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/users/${userId}/preferences`);

        return {preferences: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Save the user's favorite channel preference.
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - the user ID
 * @param {string} channelId - the channel id to be favorited
 * @return {string} returns {status} on success or {error, status} on error
 */
export const apiSaveFavoriteChannelPreference = (baseUrl: string, userId: string, channelId: string): any => {
    const preference = {
        user_id: userId,
        category: 'favorite_channel',
        name: channelId,
        value: 'true',
    };

    return apiSaveUserPreferences(baseUrl, userId, [preference]);
};

/**
 * Save the user's teammate name display preference.
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - the user ID
 * @param {string} nameFormat - one of "username" (default), "nickname_full_name" or "full_name"
 * @returns
 */
export const apiSaveTeammateNameDisplayPreference = (baseUrl: string, userId: string, nameFormat = 'username'): any => {
    const preference = {
        user_id: userId,
        category: 'display_settings',
        name: 'name_format',
        value: nameFormat,
    };

    return apiSaveUserPreferences(baseUrl, userId, [preference]);
};

/**
 * Save the user's teams order preference.
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - the user ID
 * @param {Array} orderedTeamIds - ordered array of team IDs
 * @return {string} returns {status} on success or {error, status} on error
 */
export const apiSaveTeamsOrderPreference = (baseUrl: string, userId: string, orderedTeamIds: string[] = []): any => {
    const preference = {
        user_id: userId,
        category: 'teams_order',
        name: '',
        value: orderedTeamIds.toString(),
    };

    return apiSaveUserPreferences(baseUrl, userId, [preference]);
};

/**
 * Save the user's preferences.
 * See https://api.mattermost.com/#operation/UpdatePreferences
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - the user ID
 * @param {Array} preferences - a list of user's preferences
 * @return {string} returns {status} on success or {error, status} on error
 */
export const apiSaveUserPreferences = async (baseUrl: string, userId: string, preferences: any[] = []): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}/api/v4/users/${userId}/preferences`,
            preferences,
        );

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const Preference = {
    apiGetUserPreferences,
    apiSaveFavoriteChannelPreference,
    apiSaveTeammateNameDisplayPreference,
    apiSaveTeamsOrderPreference,
    apiSaveUserPreferences,
};

export default Preference;
