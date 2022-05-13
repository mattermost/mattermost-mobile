// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateDmGmDisplayName} from '@actions/local/channel';
import {fetchPostById} from '@actions/remote/post';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {deletePreferences, differsFromLocalNameFormat} from '@queries/servers/preference';

export async function handlePreferenceChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl].operator;
    if (!operator) {
        return;
    }

    try {
        const preference: PreferenceType = JSON.parse(msg.data.preference);
        handleSavePostAdded(serverUrl, [preference]);

        const hasDiffNameFormatPref = await differsFromLocalNameFormat(operator.database, [preference]);

        if (operator) {
            await operator.handlePreferences({
                prepareRecordsOnly: false,
                preferences: [preference],
            });
        }

        if (hasDiffNameFormatPref) {
            updateDmGmDisplayName(serverUrl);
        }
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
        const preferences: PreferenceType[] = JSON.parse(msg.data.preferences);
        handleSavePostAdded(serverUrl, preferences);

        const hasDiffNameFormatPref = await differsFromLocalNameFormat(operator.database, preferences);

        if (operator) {
            await operator.handlePreferences({
                prepareRecordsOnly: false,
                preferences,
            });
        }

        if (hasDiffNameFormatPref) {
            updateDmGmDisplayName(serverUrl);
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
        const preferences: PreferenceType[] = JSON.parse(msg.data.preferences);
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

