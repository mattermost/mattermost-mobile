// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateDmGmDisplayName} from '@actions/local/channel';
import {fetchPostById} from '@actions/remote/post';
import {handleCRTToggled} from '@actions/remote/preference';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {deletePreferences, differsFromLocalNameFormat, getHasCRTChanged} from '@queries/servers/preference';
import EphemeralStore from '@store/ephemeral_store';

export async function handlePreferenceChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    if (EphemeralStore.isEnablingCRT()) {
        return;
    }

    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const preference: PreferenceType = JSON.parse(msg.data.preference);
        handleSavePostAdded(serverUrl, [preference]);

        const hasDiffNameFormatPref = await differsFromLocalNameFormat(database, [preference]);
        const crtToggled = await getHasCRTChanged(database, [preference]);

        await operator.handlePreferences({
            prepareRecordsOnly: false,
            preferences: [preference],
        });

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
    if (EphemeralStore.isEnablingCRT()) {
        return;
    }

    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const preferences: PreferenceType[] = JSON.parse(msg.data.preferences);
        handleSavePostAdded(serverUrl, preferences);

        const hasDiffNameFormatPref = await differsFromLocalNameFormat(database, preferences);
        const crtToggled = await getHasCRTChanged(database, preferences);

        await operator.handlePreferences({
            prepareRecordsOnly: false,
            preferences,
        });

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
    try {
        const databaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const preferences: PreferenceType[] = JSON.parse(msg.data.preferences);
        deletePreferences(databaseAndOperator, preferences);
    } catch {
        // Do nothing
    }
}

// If preferences include new save posts we fetch them
async function handleSavePostAdded(serverUrl: string, preferences: PreferenceType[]) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const savedPosts = preferences.filter((p) => p.category === Preferences.CATEGORIES.SAVED_POST);

        for await (const saved of savedPosts) {
            const post = await getPostById(database, saved.name);
            if (!post) {
                await fetchPostById(serverUrl, saved.name, false);
            }
        }
    } catch {
        // Do nothing
    }
}
