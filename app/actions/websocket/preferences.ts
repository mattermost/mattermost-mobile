// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {deletePreferences} from '@queries/servers/preference';

export async function handlePreferenceChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    try {
        const preference = JSON.parse(msg.data.preference) as PreferenceType;
        const operator = database?.operator;
        if (operator) {
            operator.handlePreferences({
                prepareRecordsOnly: false,
                preferences: [preference],
                sync: true,
            });
        }
    } catch (error) {
        // Do nothing
    }
}

export async function handlePreferencesChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    try {
        const preferences = JSON.parse(msg.data.preferences) as PreferenceType[];
        const operator = database?.operator;
        if (operator) {
            operator.handlePreferences({
                prepareRecordsOnly: false,
                preferences,
                sync: true,
            });
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
