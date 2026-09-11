// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {setPlaybooksVersion} from '@playbooks/actions/local/version';
import {updatePlaybooksSettings} from '@playbooks/actions/remote/settings';
import {PLAYBOOKS_PLUGIN_ID} from '@playbooks/constants/plugin';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const updatePlaybooksVersion = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const manifests = await client.getPluginsManifests();
        const manifest = manifests.find((m) => m.id === PLAYBOOKS_PLUGIN_ID);
        await setPlaybooksVersion(serverUrl, manifest?.version || '');
        if (manifest?.version) {
            const {error} = await updatePlaybooksSettings(serverUrl);
            if (error) {
                return {error};
            }
        }
        return {data: true};
    } catch (error) {
        logDebug('error on isPlaybooksEnabled', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
