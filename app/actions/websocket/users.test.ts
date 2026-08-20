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
import {deleteCustomProfileAttributesByFieldId} from '@queries/servers/custom_profile';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {getConfig, getLicense} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import TestHelper from '@test/test_helper';
import * as logUtils from '@utils/log';

import {
    handleUserUpdatedEvent,
    handleUserTypingEvent,
    handleStatusChangedEvent,
    userTyping,
    handleCustomProfileAttributesValuesUpdatedEvent,
    handleCustomProfileAttributesFieldUpdatedEvent,
    handleCustomProfileAttributesFieldDeletedEvent,
} from './users';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@actions/local/channel');
jest.mock('@actions/local/user');
jest.mock('@actions/remote/user');
jest.mock('@database/manager');
jest.mock('@helpers/api/preference');
jest.mock('@managers/websocket_manager');
jest.mock('@queries/servers/channel');
jest.mock('@queries/servers/custom_profile');
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
                users: [
                    TestHelper.fakeUser({
                        id: otherUserId,
                        username: 'other-user',
                    }),
                ],
                existingUsers: [],
            });

            jest.mocked(queryDisplayNamePreferences).mockReturnValue(
                TestHelper.fakeQuery([
                    TestHelper.fakePreferenceModel({
                        value: 'full_name',
                    }),
                ]),
            );

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

    describe('handleCustomProfileAttributesValuesUpdatedEvent', () => {
        it('should handle missing operator', async () => {
            jest.spyOn(logUtils, 'logError').mockImplementation(() => {});
            DatabaseManager.serverDatabases = {};
            const msg = {
                data: {
                    user_id: 'user1',
                    values: {field1: 'value1'},
                },
            } as WebSocketMessage;

            await handleCustomProfileAttributesValuesUpdatedEvent(
                serverUrl,
                msg,
            );

            expect(logUtils.logError).toHaveBeenCalled();
        });

        it('should handle custom profile attributes values update', async () => {
            const mockHandleCustomProfileAttributes = jest.
                fn().
                mockResolvedValue([]);
            operator.handleCustomProfileAttributes =
                mockHandleCustomProfileAttributes;

            const msg = {
                data: {
                    user_id: 'user1',
                    values: {
                        field1: 'value1',
                        field2: 'value2',
                    },
                },
            } as WebSocketMessage;

            await handleCustomProfileAttributesValuesUpdatedEvent(
                serverUrl,
                msg,
            );

            expect(mockHandleCustomProfileAttributes).toHaveBeenCalledWith({
                attributes: [
                    {
                        id: 'field1-user1',
                        field_id: 'field1',
                        user_id: 'user1',
                        value: 'value1',
                    },
                    {
                        id: 'field2-user1',
                        field_id: 'field2',
                        user_id: 'user1',
                        value: 'value2',
                    },
                ],
                prepareRecordsOnly: false,
            });
        });

        it('should handle errors during attributes update', async () => {
            jest.spyOn(logUtils, 'logError').mockImplementation(() => {});
            operator.handleCustomProfileAttributes = jest.
                fn().
                mockRejectedValue(new Error('test error'));

            const msg = {
                data: {
                    user_id: 'user1',
                    values: {field1: 'value1'},
                },
            } as WebSocketMessage;

            await handleCustomProfileAttributesValuesUpdatedEvent(
                serverUrl,
                msg,
            );

            expect(logUtils.logError).toHaveBeenCalled();
        });
    });

    describe('handleCustomProfileAttributesFieldUpdatedEvent', () => {
        it('should handle missing operator', async () => {
            jest.spyOn(logUtils, 'logError').mockImplementation(() => {});
            DatabaseManager.serverDatabases = {};
            const msg = {
                data: {
                    field: {id: 'field1'},
                },
            } as WebSocketMessage;

            await handleCustomProfileAttributesFieldUpdatedEvent(
                serverUrl,
                msg,
            );

            expect(logUtils.logError).toHaveBeenCalled();
        });

        it('should handle custom profile field update', async () => {
            const mockHandleCustomProfileFields = jest.
                fn().
                mockResolvedValue([]);
            operator.handleCustomProfileFields = mockHandleCustomProfileFields;

            const mockField = {
                id: 'field1',
                group_id: 'group1',
                name: 'Field 1',
                type: 'text',
                target_id: 'target1',
                target_type: 'user',
                create_at: 1000,
                update_at: 2000,
                delete_at: 0,
                attrs: {required: true},
            };

            const msg = {
                data: {
                    field: mockField,
                },
            } as WebSocketMessage;

            await handleCustomProfileAttributesFieldUpdatedEvent(
                serverUrl,
                msg,
            );

            expect(mockHandleCustomProfileFields).toHaveBeenCalledWith({
                fields: [mockField],
                prepareRecordsOnly: false,
            });
        });

        it('should handle errors during field update', async () => {
            jest.spyOn(logUtils, 'logError').mockImplementation(() => {});
            operator.handleCustomProfileFields = jest.
                fn().
                mockRejectedValue(new Error('test error'));

            const msg = {
                data: {
                    field: {id: 'field1'},
                },
            } as WebSocketMessage;

            await handleCustomProfileAttributesFieldUpdatedEvent(
                serverUrl,
                msg,
            );

            expect(logUtils.logError).toHaveBeenCalled();
        });
    });

    describe('handleCustomProfileAttributesFieldDeletedEvent', () => {
        it('should handle missing operator', async () => {
            jest.spyOn(logUtils, 'logError').mockImplementation(() => {});
            DatabaseManager.serverDatabases = {};
            const msg = {
                data: {
                    field_id: 'field1',
                },
            } as WebSocketMessage;

            await handleCustomProfileAttributesFieldDeletedEvent(
                serverUrl,
                msg,
            );

            expect(logUtils.logError).toHaveBeenCalled();
        });

        it('should handle custom profile field deletion', async () => {

            // Add explicit mock setup for deleteCustomProfileAttributesByFieldId
            jest.mocked(deleteCustomProfileAttributesByFieldId).mockResolvedValue();

            const mockDate = 1635812400000; // Nov 1, 2021
            jest.spyOn(Date, 'now').mockReturnValue(mockDate);

            const msg = {
                data: {
                    field_id: 'field1',
                },
            } as WebSocketMessage;

            await handleCustomProfileAttributesFieldDeletedEvent(
                serverUrl,
                msg,
            );

            expect(deleteCustomProfileAttributesByFieldId).toHaveBeenCalledWith(
                operator.database,
                'field1',
            );
        });

        it('should handle errors during field model deletion', async () => {
            jest.spyOn(logUtils, 'logError').mockImplementation(() => {});
            operator.handleCustomProfileFields = jest.fn().mockRejectedValue(new Error('test error'));

            jest.mocked(deleteCustomProfileAttributesByFieldId).mockResolvedValue();

            const msg = {
                data: {
                    field_id: 'field1',
                },
            } as WebSocketMessage;

            await handleCustomProfileAttributesFieldDeletedEvent(serverUrl, msg);

            expect(logUtils.logError).toHaveBeenCalled();

            expect(deleteCustomProfileAttributesByFieldId).not.toHaveBeenCalled();
        });

        it('should handle errors during attributes deletion', async () => {
            jest.spyOn(logUtils, 'logError').mockImplementation(() => {});

            jest.mocked(deleteCustomProfileAttributesByFieldId).mockRejectedValue(new Error('test error'));

            const msg = {
                data: {
                    field_id: 'field1',
                },
            } as WebSocketMessage;

            await handleCustomProfileAttributesFieldDeletedEvent(
                serverUrl,
                msg,
            );

            expect(logUtils.logError).toHaveBeenCalled();
            expect(deleteCustomProfileAttributesByFieldId).toHaveBeenCalled();
        });
    });
});
