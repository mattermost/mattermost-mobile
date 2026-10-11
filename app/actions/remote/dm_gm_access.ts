// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {removeLastViewedChannelIdAndServer, removeLastViewedThreadIdAndServer} from '@actions/app/global';
import {clearDmGmAccessSeq, nextDmGmAccessSeq, storeDmGmAccess} from '@actions/local/dm_gm_access';
import {Events, General, Screens} from '@constants';
import {DmGmAccessAction} from '@constants/access_control';
import {MM_TABLES} from '@constants/database';
import {DM_GM_ACCESS_VERSION} from '@constants/versions';
import DatabaseManager from '@database/manager';
import PushNotifications from '@init/push_notifications';
import NetworkManager from '@managers/network_manager';
import {getLastViewedChannelIdAndServer, getLastViewedThreadIdAndServer} from '@queries/app/global';
import {prepareDeleteChannel, queryChannelsByTypes} from '@queries/servers/channel';
import {DM_GM_ACCESS_ALLOWED, getDmGmAccess, getDmGmAccessRecord, type DmGmAccess} from '@queries/servers/dm_gm_access';
import {queryFilesForPosts} from '@queries/servers/file';
import {isChannelAccessEnforced} from '@queries/servers/render_permissions';
import {getCommonSystemValues, getConfigValue, getCurrentChannelId, prepareCommonSystemValues, type PrepareCommonSystemValuesArgs} from '@queries/servers/system';
import {queryTeamChannelHistories} from '@queries/servers/team';
import {navigateToRoot} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';
import {RENDER_PERMISSIONS_RETRY_MS, RENDER_PERMISSIONS_TTL_MS} from '@store/render_permissions_store';
import {getDmGmPolicyDenial} from '@utils/channel_policy';
import {getFullErrorMessage, isErrorWithStatusCode} from '@utils/errors';
import {deleteDownloadedFiles} from '@utils/file';
import {isMinimumServerVersion, isTablet} from '@utils/helpers';
import {logDebug} from '@utils/log';

import {handleKickFromChannel} from './channel';
import {forceLogoutIfNecessary} from './session';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type PostModel from '@typings/database/models/servers/post';

const {SERVER: {POST}} = MM_TABLES;

type ApplyOptions = {

    // 'threads' when entry already restored the channels, members and categories.
    restore?: 'full' | 'threads';
};

type StoreAndApplyOptions = {
    fromEntry?: boolean;
};

export type FetchDmGmAccessResult = {

    // The decisions and the sequence they were asked under, for a caller that stores them itself.
    dmGmAccess?: {access: DmGmAccess; seq: number};
    error?: unknown;
};

const DECISION_FIELDS: Array<[keyof DmGmAccess, string]> = [
    ['start', DmGmAccessAction.Start],
    ['read', DmGmAccessAction.Read],
    ['write', DmGmAccessAction.Write],
];

const HTTP_BAD_REQUEST = 400;
const HTTP_SERVER_ERROR = 500;

const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const retryFailures = new Map<string, number>();

// One apply at a time per server: work arriving mid-run is picked up by its next pass, which reads
// the decisions afresh, so a burst of stores costs at most two passes.
const pendingApply = new Map<string, ApplyOptions>();
const runningApply = new Map<string, Promise<void>>();

const clearRetryTimer = (serverUrl: string) => {
    const timer = retryTimers.get(serverUrl);
    if (timer) {
        clearTimeout(timer);
        retryTimers.delete(serverUrl);
    }
};

const resetRetry = (serverUrl: string) => {
    clearRetryTimer(serverUrl);
    retryFailures.delete(serverUrl);
};

// From RENDER_PERMISSIONS_RETRY_MS, doubling on each consecutive failure up to the TTL.
const scheduleRetry = (serverUrl: string) => {
    clearRetryTimer(serverUrl);
    const failures = (retryFailures.get(serverUrl) ?? 0) + 1;
    retryFailures.set(serverUrl, failures);

    const delay = Math.min(RENDER_PERMISSIONS_RETRY_MS * (2 ** (failures - 1)), RENDER_PERMISSIONS_TTL_MS);
    retryTimers.set(serverUrl, setTimeout(() => {
        retryTimers.delete(serverUrl);
        fetchDmGmAccess(serverUrl);
    }, delay));
};

// Every team's history: removeCurrentUserFromChannel strips a conversation from team '' only, and
// getNthLastChannelFromTeam does not check membership, so a tablet kick could land on another one.
async function stripTeamChannelHistories(operator: ServerDataOperator, channelIds: Set<string>) {
    const histories = await queryTeamChannelHistories(operator.database).fetch();
    const teamChannelHistories = histories.
        filter((h) => h.channelIds.some((id) => channelIds.has(id))).
        map((h) => ({id: h.id, channel_ids: h.channelIds.filter((id) => !channelIds.has(id))}));
    if (teamChannelHistories.length) {
        await operator.handleTeamChannelHistory({teamChannelHistories, prepareRecordsOnly: false});
    }
}

// Only the active server can have the conversations on screen. A current conversation that is not
// shown is cleared with the purge batch.
async function closeConversationScreens(serverUrl: string, database: Database, channelIds: Set<string>, postIds: Set<string>) {
    if ((await DatabaseManager.getActiveServerUrl()) !== serverUrl) {
        return;
    }

    const currentChannelId = await getCurrentChannelId(database);
    const channelShown = channelIds.has(currentChannelId) && (isTablet() || NavigationStore.isScreenInStack(Screens.CHANNEL));
    if (channelShown) {
        // Navigates to the root, which also closes a thread of it, and emits the event once.
        await handleKickFromChannel(serverUrl, currentChannelId, Events.DM_GM_ACCESS_REVOKED);
    } else if (postIds.has(EphemeralStore.getCurrentThreadId()) && NavigationStore.isScreenInStack(Screens.THREAD)) {
        await navigateToRoot();
        DeviceEventEmitter.emit(Events.DM_GM_ACCESS_REVOKED);
    }

    // The file viewers hold their items by value, so deleting the rows does not reach them.
    if (postIds.has(EphemeralStore.getCurrentFileViewerPostId())) {
        DeviceEventEmitter.emit(Events.CLOSE_GALLERY);
    }
}

async function clearLastViewedConversation(serverUrl: string, channelIds: Set<string>, postIds: Set<string>) {
    const [lastChannel, lastThread] = await Promise.all([getLastViewedChannelIdAndServer(), getLastViewedThreadIdAndServer()]);
    if (lastChannel?.server_url === serverUrl && channelIds.has(lastChannel.channel_id)) {
        await removeLastViewedChannelIdAndServer();
    }
    if (lastThread?.server_url === serverUrl && postIds.has(lastThread.thread_id)) {
        await removeLastViewedThreadIdAndServer();
    }
}

/**
 * Losing Read hides every conversation locally; nothing is sent to the server. Their drafts and
 * category entries are kept, unseen because those queries join on the channel, so the conversations
 * come back intact with access. Runs only inside the apply queue.
 */
export async function purgeDirectAndGroupChannels(serverUrl: string) {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const channels = await queryChannelsByTypes(database, [General.DM_CHANNEL, General.GM_CHANNEL]).fetch();
    if (!channels.length) {
        logDebug('purgeDirectAndGroupChannels: no conversations stored');
        return;
    }

    const channelIds = new Set(channels.map((c) => c.id));
    const posts = await database.get<PostModel>(POST).query(Q.where('channel_id', Q.oneOf([...channelIds]))).fetch();
    const postIds = new Set(posts.map((p) => p.id));

    // Committed first, so a tablet kick picks a surviving channel.
    await stripTeamChannelHistories(operator, channelIds);
    await closeConversationScreens(serverUrl, database, channelIds, postIds);

    const files = await queryFilesForPosts(database, [...postIds]).fetch();
    const models = (await Promise.all(channels.map((c) => prepareDeleteChannel(serverUrl, c, {keepDrafts: true, keepCategoryChannels: true})))).flat();

    const {currentChannelId, lastUnreadChannelId} = await getCommonSystemValues(database);
    const systemValues: PrepareCommonSystemValuesArgs = {};
    if (channelIds.has(currentChannelId)) {
        systemValues.currentChannelId = '';
    }
    if (channelIds.has(lastUnreadChannelId)) {
        systemValues.lastUnreadChannelId = '';
    }
    if (Object.keys(systemValues).length) {
        models.push(...await prepareCommonSystemValues(operator, systemValues));
    }

    await operator.batchRecords(models, 'purgeDirectAndGroupChannels');

    for (const id of channelIds) {
        PushNotifications.removeChannelNotifications(serverUrl, id);
    }
    deleteDownloadedFiles(serverUrl, files);
    await clearLastViewedConversation(serverUrl, channelIds, postIds);
    logDebug('purgeDirectAndGroupChannels: hid conversations', channelIds.size);
}

export async function restoreDirectAndGroupChannels(serverUrl: string, {entryHandled}: {entryHandled: boolean}) {
    logDebug('restoreDirectAndGroupChannels: not implemented yet', serverUrl, entryHandled);
}

async function runApply(serverUrl: string, {restore}: ApplyOptions) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const access = await getDmGmAccess(database);
        if (!access.read) {
            await purgeDirectAndGroupChannels(serverUrl);
        } else if (restore) {
            await restoreDirectAndGroupChannels(serverUrl, {entryHandled: restore === 'threads'});
        }
    } catch (error) {
        logDebug('error on applyDmGmAccess', getFullErrorMessage(error));
    }
}

async function drainApply(serverUrl: string) {
    try {
        for (let work = pendingApply.get(serverUrl); work; work = pendingApply.get(serverUrl)) {
            pendingApply.delete(serverUrl);
            // eslint-disable-next-line no-await-in-loop
            await runApply(serverUrl, work);
        }
    } finally {
        // Released in the same tick as the last empty check, so no work is left behind unrun.
        runningApply.delete(serverUrl);
    }
}

/**
 * Brings the stored conversations in line with the Read decision: purges them while it is denied,
 * otherwise runs a pending restore. Resolves once the queued work, including this call's, is done.
 */
export function applyDmGmAccess(serverUrl: string, {restore}: ApplyOptions = {}): Promise<void> {
    const work = pendingApply.get(serverUrl) ?? {};
    if (restore === 'full' || (restore && !work.restore)) {
        work.restore = restore;
    }
    pendingApply.set(serverUrl, work);

    let run = runningApply.get(serverUrl);
    if (!run) {
        run = drainApply(serverUrl);
        runningApply.set(serverUrl, run);
    }
    return run;
}

/**
 * Stores the decisions and applies a change of Read: a denial purges the conversations, and regaining
 * it restores them. A purge is also re-run while Read stays denied, in case a previous one did not
 * finish. Entry restores the channels itself, so after it only threads are restored.
 */
export async function storeAndApplyDmGmAccess(serverUrl: string, access: DmGmAccess, seq: number, {fromEntry = false}: StoreAndApplyOptions = {}) {
    const {stored, error} = await storeDmGmAccess(serverUrl, access, seq);
    if (!stored) {
        return {error};
    }

    if (!stored.access.read) {
        await applyDmGmAccess(serverUrl);
    } else if (!stored.previous.read) {
        await applyDmGmAccess(serverUrl, {restore: fromEntry ? 'threads' : 'full'});
    }
    return {};
}

/**
 * Fetches the session's decisions for the direct and group message actions. Skipped, with the decisions
 * reset to allowed, on servers without them and while the policies are not enforced.
 *
 * A decision with a reason is an evaluation error: its previous value is kept and the decisions are
 * asked again with backoff, so a transient error never hides anything. Failed requests also keep the
 * stored decisions; only network and server errors are retried.
 * @param serverUrl - The server URL
 * @param fetchOnly - Return the decisions without storing them, for entry to store after its batch
 * @param groupLabel - The request group label
 * @returns The decisions with the sequence they were asked under, or an error
 */
export async function fetchDmGmAccess(serverUrl: string, fetchOnly = false, groupLabel?: RequestGroupLabel): Promise<FetchDmGmAccessResult> {
    // This request supersedes a pending retry; its own outcome schedules the next one if needed.
    clearRetryTimer(serverUrl);
    const seq = nextDmGmAccessSeq();

    let database: Database;
    try {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    } catch (error) {
        logDebug('error on fetchDmGmAccess', getFullErrorMessage(error));
        return {error};
    }

    let access: DmGmAccess;
    try {
        const [serverVersion, enforced] = await Promise.all([getConfigValue(database, 'Version'), isChannelAccessEnforced(database)]);
        if (!enforced || !isMinimumServerVersion(serverVersion, ...DM_GM_ACCESS_VERSION)) {
            resetRetry(serverUrl);
            access = DM_GM_ACCESS_ALLOWED;
        } else {
            access = await requestDecisions(serverUrl, database, groupLabel);
        }
    } catch (error) {
        logDebug('error on fetchDmGmAccess', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);

        const status = isErrorWithStatusCode(error) ? error.status_code : undefined;
        if (status !== HTTP_BAD_REQUEST) {
            // Asking again soon gets the same answer to a refusal, so only a network or server error
            // is retried.
            if (status === undefined || status >= HTTP_SERVER_ERROR) {
                scheduleRetry(serverUrl);
            }
            return {error};
        }

        // A server without the permission resource rejects it, so nothing is governed there.
        resetRetry(serverUrl);
        access = DM_GM_ACCESS_ALLOWED;
    }

    if (!fetchOnly) {
        await storeAndApplyDmGmAccess(serverUrl, access, seq);
    }
    return {dmGmAccess: {access, seq}};
}

async function requestDecisions(serverUrl: string, database: Database, groupLabel?: RequestGroupLabel): Promise<DmGmAccess> {
    const client = NetworkManager.getClient(serverUrl);
    const {decisions = {}} = await client.searchPermissionActionDecisions(groupLabel);

    const previous = await getDmGmAccessRecord(database);
    const access = {...DM_GM_ACCESS_ALLOWED};
    let evaluationFailed = false;
    for (const [field, action] of DECISION_FIELDS) {
        const decision = decisions[action];
        if (decision?.reason) {
            evaluationFailed = true;
            access[field] = previous[field];
        } else {
            access[field] = !(decision?.evaluated && !decision.allowed);
        }
    }

    if (evaluationFailed) {
        scheduleRetry(serverUrl);
    } else {
        resetRetry(serverUrl);
    }
    return access;
}

/**
 * Records the action a DM/GM policy refusal names as denied straight away, and on a Read refusal
 * purges the conversations. Any other error is ignored.
 */
export async function handleDmGmPolicyError(serverUrl: string, error: unknown) {
    const denial = getDmGmPolicyDenial(error);
    if (!denial) {
        return;
    }

    await storeDmGmAccess(serverUrl, (previous) => ({...previous, [denial]: false}), nextDmGmAccessSeq());
    if (denial === 'read') {
        await applyDmGmAccess(serverUrl);
    }
}

export function clearDmGmAccessState(serverUrl: string) {
    resetRetry(serverUrl);
    pendingApply.delete(serverUrl);
    clearDmGmAccessSeq(serverUrl);
}
