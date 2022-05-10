// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateChannelsDisplayName} from '@actions/local/channel';
import {fetchPostById} from '@actions/remote/post';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {queryChannelsByTypes} from '@queries/servers/channel';
import {getPostById} from '@queries/servers/post';
import {deletePreferences} from '@queries/servers/preference';
import {queryUsersById} from '@queries/servers/user';

export async function handlePreferenceChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl].operator;
    if (!operator) {
        return;
    }

    try {
        const preference = JSON.parse(msg.data.preference) as PreferenceType;
        handleSavePostAdded(serverUrl, [preference]);

        const userId = msg.broadcast.user_id;

        if (operator) {
            await operator.handlePreferences({
                prepareRecordsOnly: false,
                preferences: [preference],
            });
        }
        if (userId) {
            await updateChannelDisplayName(serverUrl, userId);
        }
    } catch (error) {
        // Do nothing
    }
}

const updateChannelDisplayName = async (serverUrl: string, userId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const user = await queryUsersById(database, [userId]).fetch();
    const channels = await queryChannelsByTypes(database, ['G', 'D']).fetch();
    await updateChannelsDisplayName(
        serverUrl,
        channels,
        user as unknown as UserProfile[],
        false,
    );
    return {channels};
};

export async function handlePreferencesChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const preferences = JSON.parse(msg.data.preferences) as PreferenceType[];

        const userId = msg.broadcast.user_id;
        handleSavePostAdded(serverUrl, preferences);

        if (operator) {
            await operator.handlePreferences({
                prepareRecordsOnly: false,
                preferences,
            });
        }

        if (userId) {
            await updateChannelDisplayName(serverUrl, userId);
        }
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
