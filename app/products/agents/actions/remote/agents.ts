// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {rewriteStore} from '@agents/store';

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

/**
 * Fetch available agents from the server and store them in the rewrite store
 */
export const fetchAgents = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const agents = await client.getAgents();

        // Store agents in rewriteStore
        rewriteStore.setAgents(serverUrl, agents);

        return {agents};
    } catch (error) {
        logDebug('[fetchAgents] Error:', getFullErrorMessage(error));
        return {error};
    }
};
