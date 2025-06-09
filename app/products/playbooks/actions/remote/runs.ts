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

        let hasMore = true;
        let page = 0;
        const allRuns: PlaybookRun[] = [];
        while (hasMore) {
            // We want to call the API secuentially for pagination
            // eslint-disable-next-line no-await-in-loop
            const {items: runs, has_more} = await client.fetchPlaybookRuns({
                page,
                per_page: 100,
                channel_id: channelId,
                active_gte: 0, // TODO use last playbook fetch at
            });
            hasMore = has_more;
            allRuns.push(...runs);
            page++;
        }

        if (!fetchOnly) {
            await operator.handlePlaybookRun({
                runs: allRuns,
                prepareRecordsOnly: false,
                processChildren: true,
            });
        }

        return {runs: allRuns};
    } catch (error) {
        logDebug('error on fetchPlaybookRunsForChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
