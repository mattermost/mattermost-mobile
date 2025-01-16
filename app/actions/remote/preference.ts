// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {chunk} from 'lodash';
import {DeviceEventEmitter} from 'react-native';

import {handleReconnect} from '@actions/websocket';
import {Events, General, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceAsBool} from '@helpers/api/preference';
import NetworkManager from '@managers/network_manager';
import {queryAllUnreadDMsAndGMsIds, getChannelById} from '@queries/servers/channel';
import {truncateCrtRelatedTables} from '@queries/servers/entry';
import {queryPreferencesByCategoryAndName, querySavedPostsPreferences} from '@queries/servers/preference';
import {getCurrentUserId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {isDMorGM} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';
import {getUserIdFromChannelName} from '@utils/user';

import {forceLogoutIfNecessary} from './session';

import type ChannelModel from '@typings/database/models/servers/channel';

export type MyPreferencesRequest = {
    preferences?: PreferenceType[];
    error?: unknown;
};

export const fetchMyPreferences = async (serverUrl: string, fetchOnly = false, groupLabel?: RequestGroupLabel): Promise<MyPreferencesRequest> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const preferences = await client.getMyPreferences(groupLabel);

        if (!fetchOnly) {
            await operator.handlePreferences({
                prepareRecordsOnly: false,
                preferences,
                sync: true,
            });
        }

        return {preferences};
    } catch (error) {
        logDebug('error on fetchMyPreferences', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const saveFavoriteChannel = async (serverUrl: string, channelId: string, isFavorite: boolean) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const userId = await getCurrentUserId(database);
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
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const userId = await getCurrentUserId(database);
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

export const savePreference = async (serverUrl: string, preferences: PreferenceType[], prepareRecordsOnly = false, groupLabel?: RequestGroupLabel) => {
    try {
        if (!preferences.length) {
            return {preferences: []};
        }

        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const userId = await getCurrentUserId(database);
        const chunkSize = 100;
        const chunks = chunk(preferences, chunkSize);
        chunks.forEach((c: PreferenceType[]) => {
            client.savePreferences(userId, c, groupLabel);
        });
        const preferenceModels = await operator.handlePreferences({
            preferences,
            prepareRecordsOnly,
        });

        return {preferences: preferenceModels};
    } catch (error) {
        logDebug('error on savePreference', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
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
        logDebug('error on deleteSavedPost', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const openChannelIfNeeded = async (serverUrl: string, channelId: string, groupLabel?: RequestGroupLabel) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const channel = await getChannelById(database, channelId);
        if (!channel || !isDMorGM(channel)) {
            return {};
        }
        const res = await openChannels(serverUrl, [channel], groupLabel);
        return res;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const openAllUnreadChannels = async (serverUrl: string, groupLabel?: RequestGroupLabel) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const channels = await queryAllUnreadDMsAndGMsIds(database).fetch();
        const res = await openChannels(serverUrl, channels, groupLabel);
        return res;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

const openChannels = async (serverUrl: string, channels: ChannelModel[], groupLabel?: RequestGroupLabel) => {
    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const userId = await getCurrentUserId(database);

    const {DIRECT_CHANNEL_SHOW, GROUP_CHANNEL_SHOW} = Preferences.CATEGORIES;
    const directChannelShowPreferences = await queryPreferencesByCategoryAndName(database, DIRECT_CHANNEL_SHOW).fetch();
    const groupChannelShowPreferences = await queryPreferencesByCategoryAndName(database, GROUP_CHANNEL_SHOW).fetch();
    const showPreferences = directChannelShowPreferences.concat(groupChannelShowPreferences);

    const prefs: PreferenceType[] = [];
    for (const channel of channels) {
        const category = channel.type === General.DM_CHANNEL ? DIRECT_CHANNEL_SHOW : GROUP_CHANNEL_SHOW;
        const name = channel.type === General.DM_CHANNEL ? getUserIdFromChannelName(userId, channel.name) : channel.id;
        const visible = getPreferenceAsBool(showPreferences, category, name, false);
        if (visible) {
            continue;
        }

        prefs.push(
            {
                user_id: userId,
                category,
                name,
                value: 'true',
            },
            {
                user_id: userId,
                category: Preferences.CATEGORIES.CHANNEL_OPEN_TIME,
                name: channel.id,
                value: Date.now().toString(),
            },
        );
    }

    return savePreference(serverUrl, prefs, false, groupLabel);
};

export const setDirectChannelVisible = async (serverUrl: string, channelId: string, visible = true) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
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

        return {};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
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
