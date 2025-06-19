// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {updateLastPlaybookFetchAt} from '@playbooks/actions/local/channel';
import {handlePlaybookRuns} from '@playbooks/actions/local/run';
import {getLastPlaybookFetchAt} from '@playbooks/database/queries/run';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

type PlaybookRunsRequest = {
    runs?: PlaybookRun[];
    error?: unknown;
}

export const fetchPlaybookRunsForChannel = async (serverUrl: string, channelId: string, fetchOnly = false): Promise<PlaybookRunsRequest> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const lastFetchAt = await getLastPlaybookFetchAt(database, channelId);

        let hasMore = true;
        let page = 0;
        const allRuns: PlaybookRun[] = [];
        while (hasMore) {
            // We want to call the API secuentially for pagination.
            // We could use the total count to fetch all the other pages at once,
            // but we feel it is an early optimization.
            // eslint-disable-next-line no-await-in-loop
            const {items: runs, has_more} = await client.fetchPlaybookRuns({
                page,
                per_page: 100,

                // TODO: This two parameters are only available in the new version of the API
                channel_id: channelId,
                since: lastFetchAt,
            });
            hasMore = has_more;
            allRuns.push(...runs);
            page++;
        }

        if (!allRuns.length) {
            return {runs: []};
        }

        // TODO: We should use run.updateAt instead of the current timestamp.
        // but we don't have that field yet.
        updateLastPlaybookFetchAt(serverUrl, channelId, Date.now());

        if (!fetchOnly) {
            handlePlaybookRuns(serverUrl, allRuns, false, true);
        }

        return {runs: allRuns};
    } catch (error) {
        logDebug('error on fetchPlaybookRunsForChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
