// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateChannelsDisplayName} from '@actions/local/channel';
import {fetchPostById} from '@actions/remote/post';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue} from '@helpers/api/preference';
import {queryUserChannelsByTypes} from '@queries/servers/channel';
import {getPostById} from '@queries/servers/post';
import {deletePreferences, queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {queryUsersById} from '@queries/servers/user';
import {getUserIdFromChannelName} from '@utils/user';

export async function handlePreferenceChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl].operator;
    if (!operator) {
        return;
    }

    try {
        const preference = JSON.parse(msg.data.preference) as PreferenceType;

        handleSavePostAdded(serverUrl, [preference]);

        if (operator) {
            operator.handlePreferences({
                prepareRecordsOnly: false,
                preferences: [preference],
            });
        }

        updateChannelDisplayName(serverUrl, msg.broadcast.user_id, [preference]);
    } catch (error) {
        // Do nothing
    }
}

export async function handlePreferencesChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }
    try {
        const preferences = JSON.parse(msg.data.preferences) as PreferenceType[];

        handleSavePostAdded(serverUrl, preferences);

        if (operator) {
            operator.handlePreferences({
                prepareRecordsOnly: false,
                preferences,
            });
        }

        updateChannelDisplayName(serverUrl, msg.broadcast.user_id, preferences);
    } catch (error) {
        // Do nothing
    }
}

export async function handlePreferencesDeletedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    try {
        const preferences = JSON.parse(msg.data.preferences) as PreferenceType[];
        deletePreferences(database, preferences);
    } catch {
        // Do nothing
    }
}

// If preferences include new save posts we fetch them
async function handleSavePostAdded(serverUrl: string, preferences: PreferenceType[]) {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    const savedPosts = preferences.filter((p) => p.category === Preferences.CATEGORY_SAVED_POST);
    for await (const saved of savedPosts) {
        const post = await getPostById(database, saved.name);
        if (!post) {
            await fetchPostById(serverUrl, saved.name, false);
        }
    }
}

const updateChannelDisplayName = async (serverUrl: string, userId: string, preferences: PreferenceType[]) => {
    try {
        const {error} = await guardDisplayName(serverUrl, userId, preferences);
        if (error) {
            return {error};
        }

        const database = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (!database) {
            return {error: `${serverUrl} database not found`};
        }

        const channels = await queryUserChannelsByTypes(database, userId, ['G', 'D']).fetch();
        const userIds = channels.map((ch) => getUserIdFromChannelName(userId, ch.name));
        const users = await queryUsersById(database, userIds).fetch();

        await updateChannelsDisplayName(serverUrl, channels, users, false);

        return {channels};
    } catch (error) {
        return {error};
    }
};

const guardDisplayName = async (serverUrl: string, userId: string, preferences: PreferenceType[]) => {
    if (!userId) {
        return {error: 'userId is required'};
    }

    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const displayPref = getPreferenceValue(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT) as string;
    const currentPref = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT, displayPref).fetch();

    if (currentPref.length > 0) {
        return {error: 'The Preference table has the same value for the display name format'};
    }

    if (displayPref === '') {
        return {error: 'The display_settings for `name_format` is not present in the preferences'};
    }

    return {
        error: undefined,
    };
};
