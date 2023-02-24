// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {handleReconnect} from '@actions/websocket';
import {Events, General, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getChannelById} from '@queries/servers/channel';
import {truncateCrtRelatedTables} from '@queries/servers/entry';
import {querySavedPostsPreferences} from '@queries/servers/preference';
import {getCurrentUserId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {getUserIdFromChannelName} from '@utils/user';

import {forceLogoutIfNecessary} from './session';

export type MyPreferencesRequest = {
    preferences?: PreferenceType[];
    error?: unknown;
};

export const fetchMyPreferences = async (serverUrl: string, fetchOnly = false): Promise<MyPreferencesRequest> => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const preferences = await client.getMyPreferences();

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                await operator.handlePreferences({
                    prepareRecordsOnly: false,
                    preferences,
                    sync: true,
                });
            }
        }

        return {preferences};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const saveFavoriteChannel = async (serverUrl: string, channelId: string, isFavorite: boolean) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const userId = await getCurrentUserId(operator.database);
        const favPref: PreferenceType = {
            category: Preferences.CATEGORIES.FAVORITE_CHANNEL,
            name: channelId,
            user_id: userId,
            value: String(isFavorite),
        };
        return savePreference(serverUrl, [favPref]);
    } catch (error) {
        return {error};
    }
};

export const savePostPreference = async (serverUrl: string, postId: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const userId = await getCurrentUserId(operator.database);
        const pref: PreferenceType = {
            user_id: userId,
            category: Preferences.CATEGORIES.SAVED_POST,
            name: postId,
            value: 'true',
        };
        return savePreference(serverUrl, [pref]);
    } catch (error) {
        return {error};
    }
};

export const savePreference = async (serverUrl: string, preferences: PreferenceType[]) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const userId = await getCurrentUserId(operator.database);
        client.savePreferences(userId, preferences);
        await operator.handlePreferences({
            preferences,
            prepareRecordsOnly: false,
        });

        return {preferences};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const deleteSavedPost = async (serverUrl: string, postId: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);
        const userId = await getCurrentUserId(database);
        const records = await querySavedPostsPreferences(database, postId).fetch();
        const postPreferenceRecord = records.find((r) => postId === r.name);
        const pref = {
            user_id: userId,
            category: Preferences.CATEGORIES.SAVED_POST,
            name: postId,
            value: 'true',
        };

        if (postPreferenceRecord) {
            client.deletePreferences(userId, [pref]);
            await postPreferenceRecord.destroyPermanently();
        }

        return {
            preference: pref,
        };
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const setDirectChannelVisible = async (serverUrl: string, channelId: string, visible = true) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const channel = await getChannelById(database, channelId);
        if (channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL) {
            const userId = await getCurrentUserId(database);
            const {DIRECT_CHANNEL_SHOW, GROUP_CHANNEL_SHOW} = Preferences.CATEGORIES;
            const category = channel.type === General.DM_CHANNEL ? DIRECT_CHANNEL_SHOW : GROUP_CHANNEL_SHOW;
            const name = channel.type === General.DM_CHANNEL ? getUserIdFromChannelName(userId, channel.name) : channelId;
            const pref: PreferenceType = {
                user_id: userId,
                category,
                name,
                value: visible.toString(),
            };
            return savePreference(serverUrl, [pref]);
        }

        return {error: undefined};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const savePreferredSkinTone = async (serverUrl: string, skinCode: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const userId = await getCurrentUserId(database);
        const pref: PreferenceType = {
            user_id: userId,
            category: Preferences.CATEGORIES.EMOJI,
            name: Preferences.EMOJI_SKINTONE,
            value: skinCode,
        };
        return savePreference(serverUrl, [pref]);
    } catch (error) {
        return {error};
    }
};

export const handleCRTToggled = async (serverUrl: string) => {
    const currentServerUrl = await DatabaseManager.getActiveServerUrl();
    await truncateCrtRelatedTables(serverUrl);
    await handleReconnect(serverUrl);
    EphemeralStore.setEnablingCRT(false);
    DeviceEventEmitter.emit(Events.CRT_TOGGLED, serverUrl === currentServerUrl);
};
