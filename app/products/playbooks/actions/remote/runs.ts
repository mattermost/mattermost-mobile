// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

type PlaybookRunsRequest = {
    runs?: PlaybookRun[];
    error?: unknown;
}

export const fetchPlaybookRunsForChannel = async (serverUrl: string, channelId: string, fetchOnly = false): Promise<PlaybookRunsRequest> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const {items: runs} = await client.fetchPlaybookRuns({
            page: 0,
            per_page: 100,
            channel_id: channelId,
        });

        if (!fetchOnly) {
            await operator.handlePlaybookRun({
                runs,
                prepareRecordsOnly: false,
            });
        }

        return {runs};
    } catch (error) {
        logDebug('error on fetchPlaybookRunsForChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
