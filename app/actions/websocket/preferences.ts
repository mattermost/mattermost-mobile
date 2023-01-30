// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {updateDmGmDisplayName} from '@actions/local/channel';
import {appEntry} from '@actions/remote/entry';
import {fetchPostById} from '@actions/remote/post';
import {Events, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {truncateCrtRelatedTables} from '@queries/servers/entry';
import {getPostById} from '@queries/servers/post';
import {deletePreferences, differsFromLocalNameFormat, getHasCRTChanged} from '@queries/servers/preference';

async function handleCRTToggled(serverUrl: string) {
    const currentServerUrl = await DatabaseManager.getActiveServerUrl();
    await truncateCrtRelatedTables(serverUrl);
    appEntry(serverUrl);
    DeviceEventEmitter.emit(Events.CRT_TOGGLED, serverUrl === currentServerUrl);
}

export async function handlePreferenceChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    let database;
    let operator;
    try {
        const result = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = result.database;
        operator = result.operator;
    } catch (e) {
        return;
    }

    try {
        const preference: PreferenceType = JSON.parse(msg.data.preference);
        handleSavePostAdded(serverUrl, [preference]);

        const hasDiffNameFormatPref = await differsFromLocalNameFormat(database, [preference]);
        const crtToggled = await getHasCRTChanged(database, [preference]);

        if (operator) {
            await operator.handlePreferences({
                prepareRecordsOnly: false,
                preferences: [preference],
            });
        }

        if (hasDiffNameFormatPref) {
            updateDmGmDisplayName(serverUrl);
        }

        if (crtToggled) {
            handleCRTToggled(serverUrl);
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
        const crtToggled = await getHasCRTChanged(operator.database, preferences);
        if (operator) {
            await operator.handlePreferences({
                prepareRecordsOnly: false,
                preferences,
            });
        }

        if (hasDiffNameFormatPref) {
            updateDmGmDisplayName(serverUrl);
        }

        if (crtToggled) {
            handleCRTToggled(serverUrl);
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

    const savedPosts = preferences.filter((p) => p.category === Preferences.CATEGORIES.SAVED_POST);
    for await (const saved of savedPosts) {
        const post = await getPostById(database, saved.name);
        if (!post) {
            await fetchPostById(serverUrl, saved.name, false);
        }
    }
}
