// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {updateChannelsDisplayName} from '@actions/local/channel';
import {setCurrentUserStatus} from '@actions/local/user';
import {fetchMe, fetchUsersByIds} from '@actions/remote/user';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {queryChannelsByTypes, queryUserChannelsByTypes} from '@queries/servers/channel';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {getConfig, getLicense} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import TestHelper from '@test/test_helper';

import {handleUserUpdatedEvent, handleUserTypingEvent, handleStatusChangedEvent, userTyping} from './users';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@actions/local/channel');
jest.mock('@actions/local/user');
jest.mock('@actions/remote/user');
jest.mock('@database/manager');
jest.mock('@helpers/api/preference');
jest.mock('@managers/websocket_manager');
jest.mock('@queries/servers/channel');
jest.mock('@queries/servers/preference');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/user');

describe('WebSocket Users Actions', () => {
    const serverUrl = 'baseHandler.test.com';
    const currentUserId = 'current-user-id';
    const otherUserId = 'other-user-id';

    let operator: ServerDataOperator;
    let batchRecords: jest.SpyInstance;
    let handleUsers: jest.SpyInstance;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.spyOn(DeviceEventEmitter, 'emit');

        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;

        jest.mocked(queryChannelsByTypes).mockReturnValue(TestHelper.fakeQuery([]));

        DatabaseManager.getActiveServerUrl = jest.fn().mockResolvedValue(serverUrl);
        batchRecords = jest.spyOn(operator, 'batchRecords').mockResolvedValue();
        handleUsers = jest.spyOn(operator, 'handleUsers').mockResolvedValue([TestHelper.fakeUserModel({id: 'user1'})]);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.restoreAllMocks();
    });

    describe('handleUserUpdatedEvent', () => {
        it('should handle missing operator', async () => {
            DatabaseManager.serverDatabases = {};
            const msg = {
                data: {
                    user: {id: currentUserId},
                },
            } as WebSocketMessage;
            await handleUserUpdatedEvent(serverUrl, msg);
            expect(handleUsers).not.toHaveBeenCalled();
        });

        it('should handle missing current user', async () => {
            jest.mocked(getCurrentUser).mockResolvedValue(undefined);
            const msg = {
                data: {
                    user: {id: currentUserId},
                },
            } as WebSocketMessage;
            await handleUserUpdatedEvent(serverUrl, msg);
            expect(handleUsers).not.toHaveBeenCalled();
        });

        it('should handle current user update', async () => {
            const mockUser = TestHelper.fakeUser({
                id: currentUserId,
                update_at: 1234,
                notify_props: TestHelper.fakeUserNotifyProps({email: 'true'}),
            });

            const mockCurrentUser = TestHelper.fakeUserModel({
                id: currentUserId,
                updateAt: 1000,
                locale: 'en',
            });

            jest.mocked(getCurrentUser).mockResolvedValue(mockCurrentUser);
            jest.mocked(fetchMe).mockResolvedValue({user: mockUser});

            const msg = {
                data: {
                    user: mockUser,
                },
            } as WebSocketMessage;

            await handleUserUpdatedEvent(serverUrl, msg);

            expect(handleUsers).toHaveBeenCalled();
            expect(batchRecords).toHaveBeenCalled();
        });

        it('should handle other user update', async () => {
            const mockUser = TestHelper.fakeUser({
                id: otherUserId,
                update_at: 1234,
            });

            const mockCurrentUser = TestHelper.fakeUserModel({
                id: currentUserId,
                updateAt: 1000,
            });

            jest.mocked(getCurrentUser).mockResolvedValue(mockCurrentUser);
            jest.mocked(queryUserChannelsByTypes).mockReturnValue(
                TestHelper.fakeQuery([TestHelper.fakeChannelModel({id: 'channel-1'})]));
            jest.mocked(updateChannelsDisplayName).mockResolvedValue({models: []});
            handleUsers.mockResolvedValue([TestHelper.fakeUserModel({id: 'model-1'})]);

            const msg = {
                data: {
                    user: mockUser,
                },
            } as WebSocketMessage;

            await handleUserUpdatedEvent(serverUrl, msg);

            expect(handleUsers).toHaveBeenCalledWith({
                users: [mockUser],
                prepareRecordsOnly: true,
            });
        });
    });

    describe('handleUserTypingEvent', () => {
        it('should handle different active server', async () => {
            DatabaseManager.getActiveServerUrl = jest.fn().mockResolvedValue('different-server');
            const msg = {
                data: {
                    user_id: otherUserId,
                },
                broadcast: {
                    channel_id: 'channel-id',
                },
            } as WebSocketMessage;
            await handleUserTypingEvent(serverUrl, msg);
            expect(jest.mocked(DeviceEventEmitter.emit)).not.toHaveBeenCalled();
        });

        it('should handle missing database', async () => {
            DatabaseManager.serverDatabases = {};
            const msg = {
                data: {
                    user_id: otherUserId,
                },
                broadcast: {
                    channel_id: 'channel-id',
                },
            } as WebSocketMessage;
            await handleUserTypingEvent(serverUrl, msg);
            expect(jest.mocked(DeviceEventEmitter.emit)).not.toHaveBeenCalled();
        });

        it('should handle missing user', async () => {
            jest.mocked(getConfig).mockResolvedValue({
                LockTeammateNameDisplay: 'false',
                TeammateNameDisplay: 'username',
                TimeBetweenUserTypingUpdatesMilliseconds: '500',
            } as any);

            jest.mocked(fetchUsersByIds).mockResolvedValue({
                users: [],
                existingUsers: [],
            });
            const msg = {
                data: {
                    user_id: otherUserId,
                },
                broadcast: {
                    channel_id: 'channel-id',
                },
            } as WebSocketMessage;
            jest.useFakeTimers();
            const promise = handleUserTypingEvent(serverUrl, msg);
            jest.runAllTimers();
            jest.useRealTimers();
            await promise;
            expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(Events.USER_TYPING, expect.any(Object));
        });

        it('should emit typing events', async () => {
            jest.spyOn(DeviceEventEmitter, 'emit');
            const channelId = 'channel-id';
            const mockConfig = {
                TimeBetweenUserTypingUpdatesMilliseconds: '500',
            };

            jest.mocked(getConfig).mockResolvedValue(mockConfig as any);
            jest.mocked(fetchUsersByIds).mockResolvedValue({
                users: [TestHelper.fakeUser({id: otherUserId, username: 'other-user'})],
                existingUsers: [],
            });

            jest.mocked(queryDisplayNamePreferences).mockReturnValue(TestHelper.fakeQuery([TestHelper.fakePreferenceModel({
                value: 'full_name',
            })]));

            jest.mocked(getLicense).mockResolvedValue({} as ClientLicense);

            const msg = {
                data: {
                    user_id: otherUserId,
                    parent_id: 'root-id',
                },
                broadcast: {
                    channel_id: channelId,
                },
            } as WebSocketMessage;

            jest.useFakeTimers();
            const promise = handleUserTypingEvent(serverUrl, msg);
            jest.runAllTimers();
            jest.useRealTimers();
            await promise;

            expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(Events.USER_TYPING, expect.any(Object));

            expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(Events.USER_STOP_TYPING, expect.any(Object));
        });
    });

    describe('userTyping', () => {
        it('should send typing event', async () => {
            const mockClient = {
                sendUserTypingEvent: jest.fn(),
            };
            jest.mocked(WebsocketManager.getClient).mockReturnValue(mockClient as any);

            await userTyping(serverUrl, 'channel-id', 'root-id');
            expect(mockClient.sendUserTypingEvent).toHaveBeenCalledWith('channel-id', 'root-id');
        });

        it('should handle missing client', async () => {
            jest.mocked(WebsocketManager.getClient).mockReturnValue(undefined);
            await userTyping(serverUrl, 'channel-id');

            // Should not throw
        });
    });

    describe('handleStatusChangedEvent', () => {
        it('should update user status', async () => {
            const msg = {
                data: {
                    status: 'online',
                    user_id: currentUserId,
                },
            } as WebSocketMessage;

            await handleStatusChangedEvent(serverUrl, msg);

            expect(setCurrentUserStatus).toHaveBeenCalledWith(serverUrl, 'online');
            jest.useRealTimers();
        });
    });
});
