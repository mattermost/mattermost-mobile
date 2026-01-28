// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type Agent} from '@agents/client/rest';

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

export async function fetchAgents(
    serverUrl: string,
): Promise<{data?: Agent[]; error?: string}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const agents = await client.getAgents();
        return {data: agents};
    } catch (error) {
        logError('[fetchAgents]', error);
        return {error: getFullErrorMessage(error)};
    }
}
