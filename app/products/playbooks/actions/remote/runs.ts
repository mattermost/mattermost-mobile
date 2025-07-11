// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {updateLastPlaybookRunsFetchAt} from '@playbooks/actions/local/channel';
import {handlePlaybookRuns} from '@playbooks/actions/local/run';
import {getLastPlaybookRunsFetchAt} from '@playbooks/database/queries/run';
import {getMaxRunUpdateAt} from '@playbooks/utils/run';
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

        const lastFetchAt = await getLastPlaybookRunsFetchAt(database, channelId);

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
                per_page: PER_PAGE_DEFAULT,
                channel_id: channelId,
                since: lastFetchAt + 1,
            });
            hasMore = has_more;
            allRuns.push(...runs);
            page++;
        }

        if (!allRuns.length) {
            return {runs: []};
        }

        updateLastPlaybookRunsFetchAt(serverUrl, channelId, getMaxRunUpdateAt(allRuns));

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

export const fetchFinishedRunsForChannel = async (serverUrl: string, channelId: string, page = 0) => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        const {items: runs, has_more} = await client.fetchPlaybookRuns({
            page,
            per_page: PER_PAGE_DEFAULT,
            channel_id: channelId,
            statuses: ['Finished'],
            sort: 'end_at',
        });

        return {runs, has_more};
    } catch (error) {
        logDebug('error on fetchFinishedRunsForChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
