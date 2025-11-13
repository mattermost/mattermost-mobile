// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import EphemeralStore from '@store/ephemeral_store';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const fetchAIAgents = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const agents = await client.getAIAgents();

        // Store agents in EphemeralStore
        EphemeralStore.setAIAgents(serverUrl, agents);

        return {agents};
    } catch (error) {
        logDebug('error on fetchAIAgents', getFullErrorMessage(error));
        return {error};
    }
};

