// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {setPlaybooksTaskRequirementsEnabled} from '@playbooks/actions/local/settings';
import {fetchIsPlaybooksEnabled} from '@playbooks/database/queries/version';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const updatePlaybooksSettings = async (serverUrl: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const isPlaybooksEnabled = await fetchIsPlaybooksEnabled(database);
        if (!isPlaybooksEnabled) {
            logDebug('updatePlaybooksSettings: skipping settings fetch, playbooks below minimum version');
            const {error} = await setPlaybooksTaskRequirementsEnabled(serverUrl, false);
            if (error) {
                return {error};
            }
            return {
                data: {
                    enable_experimental_features: false,
                    enable_task_requirements: false,
                },
            };
        }

        const client = NetworkManager.getClient(serverUrl);
        const settings = await client.fetchPlaybooksSettings();
        const {error} = await setPlaybooksTaskRequirementsEnabled(serverUrl, Boolean(settings.enable_task_requirements));
        if (error) {
            return {error};
        }
        return {data: settings};
    } catch (error) {
        logDebug('error on updatePlaybooksSettings', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
