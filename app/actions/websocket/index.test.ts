// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {markChannelAsViewed} from '@actions/local/channel';
import {dataRetentionCleanup, expiredBoRPostCleanup} from '@actions/local/systems';
import {markChannelAsRead} from '@actions/remote/channel';
import {entry} from '@actions/remote/entry/common';
import {deferredAppEntryActions} from '@actions/remote/entry/deferred';
import {handleAutotranslationChanges, handleEntryAfterLoadNavigation, handleInitialLoadNavigation} from '@actions/remote/entry/effects';
import {buildTeamBadgeCounts, entryInitialLoad, runExperienceAPIEntryActions} from '@actions/remote/entry/initial_load';
import {fetchPostsForChannel, fetchPostThread} from '@actions/remote/post';
import {openAllUnreadChannels} from '@actions/remote/preference';
import {loadConfigAndCalls} from '@calls/actions/calls';
import {isSupportedServerCalls} from '@calls/utils';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import AppsManager from '@managers/apps_manager';
import NetworkManager from '@managers/network_manager';
import {handlePlaybookReconnect} from '@playbooks/actions/websocket/reconnect';
import {getActiveServerUrl} from '@queries/app/servers';
import {prepareDeleteChannel, queryChannelsById, queryChannelsInfoById} from '@queries/servers/channel';
import {prepareEntryModels} from '@queries/servers/entry';
import {getLastPostInThread} from '@queries/servers/post';
import {
    getConfig,
    getCurrentChannelId,
    getCurrentTeamId,
    getConfigBooleanValue,
    getLastFullSync,
    getLastInitialLoad,
    incrementTeamBlob,
    setLastFullSync,
    setLastInitialLoad,
} from '@queries/servers/system';
import {queryMyTeams, queryTeamLastChannelId} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import ChannelsSyncStore from '@store/channels_sync_store';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';
import SyncBlobQueue from '@store/sync_blob_queue';
import ThreadsSyncStore from '@store/threads_sync_store';
import TestHelper from '@test/test_helper';
import {logError} from '@utils/log';

import {handleFirstConnect, handleReconnect} from './index';

import type Model from '@nozbe/watermelondb/Model';

jest.mock('@actions/local/channel');
jest.mock('@actions/local/systems');
jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/entry/common');
jest.mock('@actions/remote/entry/deferred');
jest.mock('@actions/remote/entry/initial_load');
jest.mock('@actions/remote/post');
jest.mock('@actions/remote/scheduled_post');
jest.mock('@actions/remote/preference');
jest.mock('@actions/remote/user');
jest.mock('@actions/remote/entry/effects');
jest.mock('@actions/remote/entry/initial_load');
jest.mock('@calls/actions/calls');
jest.mock('@calls/utils');
jest.mock('@database/manager');
jest.mock('@managers/apps_manager');
jest.mock('@managers/network_manager');
jest.mock('@queries/app/servers');
jest.mock('@queries/servers/channel');
jest.mock('@queries/servers/entry');
jest.mock('@queries/servers/post');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/team');
jest.mock('@queries/servers/thread');
jest.mock('@queries/servers/user');
jest.mock('@store/channels_sync_store', () => ({
    hasChannelsBeenFetched: jest.fn().mockReturnValue(false),
    markChannelsFetched: jest.fn(),
}));
jest.mock('@store/ephemeral_store');
jest.mock('@store/navigation_store');
jest.mock('@store/team_load_store');
jest.mock('@store/sync_blob_queue');
jest.mock('@store/threads_sync_store', () => ({
    clearServer: jest.fn(),
    markThreadsFetched: jest.fn(),
}));
jest.mock('@utils/helpers', () => ({
    isTablet: jest.fn().mockReturnValue(false),
}));

jest.mock('@playbooks/actions/websocket/reconnect');

describe('WebSocket Index Actions', () => {
    const serverUrl = 'baseHandler.test.com';
    const currentUserId = 'current-user-id';
    const currentTeamId = 'current-team-id';
    const currentChannelId = 'current-channel-id';
    const groupLabel = 'DeepLink';

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.spyOn(DeviceEventEmitter, 'emit');
        await DatabaseManager.init([serverUrl]);
        DatabaseManager.serverDatabases[serverUrl] = {
            operator: {
                database: {},
                batchRecords: jest.fn(),
            },
        } as any;
        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({
            database: {},
            operator: {
                batchRecords: jest.fn(),
                handleSystem: jest.fn().mockResolvedValue([]),
                handleChannel: jest.fn().mockResolvedValue([]),
                handleChannelMembership: jest.fn().mockResolvedValue([]),
                handleRole: jest.fn().mockResolvedValue([]),
                handleUsers: jest.fn().mockResolvedValue([]),
                handleGroups: jest.fn().mockResolvedValue([]),
                handleGroupMembershipsDelta: jest.fn().mockResolvedValue([]),
                handlePosts: jest.fn().mockResolvedValue([]),
            },
        });
    });

    describe('handleFirstConnect', () => {
        const activeServerUrl = serverUrl;
        const nonActiveServerUrl = 'non-active.server.com';

        beforeEach(() => {
            DatabaseManager.getActiveServerUrl = jest.fn().mockResolvedValue(activeServerUrl);
            DatabaseManager.serverDatabases[nonActiveServerUrl] = {
                operator: {
                    database: {},
                    batchRecords: jest.fn(),
                },
            } as unknown as typeof DatabaseManager.serverDatabases[string];
            jest.mocked(getCurrentTeamId).mockResolvedValue(currentTeamId);
            jest.mocked(getConfigBooleanValue).mockResolvedValue(false);
        });

        // Active server — falls straight through to doReconnect (legacy path)
        it('should handle first connection successfully for active server', async () => {
            const mockEntryData = {
                models: [],
                initialTeamId: currentTeamId,
                initialChannelId: currentChannelId,
                prefData: {preferences: []},
                teamData: {memberships: [], teams: []},
                chData: {memberships: [], channels: []},
                gmConverted: false,
            };

            jest.mocked(entry).mockResolvedValue(mockEntryData);
            jest.mocked(getCurrentUser).mockResolvedValue(TestHelper.fakeUserModel({
                id: currentUserId,
                locale: 'en',
            }));
            jest.mocked(getConfig).mockResolvedValue({Version: '9.0.0'} as ClientConfig);
            jest.mocked(isSupportedServerCalls).mockReturnValue(true);

            const error = await handleFirstConnect(activeServerUrl, groupLabel);

            expect(error).toBeUndefined();
            expect(entryInitialLoad).not.toHaveBeenCalled();
            expect(entry).toHaveBeenCalled();
            expect(handleEntryAfterLoadNavigation).toHaveBeenCalled();
            expect(setLastFullSync).toHaveBeenCalled();
            expect(loadConfigAndCalls).toHaveBeenCalled();
            expect(deferredAppEntryActions).toHaveBeenCalled();
            expect(handlePlaybookReconnect).toHaveBeenCalledWith(activeServerUrl);
        });

        it('should handle error when server database not found', async () => {
            DatabaseManager.serverDatabases = {};

            const error = await handleFirstConnect(activeServerUrl);

            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe('cannot find server database');
        });

        // Non-active server — new 2G path
        it('should run entryInitialLoad and set ExperienceAPI flag for non-active server when flag is enabled', async () => {
            jest.mocked(getConfigBooleanValue).mockResolvedValue(true);
            (entryInitialLoad as jest.Mock).mockResolvedValue({models: [], initialTeamId: currentTeamId, initialChannelId: '', prefData: {}, teamData: {}, gmConverted: false});

            const result = await handleFirstConnect(nonActiveServerUrl, groupLabel);

            expect(entryInitialLoad).toHaveBeenCalledWith(nonActiveServerUrl, currentTeamId, undefined, undefined, undefined, groupLabel, false);
            expect(EphemeralStore.setExperienceAPIEnabled).toHaveBeenCalledWith(nonActiveServerUrl, true);
            expect(result).toBeUndefined();
            expect(entry).not.toHaveBeenCalled();
        });

        it('should fall through to doReconnect and not set flag when entryInitialLoad fails for non-active server', async () => {
            jest.mocked(getConfigBooleanValue).mockResolvedValue(true);
            (entryInitialLoad as jest.Mock).mockResolvedValue({error: new Error('network error')});
            (entry as jest.Mock).mockResolvedValue({error: new Error('entry error')});

            await handleFirstConnect(nonActiveServerUrl, groupLabel);

            expect(entryInitialLoad).toHaveBeenCalled();
            expect(EphemeralStore.setExperienceAPIEnabled).not.toHaveBeenCalled();
            expect(entry).toHaveBeenCalled();
        });

        it('should skip entryInitialLoad and fall through to doReconnect when ExperienceAPI flag is false for non-active server', async () => {
            jest.mocked(getConfigBooleanValue).mockResolvedValue(false);
            (entry as jest.Mock).mockResolvedValue({error: new Error('entry error')});

            await handleFirstConnect(nonActiveServerUrl, groupLabel);

            expect(entryInitialLoad).not.toHaveBeenCalled();
            expect(EphemeralStore.setExperienceAPIEnabled).not.toHaveBeenCalled();
            expect(entry).toHaveBeenCalled();
        });

        it('should fall through to doReconnect when getServerDatabaseAndOperator throws for non-active server', async () => {
            jest.mocked(getConfigBooleanValue).mockResolvedValue(true);
            DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockImplementation(() => {
                throw new Error('db not found');
            });
            (entry as jest.Mock).mockResolvedValue({error: new Error('entry error')});

            await handleFirstConnect(nonActiveServerUrl, groupLabel);

            expect(entryInitialLoad).not.toHaveBeenCalled();
            expect(EphemeralStore.setExperienceAPIEnabled).not.toHaveBeenCalled();
            expect(entry).toHaveBeenCalled();
        });
    });

    describe('handleReconnect', () => {
        beforeEach(() => {
            jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([]);
            jest.mocked(getActiveServerUrl).mockResolvedValue(serverUrl);
            jest.mocked(getCurrentChannelId).mockResolvedValue(currentChannelId);
            jest.mocked(getCurrentTeamId).mockResolvedValue(currentTeamId);
            jest.mocked(getIsCRTEnabled).mockResolvedValue(false);
            jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue('');
            jest.mocked(EphemeralStore.wasNotificationTapped).mockReturnValue(false);
        });

        it('should handle reconnection successfully', async () => {
            const mockEntryData = {
                models: [],
                initialTeamId: currentTeamId,
                initialChannelId: currentChannelId,
                prefData: {preferences: []},
                teamData: {memberships: [], teams: []},
                chData: {memberships: [], channels: []},
                gmConverted: false,
            };

            jest.mocked(entry).mockResolvedValue(mockEntryData);
            jest.mocked(getCurrentUser).mockResolvedValue(TestHelper.fakeUserModel({
                id: currentUserId,
                locale: 'en',
            }));
            jest.mocked(getConfig).mockResolvedValue({Version: '9.0.0'} as ClientConfig);
            jest.mocked(isSupportedServerCalls).mockReturnValue(true);
            jest.mocked(getActiveServerUrl).mockResolvedValue(serverUrl);

            const error = await handleReconnect(serverUrl);

            expect(error).toBeUndefined();
            expect(entry).toHaveBeenCalled();
            expect(handleEntryAfterLoadNavigation).toHaveBeenCalled();
            expect(setLastFullSync).toHaveBeenCalled();
            expect(loadConfigAndCalls).toHaveBeenCalled();
            expect(deferredAppEntryActions).toHaveBeenCalled();
            expect(openAllUnreadChannels).toHaveBeenCalled();
            expect(dataRetentionCleanup).toHaveBeenCalled();
            expect(expiredBoRPostCleanup).toHaveBeenCalled();
            expect(AppsManager.refreshAppBindings).toHaveBeenCalled();
            expect(handlePlaybookReconnect).toHaveBeenCalledWith(serverUrl);
        });

        it('should fetch posts for channel screen', async () => {
            jest.mocked(NavigationStore.getScreensInStack).mockReturnValue(['channel']);
            await handleReconnect(serverUrl);

            expect(fetchPostsForChannel).toHaveBeenCalledWith(serverUrl, currentChannelId, false, false, 'WebSocket Reconnect');
            expect(markChannelAsRead).toHaveBeenCalledWith(serverUrl, currentChannelId, false, 'WebSocket Reconnect');
            expect(markChannelAsViewed).toHaveBeenCalledWith(serverUrl, currentChannelId, true);
        });

        it('should fetch thread posts when CRT enabled', async () => {
            const threadId = 'thread-id';
            const lastPost = TestHelper.fakePostModel({id: 'post-id', createAt: 123});

            jest.mocked(NavigationStore.getScreensInStack).mockReturnValue(['thread']);

            jest.mocked(getIsCRTEnabled).mockResolvedValue(true);
            jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(threadId);
            jest.mocked(getLastPostInThread).mockResolvedValue(lastPost);

            await handleReconnect(serverUrl);

            expect(fetchPostThread).toHaveBeenCalledWith(
                serverUrl,
                threadId,
                {
                    fromCreateAt: lastPost.createAt,
                    fromPost: lastPost.id,
                    direction: 'down',
                },
                false,
                'WebSocket Reconnect',
            );
        });

        it('should handle notification tapped state', async () => {
            jest.mocked(NavigationStore.getScreensInStack).mockReturnValue(['channel']);

            jest.mocked(EphemeralStore.wasNotificationTapped).mockReturnValue(true);

            await handleReconnect(serverUrl);

            expect(markChannelAsViewed).not.toHaveBeenCalled();
            expect(EphemeralStore.setNotificationTapped).toHaveBeenCalledWith(false);
        });

        it('should handle error in entry data', async () => {
            jest.mocked(entry).mockResolvedValue({error: new Error('entry error')});

            const result = await handleReconnect(serverUrl);

            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe('entry error');
        });

        describe('doSyncReconnect (ExperienceAPI path)', () => {
            const mockSyncResponse: SyncResponse = {
                timestamp: Date.now(),
                teams_unreads: [
                    {
                        team_id: currentTeamId,
                        mention_count: 3,
                        has_unreads: true,
                        thread_mention_count: 1,
                        thread_has_unreads: false,
                    },
                ],
                teams: [{team_id: currentTeamId, channels: [{id: 'ch1'}] as ExperienceChannel[], channel_members: {members: []}}],
                direct_channel_members: {members: []},
            };

            const mockClient = {
                reconnectSync: jest.fn().mockResolvedValue(mockSyncResponse),
            };

            beforeEach(() => {
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
                NetworkManager.getClient = () => mockClient as unknown as ReturnType<typeof NetworkManager.getClient>;
                jest.mocked(getLastInitialLoad).mockResolvedValue(1000);
                jest.mocked(getLastFullSync).mockResolvedValue(0);
                jest.mocked(queryMyTeams).mockReturnValue({fetchIds: jest.fn().mockResolvedValue([currentTeamId])} as unknown as ReturnType<typeof queryMyTeams>);
                jest.mocked(queryTeamLastChannelId).mockReturnValue({fetch: jest.fn().mockResolvedValue([{channelIds: [currentChannelId]}])} as unknown as ReturnType<typeof queryTeamLastChannelId>);
                jest.mocked(queryChannelsById).mockReturnValue({fetch: jest.fn().mockResolvedValue([])} as unknown as ReturnType<typeof queryChannelsById>);
                jest.mocked(queryChannelsInfoById).mockReturnValue({fetch: jest.fn().mockResolvedValue([])} as unknown as ReturnType<typeof queryChannelsInfoById>);
                jest.mocked(prepareEntryModels).mockResolvedValue([]);
                jest.mocked(buildTeamBadgeCounts).mockReturnValue({teams: {}, direct: {mentionCount: 0, hasUnreads: false, threadMentionCount: 0, threadHasUnreads: false}});
                jest.mocked(getIsCRTEnabled).mockResolvedValue(false);
                jest.mocked(getCurrentUser).mockResolvedValue(TestHelper.fakeUserModel({id: currentUserId, locale: 'en'}));
                jest.mocked(handleAutotranslationChanges).mockResolvedValue(undefined);
                jest.mocked(handleInitialLoadNavigation).mockResolvedValue(undefined);
                jest.mocked(runExperienceAPIEntryActions).mockResolvedValue(undefined);
                jest.mocked(SyncBlobQueue.endSync).mockReturnValue([]);
            });

            it('should route to doSyncReconnect when ExperienceAPI is enabled', async () => {
                await handleReconnect(serverUrl);

                expect(mockClient.reconnectSync).toHaveBeenCalledWith(
                    expect.objectContaining({
                        since: 1000,
                        scope: expect.objectContaining({team_ids: expect.any(Array)}),
                    }),
                    'WebSocket Reconnect',
                );
                expect(entry).not.toHaveBeenCalled();
            });

            it('should build scope with loaded team ids', async () => {
                jest.mocked(ChannelsSyncStore.hasChannelsBeenFetched).mockImplementation(
                    (_url, id) => id === currentTeamId,
                );

                await handleReconnect(serverUrl);

                expect(mockClient.reconnectSync).toHaveBeenCalledWith(
                    expect.objectContaining({
                        scope: expect.objectContaining({team_ids: [currentTeamId]}),
                    }),
                    expect.any(String),
                );
            });

            it('should reset ThreadsSyncStore and mark channels fetched after sync', async () => {
                await handleReconnect(serverUrl);

                expect(ThreadsSyncStore.clearServer).toHaveBeenCalledWith(serverUrl);
                expect(ChannelsSyncStore.markChannelsFetched).toHaveBeenCalledWith(serverUrl, currentTeamId);
            });

            it('should build badge blob from teams_unreads not just scoped teams', async () => {
                await handleReconnect(serverUrl);

                expect(buildTeamBadgeCounts).toHaveBeenCalledWith(
                    expect.arrayContaining([
                        expect.objectContaining({team_id: currentTeamId}),
                    ]),
                    undefined,
                    false,
                );
            });

            it('should call runExperienceAPIEntryActions after batching', async () => {
                await handleReconnect(serverUrl);

                expect(runExperienceAPIEntryActions).toHaveBeenCalledWith(
                    serverUrl,
                    expect.any(String),
                    expect.any(Boolean),
                    'WebSocket Reconnect',
                );
            });

            it('should advance the since cursor after sync', async () => {
                await handleReconnect(serverUrl);

                expect(setLastInitialLoad).toHaveBeenCalledWith(
                    expect.anything(),
                    mockSyncResponse.timestamp,
                    true,
                );
            });

            it('should fall back to doReconnect on 404 and disable ExperienceAPI', async () => {
                const error404 = Object.assign(new Error('not found'), {status_code: 404});
                mockClient.reconnectSync.mockRejectedValueOnce(error404);

                // When setExperienceAPIEnabled is called with false, doReconnect must see false too
                jest.mocked(EphemeralStore.setExperienceAPIEnabled).mockImplementationOnce(() => {
                    jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);
                });

                jest.mocked(entry).mockResolvedValue({
                    models: [],
                    initialTeamId: currentTeamId,
                    initialChannelId: currentChannelId,
                    prefData: {preferences: []},
                    teamData: {memberships: [], teams: []},
                    chData: {memberships: [], channels: []},
                    gmConverted: false,
                });
                jest.mocked(getCurrentUser).mockResolvedValue(TestHelper.fakeUserModel({id: currentUserId, locale: 'en'}));
                jest.mocked(getConfig).mockResolvedValue({Version: '9.0.0'} as ClientConfig);

                await handleReconnect(serverUrl);

                expect(EphemeralStore.setExperienceAPIEnabled).toHaveBeenCalledWith(serverUrl, false);
                expect(entry).toHaveBeenCalled();
            });

            it('should log and not fall back to doReconnect on a non-404 error from reconnectSync', async () => {
                const error500 = Object.assign(new Error('server error'), {status_code: 500});
                mockClient.reconnectSync.mockRejectedValueOnce(error500);

                await handleReconnect(serverUrl);

                expect(logError).toHaveBeenCalledWith('doSyncReconnect', expect.any(String));
                expect(EphemeralStore.setExperienceAPIEnabled).not.toHaveBeenCalled();
                expect(entry).not.toHaveBeenCalled();
            });

            it('should log and not fall back to doReconnect when batchSyncResponse throws', async () => {
                jest.mocked(prepareEntryModels).mockRejectedValueOnce(new Error('batch failure'));

                await handleReconnect(serverUrl);

                expect(logError).toHaveBeenCalledWith('doSyncReconnect', expect.any(String));
                expect(EphemeralStore.setExperienceAPIEnabled).not.toHaveBeenCalled();
                expect(entry).not.toHaveBeenCalled();
            });

            it('should set active_channel_id in scope when CHANNEL screen is mounted', async () => {
                jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);

                await handleReconnect(serverUrl);

                expect(mockClient.reconnectSync).toHaveBeenCalledWith(
                    expect.objectContaining({
                        scope: expect.objectContaining({active_channel_id: currentChannelId}),
                    }),
                    expect.any(String),
                );
            });

            it('should set active_thread_id in scope when THREAD screen is mounted', async () => {
                const threadId = 'test-thread-id';
                jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.THREAD]);
                jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(threadId);

                await handleReconnect(serverUrl);

                expect(mockClient.reconnectSync).toHaveBeenCalledWith(
                    expect.objectContaining({
                        scope: expect.objectContaining({active_thread_id: threadId}),
                    }),
                    expect.any(String),
                );
            });

            it('should purge removed channels and their related records', async () => {
                const removedChannelId = 'removed-channel-id';
                mockClient.reconnectSync.mockResolvedValueOnce({
                    ...mockSyncResponse,
                    teams: [{
                        team_id: currentTeamId,
                        channels: [],
                        channel_members: {members: [], removed_channel_ids: [removedChannelId]},
                    }],
                });

                const channelToDelete = TestHelper.fakeChannelModel({id: removedChannelId});
                jest.mocked(queryChannelsById).mockReturnValue({fetch: jest.fn().mockResolvedValue([channelToDelete])} as unknown as ReturnType<typeof queryChannelsById>);
                const deletedModels = [{id: 'deleted-model'}] as unknown as Model[];
                jest.mocked(prepareDeleteChannel).mockResolvedValue(deletedModels);

                await handleReconnect(serverUrl);

                expect(queryChannelsById).toHaveBeenCalledWith(expect.anything(), [removedChannelId]);
                expect(prepareDeleteChannel).toHaveBeenCalledWith(serverUrl, channelToDelete);

                const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                expect(operator.batchRecords).toHaveBeenCalledWith(
                    expect.arrayContaining(deletedModels),
                    'doSyncReconnect',
                );
            });

            it('should redirect navigation away from a removed channel that was active', async () => {
                const removedChannelId = currentChannelId;
                mockClient.reconnectSync.mockResolvedValueOnce({
                    ...mockSyncResponse,
                    teams: [{
                        team_id: currentTeamId,
                        channels: [],
                        channel_members: {members: [], removed_channel_ids: [removedChannelId]},
                    }],
                });
                jest.mocked(queryChannelsById).mockReturnValue({fetch: jest.fn().mockResolvedValue([])} as unknown as ReturnType<typeof queryChannelsById>);

                await handleReconnect(serverUrl);

                expect(handleInitialLoadNavigation).toHaveBeenCalledWith(
                    serverUrl,
                    expect.objectContaining({removedChannelIds: [removedChannelId]}),
                );
            });

            it('should purge a channel removed while backgrounded once the reconnect sync runs', async () => {
                jest.mocked(getLastInitialLoad).mockResolvedValue(500);
                const removedChannelId = 'backgrounded-removed-channel';
                mockClient.reconnectSync.mockResolvedValueOnce({
                    ...mockSyncResponse,
                    teams: [{
                        team_id: currentTeamId,
                        channels: [],
                        channel_members: {members: [], removed_channel_ids: [removedChannelId]},
                    }],
                });

                const channelToDelete = TestHelper.fakeChannelModel({id: removedChannelId});
                jest.mocked(queryChannelsById).mockReturnValue({fetch: jest.fn().mockResolvedValue([channelToDelete])} as unknown as ReturnType<typeof queryChannelsById>);
                const deletedModels = [{id: 'deleted-model'}] as unknown as Model[];
                jest.mocked(prepareDeleteChannel).mockResolvedValue(deletedModels);

                await handleReconnect(serverUrl);

                expect(mockClient.reconnectSync).toHaveBeenCalledWith(
                    expect.objectContaining({since: 500}),
                    expect.any(String),
                );
                expect(prepareDeleteChannel).toHaveBeenCalledWith(serverUrl, channelToDelete);
                const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                expect(operator.batchRecords).toHaveBeenCalledWith(
                    expect.arrayContaining(deletedModels),
                    'doSyncReconnect',
                );
            });

            describe('queued blob op replay', () => {
                it('begins the sync-blob queue before the network call and drains it after the batch write', async () => {
                    await handleReconnect(serverUrl);

                    expect(SyncBlobQueue.beginSync).toHaveBeenCalledWith(serverUrl);
                    expect(SyncBlobQueue.endSync).toHaveBeenCalledWith(serverUrl);

                    const beginOrder = jest.mocked(SyncBlobQueue.beginSync).mock.invocationCallOrder[0];
                    const reconnectOrder = mockClient.reconnectSync.mock.invocationCallOrder[0];
                    const endOrder = jest.mocked(SyncBlobQueue.endSync).mock.invocationCallOrder[0];
                    expect(beginOrder).toBeLessThan(reconnectOrder);
                    expect(reconnectOrder).toBeLessThan(endOrder);
                });

                it('replays a queued op newer than the sync snapshot', async () => {
                    mockClient.reconnectSync.mockResolvedValueOnce({...mockSyncResponse, timestamp: 1000});
                    jest.mocked(SyncBlobQueue.endSync).mockReturnValueOnce([
                        {op: 'increment', teamId: currentTeamId, mentionDelta: 1, threadMentionDelta: 0, eventTimestamp: 1001},
                    ]);

                    await handleReconnect(serverUrl);

                    expect(incrementTeamBlob).toHaveBeenCalledWith(expect.anything(), currentTeamId, 1, 0);
                });

                it('drops a queued op at or before the sync snapshot timestamp', async () => {
                    mockClient.reconnectSync.mockResolvedValueOnce({...mockSyncResponse, timestamp: 1000});
                    jest.mocked(SyncBlobQueue.endSync).mockReturnValueOnce([
                        {op: 'increment', teamId: currentTeamId, mentionDelta: 1, threadMentionDelta: 0, eventTimestamp: 1000},
                    ]);

                    await handleReconnect(serverUrl);

                    expect(incrementTeamBlob).not.toHaveBeenCalled();
                });

                it('replays every queued op unfiltered when the sync request fails', async () => {
                    mockClient.reconnectSync.mockRejectedValueOnce(new Error('network down'));
                    jest.mocked(SyncBlobQueue.endSync).mockReturnValueOnce([
                        {op: 'increment', teamId: currentTeamId, mentionDelta: 1, threadMentionDelta: 0, eventTimestamp: 1},
                    ]);

                    await handleReconnect(serverUrl);

                    expect(incrementTeamBlob).toHaveBeenCalledWith(expect.anything(), currentTeamId, 1, 0);
                });
            });
        });
    });
});
