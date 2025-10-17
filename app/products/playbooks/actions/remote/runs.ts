// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {updateLastPlaybookRunsFetchAt} from '@playbooks/actions/local/channel';
import {handlePlaybookRuns, setOwner as localSetOwner} from '@playbooks/actions/local/run';
import {getLastPlaybookRunsFetchAt} from '@playbooks/database/queries/run';
import {getMaxRunUpdateAt} from '@playbooks/utils/run';
import EphemeralStore from '@store/ephemeral_store';
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
            EphemeralStore.setChannelPlaybooksSynced(serverUrl, channelId);
            return {runs: []};
        }

        if (!fetchOnly) {
            const result = await handlePlaybookRuns(serverUrl, allRuns, false, true);
            if (result && result.error) {
                throw result.error;
            }

            EphemeralStore.setChannelPlaybooksSynced(serverUrl, channelId);
        }

        updateLastPlaybookRunsFetchAt(serverUrl, channelId, getMaxRunUpdateAt(allRuns));

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
            sort: 'create_at',
            direction: 'desc',
        });

        return {runs, has_more};
    } catch (error) {
        logDebug('error on fetchFinishedRunsForChannel', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchPlaybookRun = async (serverUrl: string, runId: string, fetchOnly = false) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const run = await client.fetchPlaybookRun(runId);

        if (!fetchOnly) {
            const result = await handlePlaybookRuns(serverUrl, [run], false, true);
            if (result.error) {
                logDebug('error on handlePlaybookRuns', getFullErrorMessage(result.error));
                return {error: result.error};
            }
        }

        return {run};
    } catch (error) {
        logDebug('error on fetchPlaybookRun', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchPlaybookRunMetadata = async (serverUrl: string, runId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const metadata = await client.fetchPlaybookRunMetadata(runId);
        return {metadata};
    } catch (error) {
        logDebug('error on fetchPlaybookRunMetadata', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const setOwner = async (serverUrl: string, playbookRunId: string, ownerId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.setOwner(playbookRunId, ownerId);

        await localSetOwner(serverUrl, playbookRunId, ownerId);
        return {data: true};
    } catch (error) {
        logDebug('error on setOwner', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const createPlaybookRun = async (
    serverUrl: string,
    playbook_id: string,
    owner_user_id: string,
    team_id: string,
    name: string,
    description: string,
    channel_id?: string,
    create_public_run?: boolean,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const run = await client.createPlaybookRun(playbook_id, owner_user_id, team_id, name, description, channel_id, create_public_run);
        return {data: run};
    } catch (error) {
        logDebug('error on createPlaybookRun', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const postStatusUpdate = async (serverUrl: string, playbookRunID: string, payload: PostStatusUpdatePayload, ids: PostStatusUpdateIds) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.postStatusUpdate(playbookRunID, payload, ids);
    } catch (error) {
        logDebug('error on postStatusUpdate', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
    }
};

export const finishRun = async (serverUrl: string, playbookRunId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.finishRun(playbookRunId);
        return {data: true};
    } catch (error) {
        logDebug('error on finishRun', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchPlaybookRunsPageForParticipant = async (serverUrl: string, participantId: string, page = 0) => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        const {items: runs, has_more} = await client.fetchPlaybookRuns({
            page,
            per_page: PER_PAGE_DEFAULT,
            participant_id: participantId,
            sort: 'create_at',
            direction: 'desc',
        });

        return {runs, hasMore: has_more};
    } catch (error) {
        logDebug('error on fetchPlaybookRunsPageForParticipant', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
