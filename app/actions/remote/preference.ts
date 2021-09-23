// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';

import {forceLogoutIfNecessary} from './session';

export type MyPreferencesRequest = {
    preferences?: PreferenceType[];
    error?: unknown;
}

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
                operator.handlePreferences({
                    prepareRecordsOnly: false,
                    preferences,
                });
            }
        }

        return {preferences};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
