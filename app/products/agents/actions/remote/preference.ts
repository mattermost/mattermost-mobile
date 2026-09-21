// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {savePreference} from '@actions/remote/preference';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getCurrentUserId} from '@queries/servers/system';

/**
 * Persist the user's explicitly selected agent as a core preference so every
 * selector surface (and other clients) restores the same choice.
 */
export const saveSelectedAgent = async (serverUrl: string, agentId: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const userId = await getCurrentUserId(database);
        const pref: PreferenceType = {
            user_id: userId,
            category: Preferences.CATEGORIES.AGENTS,
            name: Preferences.SELECTED_AGENT,
            value: agentId,
        };
        return await savePreference(serverUrl, [pref]);
    } catch (error) {
        return {error};
    }
};
