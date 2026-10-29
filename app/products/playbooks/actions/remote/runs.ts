// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {updateLastPlaybookRunsFetchAt} from '@playbooks/actions/local/channel';
import {handlePlaybookRuns, setOwner as localSetOwner, updatePlaybookRun as localUpdatePlaybookRun} from '@playbooks/actions/local/run';
import {getObservedTaskActivityRevision} from '@playbooks/actions/local/task_activity';
import {getLastPlaybookRunsFetchAt, getPlaybookRunById} from '@playbooks/database/queries/run';
import {getMaxRunUpdateAt} from '@playbooks/utils/run';
import {compareTaskActivityRevisions} from '@playbooks/utils/task_activity_sync';
import EphemeralStore from '@store/ephemeral_store';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {fetchPlaybookRunPropertyFields} from './property_fields';

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
            if (result.error && !result.failedRunIds?.length) {
                throw result.error;
            }

            // A run the list read cannot apply, such as one whose certificate the server has
            // dropped, is fetched on its own so it cannot keep the rest of the channel unsynced.
            for (const runId of result.failedRunIds ?? []) {
                // eslint-disable-next-line no-await-in-loop
                await ensurePlaybookRunActivityFresh(serverUrl, runId);
            }

            EphemeralStore.setChannelPlaybooksSynced(serverUrl, channelId);
        }

        if (!fetchOnly) {
            const watermark = await updateLastPlaybookRunsFetchAt(serverUrl, channelId, getMaxRunUpdateAt(allRuns));
            if (watermark.error) {
                throw watermark.error;
            }
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
        const initialDatabase = DatabaseManager.serverDatabases[serverUrl]?.database;
        const cachedAtStart = initialDatabase && await getPlaybookRunById(initialDatabase, runId);
        const requests = !fetchOnly && initialDatabase ? getRunRequests(initialDatabase) : undefined;
        const request = requests && (requests.set(runId, (requests.get(runId) ?? 0) + 1), requests.get(runId));
        const run = await client.fetchPlaybookRun(runId);

        if (!fetchOnly) {
            if (!initialDatabase || DatabaseManager.serverDatabases[serverUrl]?.database !== initialDatabase ||
                requests?.get(runId) !== request ||
                (cachedAtStart && !await getPlaybookRunById(initialDatabase, runId))) {
                return {error: new Error('Playbook run cache changed during refresh')};
            }
            const result = await handlePlaybookRuns(serverUrl, [run], false, true, true);
            if (result.error) {
                logDebug('error on handlePlaybookRuns', getFullErrorMessage(result.error));
                return {error: result.error};
            }

            // Fetch property fields and values for the run
            const propertyFieldsResult = await fetchPlaybookRunPropertyFields(serverUrl, runId, fetchOnly);
            if (propertyFieldsResult.error) {
                logDebug('error on fetchPlaybookRunPropertyFields', getFullErrorMessage(propertyFieldsResult.error));

                // Don't return error - property fields are not critical, just log it
            }
        }

        return {run};
    } catch (error) {
        logDebug('error on fetchPlaybookRun', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

const runRequests = new WeakMap<object, Map<string, number>>();
const getRunRequests = (database: object) => {
    let requests = runRequests.get(database);
    if (!requests) {
        requests = new Map();
        runRequests.set(database, requests);
    }
    return requests;
};

const activityRefreshes = new Map<string, Promise<Awaited<ReturnType<typeof fetchPlaybookRun>>>>();

export const ensurePlaybookRunActivityFresh = (serverUrl: string, runId: string) => {
    const key = `${serverUrl}\0${runId}`;
    const inFlight = activityRefreshes.get(key);
    if (inFlight) {
        return inFlight;
    }
    const refresh = (async () => {
        const database = DatabaseManager.serverDatabases[serverUrl]?.database;
        const first = await fetchPlaybookRun(serverUrl, runId);
        if (first.error || !database || DatabaseManager.serverDatabases[serverUrl]?.database !== database) {
            return first;
        }
        const observed = getObservedTaskActivityRevision(database, runId);
        const persisted = await getPlaybookRunById(database, runId);
        if (observed && persisted && (
            (observed.epoch === persisted.taskActivityEpoch && persisted.taskActivityRevision && compareTaskActivityRevisions(observed.revision, persisted.taskActivityRevision) > 0) ||
            observed.epoch !== persisted.taskActivityEpoch
        )) {
            return fetchPlaybookRun(serverUrl, runId);
        }
        return first;
    })();
    activityRefreshes.set(key, refresh);
    refresh.finally(() => {
        if (activityRefreshes.get(key) === refresh) {
            activityRefreshes.delete(key);
        }
    });
    return refresh;
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

export const updatePlaybookRun = async (serverUrl: string, playbookRunId: string, name: string, summary: string, canEditSummary: boolean) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const updates: Partial<PlaybookRun> = {name};
        if (canEditSummary) {
            updates.summary = summary;
        }
        await client.patchPlaybookRun(playbookRunId, updates);

        // Update local database
        const result = await localUpdatePlaybookRun(serverUrl, playbookRunId, name, canEditSummary ? summary : undefined);
        if (result.error) {
            logDebug('[updatePlaybookRun] local update failed after successful API call', getFullErrorMessage(result.error));
            return result;
        }
        return {data: true};
    } catch (error) {
        logDebug('[updatePlaybookRun]', getFullErrorMessage(error));
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
        return {data: true};
    } catch (error) {
        logDebug('error on postStatusUpdate', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
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

export const fetchPlaybookRunsPageForParticipant = async (serverUrl: string, participantId: string, teamId: string, page = 0) => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        const {items: runs, has_more} = await client.fetchPlaybookRuns({
            page,
            per_page: PER_PAGE_DEFAULT,
            participant_id: participantId,
            sort: 'create_at',
            direction: 'desc',
            team_id: teamId,
        });

        return {runs, hasMore: has_more};
    } catch (error) {
        logDebug('error on fetchPlaybookRunsPageForParticipant', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
