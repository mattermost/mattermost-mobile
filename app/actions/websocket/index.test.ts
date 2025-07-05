// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {markChannelAsViewed} from '@actions/local/channel';
import {dataRetentionCleanup} from '@actions/local/systems';
import {markChannelAsRead} from '@actions/remote/channel';
import {deferredAppEntryActions, entry, handleEntryAfterLoadNavigation} from '@actions/remote/entry/common';
import {fetchPostsForChannel, fetchPostThread} from '@actions/remote/post';
import {openAllUnreadChannels} from '@actions/remote/preference';
import {loadConfigAndCalls} from '@calls/actions/calls';
import {isSupportedServerCalls} from '@calls/utils';
import DatabaseManager from '@database/manager';
import AppsManager from '@managers/apps_manager';
import {updatePlaybooksVersion} from '@playbooks/actions/remote/version';
import {getActiveServerUrl} from '@queries/app/servers';
import {getLastPostInThread} from '@queries/servers/post';
import {getConfig, getCurrentChannelId, getCurrentTeamId, setLastFullSync} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import TestHelper from '@test/test_helper';

import {handleFirstConnect, handleReconnect} from './index';

jest.mock('@actions/local/channel');
jest.mock('@actions/local/systems');
jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/entry/common');
jest.mock('@actions/remote/post');
jest.mock('@actions/remote/scheduled_post');
jest.mock('@actions/remote/preference');
jest.mock('@actions/remote/user');
jest.mock('@calls/actions/calls');
jest.mock('@calls/utils');
jest.mock('@database/manager');
jest.mock('@managers/apps_manager');
jest.mock('@queries/app/servers');
jest.mock('@queries/servers/post');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/thread');
jest.mock('@queries/servers/user');
jest.mock('@store/ephemeral_store');
jest.mock('@store/navigation_store');
jest.mock('@store/team_load_store');
jest.mock('@utils/helpers', () => ({
    isTablet: jest.fn().mockReturnValue(false),
}));

jest.mock('@playbooks/actions/remote/version');

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
            },
        });
    });

    describe('handleFirstConnect', () => {
        it('should handle first connection successfully', async () => {
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

            const error = await handleFirstConnect(serverUrl, groupLabel);

            expect(error).toBeUndefined();
            expect(entry).toHaveBeenCalled();
            expect(handleEntryAfterLoadNavigation).toHaveBeenCalled();
            expect(setLastFullSync).toHaveBeenCalled();
            expect(loadConfigAndCalls).toHaveBeenCalled();
            expect(deferredAppEntryActions).toHaveBeenCalled();
            expect(updatePlaybooksVersion).toHaveBeenCalledWith(serverUrl);
        });

        it('should handle error when server database not found', async () => {
            DatabaseManager.serverDatabases = {};

            const error = await handleFirstConnect(serverUrl);

            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe('cannot find server database');
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
            expect(AppsManager.refreshAppBindings).toHaveBeenCalled();
            expect(updatePlaybooksVersion).toHaveBeenCalledWith(serverUrl);
        });

        it('should fetch posts for channel screen', async () => {
            jest.mocked(NavigationStore.getScreensInStack).mockReturnValue(['Channel']);
            await handleReconnect(serverUrl);

            expect(fetchPostsForChannel).toHaveBeenCalledWith(serverUrl, currentChannelId, false, false, 'WebSocket Reconnect');
            expect(markChannelAsRead).toHaveBeenCalledWith(serverUrl, currentChannelId, false, 'WebSocket Reconnect');
            expect(markChannelAsViewed).toHaveBeenCalledWith(serverUrl, currentChannelId, true);
        });

        it('should fetch thread posts when CRT enabled', async () => {
            const threadId = 'thread-id';
            const lastPost = TestHelper.fakePostModel({id: 'post-id', createAt: 123});

            jest.mocked(NavigationStore.getScreensInStack).mockReturnValue(['Thread']);

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
            jest.mocked(NavigationStore.getScreensInStack).mockReturnValue(['Channel']);

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
    });
});
