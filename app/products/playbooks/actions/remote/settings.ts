// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {setPlaybooksTaskRequirementsEnabled} from '@playbooks/actions/local/settings';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const updatePlaybooksSettings = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const settings = await client.fetchPlaybooksSettings();
        await setPlaybooksTaskRequirementsEnabled(serverUrl, Boolean(settings.enable_task_requirements));
        return {data: settings};
    } catch (error) {
        logDebug('error on updatePlaybooksSettings', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
