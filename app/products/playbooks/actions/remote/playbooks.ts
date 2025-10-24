// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export async function fetchPlaybooks(serverUrl: string, params: FetchPlaybooksParams) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const playbooks = await client.fetchPlaybooks(params);
        return {data: playbooks};
    } catch (error) {
        logDebug('error on fetchPlaybooks', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
