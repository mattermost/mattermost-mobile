// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import {setAgentsVersion} from '@agents/actions/local/version';
import {AGENTS_PLUGIN_ID} from '@agents/constants/plugin';
import {fetchAgentsVersion} from '@agents/database/queries/version';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const setAgentsVersionFromManifests = async (serverUrl: string, manifests: ClientPluginManifest[]) => {
    try {
        const manifest = manifests.find((m) => m.id === AGENTS_PLUGIN_ID);
        const newVersion = manifest?.version || '';

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentVersion = await fetchAgentsVersion(database);
        if (currentVersion !== newVersion) {
            await setAgentsVersion(serverUrl, newVersion);
        }

        return {data: true};
    } catch (error) {
        logDebug('error on setAgentsVersionFromManifests', getFullErrorMessage(error));
        return {error};
    }
};

export const updateAgentsVersion = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const manifests = await client.getPluginsManifests();
        return setAgentsVersionFromManifests(serverUrl, manifests);
    } catch (error) {
        logDebug('error on updateAgentsVersion', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
