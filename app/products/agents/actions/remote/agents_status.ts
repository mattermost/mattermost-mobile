// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setAgentsConfig} from '@agents/store/agents_config';

import NetworkManager from '@managers/network_manager';
import {logDebug} from '@utils/log';

export async function checkIsAgentsPluginEnabled(serverUrl: string): Promise<{data?: boolean; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getAgentsStatus();
        setAgentsConfig(serverUrl, {pluginEnabled: response.available});
        return {data: response.available};
    } catch (error) {
        logDebug('checkIsAgentsPluginEnabled', 'Failed to check agents status', error);
        return {error};
    }
}
