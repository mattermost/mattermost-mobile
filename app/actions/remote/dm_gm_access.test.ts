// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {storeLastViewedChannelIdAndServer, storeLastViewedThreadIdAndServer} from '@actions/app/global';
import {storeMyChannelsForTeam} from '@actions/local/channel';
import {isDmGmAccessSynced, nextDmGmAccessSeq, storeDmGmAccess} from '@actions/local/dm_gm_access';
import {ActionType, Events, General, License, Screens, ServerErrors} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import PushNotifications from '@init/push_notifications';
import NetworkManager from '@managers/network_manager';
import {getLastViewedChannelIdAndServer, getLastViewedThreadIdAndServer} from '@queries/app/global';
import {DM_GM_ACCESS_ALLOWED, getDmGmAccessRecord} from '@queries/servers/dm_gm_access';
import {getCommonSystemValues} from '@queries/servers/system';
import {getTeamChannelHistory} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {navigateToRoot} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';
import {RENDER_PERMISSIONS_RETRY_MS} from '@store/render_permissions_store';
import TestHelper from '@test/test_helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';
import {deleteDownloadedFiles} from '@utils/file';

import {fetchCategories} from './category';
import {fetchDirectChannelsInfo, fetchMyChannelsForTeam, handleKickFromChannel} from './channel';
import {applyDmGmAccess, clearDmGmAccessState, fetchDmGmAccess, handleDmGmPolicyError, purgeDirectAndGroupChannels, restoreDirectAndGroupChannels, storeAndApplyDmGmAccess, type FetchDmGmAccessResult} from './dm_gm_access';
import {forceLogoutIfNecessary} from './session';
import {syncTeamThreads} from './thread';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('./session', () => ({
    forceLogoutIfNecessary: jest.fn(),
}));

jest.mock('./channel', () => ({
    fetchDirectChannelsInfo: jest.fn(),
    fetchMyChannelsForTeam: jest.fn(),
    handleKickFromChannel: jest.fn(),
}));

jest.mock('./category', () => ({
    fetchCategories: jest.fn(),
}));

jest.mock('./thread', () => ({
    syncTeamThreads: jest.fn(),
}));

jest.mock('@queries/servers/thread', () => ({
    ...jest.requireActual('@queries/servers/thread'),
    getIsCRTEnabled: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    navigateToRoot: jest.fn(),
}));

jest.mock('@utils/file', () => ({
    ...jest.requireActual('@utils/file'),
    deleteDownloadedFiles: jest.fn(),
}));

const serverUrl = 'dm-gm-access-remote.test.com';
let operator: ServerDataOperator;

const mockClient = {
    searchPermissionActionDecisions: jest.fn(),
};

const response = (decisions: Record<string, RenderPermissionDecision>): ActionSearchResponse => ({
    resource: {type: 'permission', id: ''},
    results: [],
    decisions,
});

const allowedDecision = {allowed: true, evaluated: true};
const deniedDecision = {allowed: false, evaluated: true};
const failedDecision = {allowed: false, evaluated: true, reason: 'restricted_by_policy'};

const readDenied = {start: true, read: false, write: true};

const serverError = (serverErrorId: string) => ({server_error_id: serverErrorId, status_code: 403, message: 'denied'});

const storeConfig = async (config: Record<string, string>) => {
    await operator.handleConfigs({
        configs: Object.entries(config).map(([id, value]) => ({id, value})),
        configsToDelete: [],
        prepareRecordsOnly: false,
    });
};

const storeLicense = (skuShortName: string) => operator.handleSystem({
    systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: skuShortName}}],
    prepareRecordsOnly: false,
});

const enforcedOnServer = async (version: string) => {
    await storeConfig({
        Version: version,
        FeatureFlagPermissionPolicies: 'true',
        EnableAttributeBasedAccessControl: 'true',
    });
    await storeLicense(License.SKU_SHORT_NAME.EnterpriseAdvanced);
};

// The retry runs a whole fetch, whose database reads each take a tick.
const flush = async () => {
    for (let i = 0; i < 10; i++) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(process.nextTick);
    }
};

describe('fetchDmGmAccess', () => {
    beforeAll(() => {
        (NetworkManager.getClient as jest.Mock) = jest.fn(() => mockClient);
    });

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        mockClient.searchPermissionActionDecisions.mockReset();
    });

    afterEach(async () => {
        clearDmGmAccessState(serverUrl);
        disableFakeTimers();
        jest.clearAllMocks();
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should map the decisions and store them', async () => {
        await enforcedOnServer('12.1.0');
        mockClient.searchPermissionActionDecisions.mockResolvedValue(response({
            dm_gm_start: deniedDecision,
            dm_gm_read_access: allowedDecision,

            // Not evaluated: the action's default, allowed, applies.
            dm_gm_write_access: {allowed: false, evaluated: false},
        }));

        const result = await fetchDmGmAccess(serverUrl, false, 'Cold Start');

        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledWith('Cold Start');
        expect(result.dmGmAccess?.access).toEqual({start: false, read: true, write: true});
        expect(await getDmGmAccessRecord(operator.database)).toEqual({start: false, read: true, write: true});
    });

    it('should return the decisions without storing them when fetching only', async () => {
        await enforcedOnServer('12.1.0');
        mockClient.searchPermissionActionDecisions.mockResolvedValue(response({dm_gm_read_access: deniedDecision}));

        const result = await fetchDmGmAccess(serverUrl, true);

        expect(result).toEqual({dmGmAccess: {access: readDenied, seq: expect.any(Number)}});
        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);
    });

    it('should reset the decisions to allowed without asking an older server, or one not enforcing the policies', async () => {
        await enforcedOnServer('12.0.0');
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        await fetchDmGmAccess(serverUrl);
        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);

        await storeConfig({Version: '12.1.0'});
        await storeLicense(License.SKU_SHORT_NAME.Enterprise);
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        await fetchDmGmAccess(serverUrl);
        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);

        expect(mockClient.searchPermissionActionDecisions).not.toHaveBeenCalled();
    });

    it('should keep the previous value of a decision with a reason and ask again with backoff', async () => {
        await enforcedOnServer('12.1.0');
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        enableFakeTimers();
        mockClient.searchPermissionActionDecisions.mockResolvedValue(response({
            dm_gm_start: deniedDecision,
            dm_gm_read_access: failedDecision,
            dm_gm_write_access: allowedDecision,
        }));

        await fetchDmGmAccess(serverUrl);
        expect(await getDmGmAccessRecord(operator.database)).toEqual({start: false, read: false, write: true});

        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(2);

        // The second consecutive failure waits twice as long.
        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(2);

        mockClient.searchPermissionActionDecisions.mockResolvedValue(response({dm_gm_read_access: allowedDecision}));
        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(3);
        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);

        // A clean answer ends the retries.
        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS * 4);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(3);
    });

    it('should treat a 400 as a server without the decisions, allowing everything without asking again', async () => {
        await enforcedOnServer('12.1.0');
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        enableFakeTimers();
        mockClient.searchPermissionActionDecisions.mockRejectedValue({status_code: 400, message: 'invalid resource type'});

        const result = await fetchDmGmAccess(serverUrl);

        expect(result.dmGmAccess?.access).toEqual(DM_GM_ACCESS_ALLOWED);
        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);

        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(1);
    });

    it('should keep the decisions on a refusal without asking again', async () => {
        await enforcedOnServer('12.1.0');
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        enableFakeTimers();
        mockClient.searchPermissionActionDecisions.mockRejectedValue({status_code: 403, message: 'forbidden'});

        const result = await fetchDmGmAccess(serverUrl);

        expect(result.error).toBeDefined();
        expect(await getDmGmAccessRecord(operator.database)).toEqual(readDenied);

        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(1);
    });

    it('should keep the decisions on a network error and ask again, until the server is torn down', async () => {
        await enforcedOnServer('12.1.0');
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        enableFakeTimers();
        mockClient.searchPermissionActionDecisions.mockRejectedValue(new Error('network down'));

        const result = await fetchDmGmAccess(serverUrl);

        expect(result.error).toBeDefined();
        expect(await getDmGmAccessRecord(operator.database)).toEqual(readDenied);

        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(2);

        clearDmGmAccessState(serverUrl);
        await advanceTimers(RENDER_PERMISSIONS_RETRY_MS * 2);
        await flush();
        expect(mockClient.searchPermissionActionDecisions).toHaveBeenCalledTimes(2);
    });

    it('should log out on a 401', async () => {
        await enforcedOnServer('12.1.0');
        const error = {status_code: 401, message: 'unauthorized', url: `${serverUrl}/api/v4/access_control/decisions/actions/search`};
        mockClient.searchPermissionActionDecisions.mockRejectedValue(error);

        const result = await fetchDmGmAccess(serverUrl);

        expect(result.error).toBe(error);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
    });

    it('should count as synced only once a fetch stored the decisions, until teardown', async () => {
        await enforcedOnServer('12.1.0');
        mockClient.searchPermissionActionDecisions.mockResolvedValue(response({dm_gm_read_access: allowedDecision}));

        await fetchDmGmAccess(serverUrl, true);
        expect(isDmGmAccessSynced(serverUrl)).toBe(false);

        mockClient.searchPermissionActionDecisions.mockRejectedValueOnce({status_code: 403, message: 'forbidden'});
        await fetchDmGmAccess(serverUrl);
        expect(isDmGmAccessSynced(serverUrl)).toBe(false);

        await fetchDmGmAccess(serverUrl);
        expect(isDmGmAccessSynced(serverUrl)).toBe(true);

        clearDmGmAccessState(serverUrl);
        expect(isDmGmAccessSynced(serverUrl)).toBe(false);
    });

    it('should drop an answer that lands after a newer one', async () => {
        await enforcedOnServer('12.1.0');
        let resolveFirst: (value: ActionSearchResponse) => void = () => undefined;
        mockClient.searchPermissionActionDecisions.
            mockReturnValueOnce(new Promise((resolve) => {
                resolveFirst = resolve;
            })).
            mockResolvedValueOnce(response({dm_gm_read_access: deniedDecision}));

        const first = fetchDmGmAccess(serverUrl);
        await fetchDmGmAccess(serverUrl);
        resolveFirst(response({dm_gm_read_access: allowedDecision}));
        await first;

        expect(await getDmGmAccessRecord(operator.database)).toEqual(readDenied);
    });
});

type DmGmAccessAnswer = NonNullable<FetchDmGmAccessResult['dmGmAccess']>;

describe('storeAndApplyDmGmAccess ordering', () => {
    const dm = TestHelper.fakeChannel({id: 'dmchannelid', name: 'user1__user2', type: General.DM_CHANNEL, team_id: ''});

    beforeAll(() => {
        (NetworkManager.getClient as jest.Mock) = jest.fn(() => mockClient);
    });

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        await enforcedOnServer('12.1.0');
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'teamid1'}], prepareRecordsOnly: false});
        jest.mocked(getIsCRTEnabled).mockResolvedValue(true);
        jest.mocked(syncTeamThreads).mockResolvedValue({error: false, models: []});
        mockClient.searchPermissionActionDecisions.mockReset();
    });

    afterEach(async () => {
        clearDmGmAccessState(serverUrl);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should drop a cold start answer stored after an event refresh asked later', async () => {
        mockClient.searchPermissionActionDecisions.mockResolvedValueOnce(response({dm_gm_read_access: deniedDecision}));
        const {access, seq} = (await fetchDmGmAccess(serverUrl, true)).dmGmAccess as DmGmAccessAnswer;

        mockClient.searchPermissionActionDecisions.mockResolvedValueOnce(response({dm_gm_read_access: allowedDecision}));
        await fetchDmGmAccess(serverUrl);
        await storeAndApplyDmGmAccess(serverUrl, access, seq, {fromEntry: true});

        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);
    });

    it('should let an event refresh asked after the cold start one replace it', async () => {
        mockClient.searchPermissionActionDecisions.mockResolvedValueOnce(response({dm_gm_read_access: allowedDecision}));
        const {access, seq} = (await fetchDmGmAccess(serverUrl, true)).dmGmAccess as DmGmAccessAnswer;
        await storeAndApplyDmGmAccess(serverUrl, access, seq, {fromEntry: true});

        mockClient.searchPermissionActionDecisions.mockResolvedValueOnce(response({dm_gm_read_access: deniedDecision}));
        await fetchDmGmAccess(serverUrl);

        expect(await getDmGmAccessRecord(operator.database)).toEqual(readDenied);
    });

    it('should purge on losing Read and restore, after entry only the threads, on regaining it', async () => {
        await operator.handleChannel({channels: [dm], prepareRecordsOnly: false});

        await storeAndApplyDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        expect(await operator.database.get(MM_TABLES.SERVER.CHANNEL).query().fetchCount()).toBe(0);

        await storeAndApplyDmGmAccess(serverUrl, DM_GM_ACCESS_ALLOWED, nextDmGmAccessSeq(), {fromEntry: true});
        expect(fetchMyChannelsForTeam).not.toHaveBeenCalled();
        expect(syncTeamThreads).toHaveBeenCalledWith(serverUrl, 'teamid1', {refresh: true});
    });
});

describe('handleDmGmPolicyError', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        clearDmGmAccessState(serverUrl);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it.each([
        [ServerErrors.DM_GM_START_DENIED, {start: false, read: true, write: true}],
        [ServerErrors.DM_GM_READ_ACCESS_DENIED, {start: true, read: false, write: true}],
        [ServerErrors.DM_GM_WRITE_ACCESS_DENIED, {start: true, read: true, write: false}],
    ])('should record the action %s names as denied', async (serverErrorId, expected) => {
        await handleDmGmPolicyError(serverUrl, serverError(serverErrorId));

        expect(await getDmGmAccessRecord(operator.database)).toEqual(expected);
    });

    it('should keep the other decisions', async () => {
        await handleDmGmPolicyError(serverUrl, serverError(ServerErrors.DM_GM_READ_ACCESS_DENIED));
        await handleDmGmPolicyError(serverUrl, {details: serverError(ServerErrors.DM_GM_WRITE_ACCESS_DENIED)});

        expect(await getDmGmAccessRecord(operator.database)).toEqual({start: true, read: false, write: false});
    });

    it('should ignore any other error', async () => {
        await handleDmGmPolicyError(serverUrl, serverError(ServerErrors.CHANNEL_WRITE_ACCESS_DENIED));
        await handleDmGmPolicyError(serverUrl, new Error('network down'));

        expect(await getDmGmAccessRecord(operator.database)).toEqual(DM_GM_ACCESS_ALLOWED);
    });
});

describe('purgeDirectAndGroupChannels', () => {
    const {SERVER: {
        CHANNEL, CHANNEL_BOOKMARK, CHANNEL_INFO, CHANNEL_MEMBERSHIP, DRAFT, FILE, MY_CHANNEL,
        MY_CHANNEL_SETTINGS, POST, POSTS_IN_CHANNEL, POSTS_IN_THREAD, REACTION, THREAD, THREADS_IN_TEAM,
    }} = MM_TABLES;

    const teamId = 'teamid1';
    const otherTeamId = 'teamid2';
    const userId = 'userid1';
    const dmId = 'dmchannelid';
    const gmId = 'gmchannelid';
    const openId = 'openchannelid';
    const rootId = 'dmrootpostid';
    const replyId = 'dmreplypostid';

    const countIn = (table: string, column: string, values: string[]) => {
        return operator.database.get(table).query(Q.where(column, Q.oneOf(values))).fetchCount();
    };

    const seed = async () => {
        const channels = [
            TestHelper.fakeChannel({id: dmId, name: `${userId}__other`, type: General.DM_CHANNEL, team_id: ''}),
            TestHelper.fakeChannel({id: gmId, name: 'gm', type: General.GM_CHANNEL, team_id: ''}),
            TestHelper.fakeChannel({id: openId, name: 'open', type: General.OPEN_CHANNEL, team_id: teamId}),
        ];
        const memberships = channels.map((c) => TestHelper.fakeChannelMember({channel_id: c.id, user_id: userId}));
        await storeMyChannelsForTeam(serverUrl, '', channels, memberships, false);

        const root = TestHelper.fakePost({
            id: rootId,
            channel_id: dmId,
            metadata: {
                files: [TestHelper.fakeFileInfo({id: 'dmfileid', post_id: rootId})],
                reactions: [{user_id: userId, post_id: rootId, emoji_name: 'smile', create_at: 1}],
            },
        });
        const reply = TestHelper.fakePost({id: replyId, channel_id: dmId, root_id: rootId});
        const openPost = TestHelper.fakePost({id: 'openpostid', channel_id: openId});
        await operator.handlePosts({actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL, order: [replyId, rootId], posts: [root, reply], prepareRecordsOnly: false});
        await operator.handlePosts({actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL, order: ['openpostid'], posts: [openPost], prepareRecordsOnly: false});
        await operator.handleThreads({threads: [{...TestHelper.fakeThread({id: rootId, post: root, reply_count: 1}), lastFetchedAt: 0}], teamId, prepareRecordsOnly: false});

        await operator.handleChannelBookmark({
            bookmarks: [{id: 'bookmarkid', channel_id: dmId, create_at: 1, update_at: 1, delete_at: 0, owner_id: userId, display_name: 'link', link_url: 'http://test.com', sort_order: 0, type: 'link'}],
            prepareRecordsOnly: false,
        });

        // One call per draft: the handler keeps one draft per channel from each call.
        await operator.handleDraft({drafts: [{channel_id: dmId, root_id: '', message: 'channel draft', update_at: 1}], prepareRecordsOnly: false});
        await operator.handleDraft({drafts: [{channel_id: dmId, root_id: rootId, message: 'thread draft', update_at: 1}], prepareRecordsOnly: false});
        await operator.handleTeamChannelHistory({
            teamChannelHistories: [
                {id: teamId, channel_ids: [dmId, openId, gmId]},
                {id: otherTeamId, channel_ids: [gmId]},
            ],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId},
                {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: dmId},
                {id: SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID, value: gmId},
            ],
            prepareRecordsOnly: false,
        });
    };

    beforeAll(() => {
        (NetworkManager.getClient as jest.Mock) = jest.fn(() => mockClient);
    });

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(serverUrl);
        jest.spyOn(PushNotifications, 'removeChannelNotifications').mockImplementation(async () => undefined);
        jest.spyOn(NavigationStore, 'isScreenInStack').mockReturnValue(false);
        await seed();
    });

    afterEach(async () => {
        clearDmGmAccessState(serverUrl);
        EphemeralStore.setCurrentThreadId('');
        jest.restoreAllMocks();
        jest.clearAllMocks();
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should delete every stored conversation, keeping its drafts', async () => {
        const ids = [dmId, gmId];
        expect(await countIn(DRAFT, 'channel_id', [dmId])).toBe(2);
        expect(await countIn(POST, 'channel_id', ids)).toBe(2);
        expect(await countIn(THREAD, 'id', [rootId])).toBe(1);
        await purgeDirectAndGroupChannels(serverUrl);

        expect(await countIn(CHANNEL, 'id', ids)).toBe(0);
        expect(await countIn(MY_CHANNEL, 'id', ids)).toBe(0);
        expect(await countIn(MY_CHANNEL_SETTINGS, 'id', ids)).toBe(0);
        expect(await countIn(CHANNEL_INFO, 'id', ids)).toBe(0);
        expect(await countIn(CHANNEL_MEMBERSHIP, 'channel_id', ids)).toBe(0);
        expect(await countIn(POST, 'channel_id', ids)).toBe(0);
        expect(await countIn(POSTS_IN_CHANNEL, 'channel_id', ids)).toBe(0);
        expect(await countIn(POSTS_IN_THREAD, 'root_id', [rootId])).toBe(0);
        expect(await countIn(FILE, 'post_id', [rootId])).toBe(0);
        expect(await countIn(REACTION, 'post_id', [rootId])).toBe(0);
        expect(await countIn(THREAD, 'id', [rootId])).toBe(0);
        expect(await countIn(THREADS_IN_TEAM, 'thread_id', [rootId])).toBe(0);
        expect(await countIn(CHANNEL_BOOKMARK, 'channel_id', ids)).toBe(0);

        expect(await countIn(DRAFT, 'channel_id', [dmId])).toBe(2);

        expect(await countIn(CHANNEL, 'id', [openId])).toBe(1);
        expect(await countIn(POST, 'channel_id', [openId])).toBe(1);

        expect(await getTeamChannelHistory(operator.database, teamId)).toEqual([openId]);
        expect(await getTeamChannelHistory(operator.database, otherTeamId)).toEqual([]);
        const {currentChannelId, lastUnreadChannelId} = await getCommonSystemValues(operator.database);
        expect(currentChannelId).toBe('');
        expect(lastUnreadChannelId).toBe('');
    });

    it('should clear notifications, downloaded files and the last viewed conversation, without asking the server', async () => {
        await storeLastViewedChannelIdAndServer(dmId);
        await storeLastViewedThreadIdAndServer(rootId);

        await purgeDirectAndGroupChannels(serverUrl);

        expect(PushNotifications.removeChannelNotifications).toHaveBeenCalledTimes(2);
        expect(PushNotifications.removeChannelNotifications).toHaveBeenCalledWith(serverUrl, dmId);
        expect(PushNotifications.removeChannelNotifications).toHaveBeenCalledWith(serverUrl, gmId);
        expect(deleteDownloadedFiles).toHaveBeenCalledWith(serverUrl, [expect.objectContaining({id: 'dmfileid'})]);
        expect(await getLastViewedChannelIdAndServer()).toBeUndefined();
        expect(await getLastViewedThreadIdAndServer()).toBeUndefined();
        expect(NetworkManager.getClient).not.toHaveBeenCalled();
    });

    it('should kick once from a conversation on screen', async () => {
        jest.mocked(NavigationStore.isScreenInStack).mockImplementation((screen) => screen === Screens.CHANNEL || screen === Screens.THREAD);
        EphemeralStore.setCurrentThreadId(rootId);
        const listener = jest.fn();
        const subscription = DeviceEventEmitter.addListener(Events.DM_GM_ACCESS_REVOKED, listener);

        await purgeDirectAndGroupChannels(serverUrl);
        subscription.remove();

        expect(handleKickFromChannel).toHaveBeenCalledTimes(1);
        expect(handleKickFromChannel).toHaveBeenCalledWith(serverUrl, dmId, Events.DM_GM_ACCESS_REVOKED);
        expect(navigateToRoot).not.toHaveBeenCalled();
        expect(listener).not.toHaveBeenCalled();
    });

    it('should close a conversation thread open over another channel', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: openId}], prepareRecordsOnly: false});
        jest.mocked(NavigationStore.isScreenInStack).mockImplementation((screen) => screen === Screens.THREAD);
        EphemeralStore.setCurrentThreadId(rootId);
        const listener = jest.fn();
        const subscription = DeviceEventEmitter.addListener(Events.DM_GM_ACCESS_REVOKED, listener);

        await purgeDirectAndGroupChannels(serverUrl);
        subscription.remove();

        expect(handleKickFromChannel).not.toHaveBeenCalled();
        expect(navigateToRoot).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledTimes(1);
        expect((await getCommonSystemValues(operator.database)).currentChannelId).toBe(openId);
    });

    it('should leave the screens of a server that is not active alone', async () => {
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue('other.test.com');
        jest.mocked(NavigationStore.isScreenInStack).mockReturnValue(true);

        await purgeDirectAndGroupChannels(serverUrl);

        expect(handleKickFromChannel).not.toHaveBeenCalled();
        expect((await getCommonSystemValues(operator.database)).currentChannelId).toBe('');
    });

    it('should purge once for concurrent applies', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'FeatureFlagPermissionPolicies', value: 'true'},
                {id: 'EnableAttributeBasedAccessControl', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
            prepareRecordsOnly: false,
        });
        await storeDmGmAccess(serverUrl, readDenied, nextDmGmAccessSeq());
        const batchRecords = jest.spyOn(operator, 'batchRecords');

        await Promise.all([applyDmGmAccess(serverUrl), applyDmGmAccess(serverUrl)]);

        expect(batchRecords.mock.calls.filter(([, description]) => description === 'purgeDirectAndGroupChannels')).toHaveLength(1);
        expect(await countIn(CHANNEL, 'id', [dmId, gmId])).toBe(0);
    });
});

describe('restoreDirectAndGroupChannels', () => {
    const currentTeamId = 'teamid1';
    const otherTeamIds = Array.from({length: 11}, (_, i) => `otherteamid${i}`);
    const dm = TestHelper.fakeChannel({id: 'dmchannelid', name: 'user1__user2', type: General.DM_CHANNEL, team_id: ''});
    const open = TestHelper.fakeChannel({id: 'openchannelid', type: General.OPEN_CHANNEL, team_id: currentTeamId});

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        await operator.handleMyTeam({
            myTeams: [currentTeamId, ...otherTeamIds].map((id) => ({id, roles: ''})),
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId}], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [dm], prepareRecordsOnly: false});

        jest.mocked(getIsCRTEnabled).mockResolvedValue(true);
        jest.mocked(fetchMyChannelsForTeam).mockResolvedValue({channels: [dm, open], memberships: [], categories: [], teamId: currentTeamId});
        jest.mocked(fetchCategories).mockResolvedValue({categories: []});
        jest.mocked(syncTeamThreads).mockResolvedValue({error: false, models: []});
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should restore the current team channels, the conversations profiles and every other team categories', async () => {
        await restoreDirectAndGroupChannels(serverUrl, {entryHandled: false});

        expect(fetchMyChannelsForTeam).toHaveBeenCalledWith(serverUrl, currentTeamId, false, 0, false, false, true);
        expect(fetchDirectChannelsInfo).toHaveBeenCalledWith(serverUrl, [expect.objectContaining({id: dm.id})]);
        expect(fetchCategories).toHaveBeenCalledTimes(otherTeamIds.length);
        for (const teamId of otherTeamIds) {
            expect(fetchCategories).toHaveBeenCalledWith(serverUrl, teamId, true);
        }
    });

    it('should refresh the threads of the current team first, then of the others', async () => {
        await restoreDirectAndGroupChannels(serverUrl, {entryHandled: false});
        await new Promise(process.nextTick);

        expect(syncTeamThreads).toHaveBeenNthCalledWith(1, serverUrl, currentTeamId, {refresh: true});
        expect(syncTeamThreads).toHaveBeenCalledTimes(otherTeamIds.length + 1);
        expect(syncTeamThreads).toHaveBeenCalledWith(serverUrl, otherTeamIds[10], {refresh: true});
    });

    it('should only refresh the threads after entry restored the rest', async () => {
        await restoreDirectAndGroupChannels(serverUrl, {entryHandled: true});

        expect(fetchMyChannelsForTeam).not.toHaveBeenCalled();
        expect(fetchDirectChannelsInfo).not.toHaveBeenCalled();
        expect(fetchCategories).not.toHaveBeenCalled();
        expect(syncTeamThreads).toHaveBeenCalledWith(serverUrl, currentTeamId, {refresh: true});
    });

    it('should not refresh threads without collapsed reply threads', async () => {
        jest.mocked(getIsCRTEnabled).mockResolvedValue(false);

        await restoreDirectAndGroupChannels(serverUrl, {entryHandled: false});
        await new Promise(process.nextTick);

        expect(fetchMyChannelsForTeam).toHaveBeenCalledWith(serverUrl, currentTeamId, false, 0, false, false, false);
        expect(syncTeamThreads).not.toHaveBeenCalled();
    });

    it('should carry on with the other teams when one fails', async () => {
        jest.mocked(fetchCategories).mockResolvedValueOnce({error: new Error('network down')});
        jest.mocked(syncTeamThreads).mockResolvedValueOnce({error: false, models: []}).mockResolvedValueOnce({error: new Error('network down')});

        await restoreDirectAndGroupChannels(serverUrl, {entryHandled: false});
        await new Promise(process.nextTick);

        expect(fetchCategories).toHaveBeenCalledTimes(otherTeamIds.length);
        expect(syncTeamThreads).toHaveBeenCalledTimes(otherTeamIds.length + 1);
    });

    it('should run a pending restore through the apply queue while Read is allowed', async () => {
        await applyDmGmAccess(serverUrl, {restore: 'full'});

        expect(fetchMyChannelsForTeam).toHaveBeenCalled();
    });
});
