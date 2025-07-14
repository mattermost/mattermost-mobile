// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo from '@react-native-community/netinfo';
import {AppState} from 'react-native';
import BackgroundTimer from 'react-native-background-timer';

import {fetchStatusByIds} from '@actions/remote/user';
import {handleFirstConnect, handleReconnect} from '@actions/websocket';
import WebSocketClient from '@client/websocket';
import DatabaseManager from '@database/manager';
import {getCurrentUserId} from '@queries/servers/system';
import {queryAllUsers} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import TestHelper from '@test/test_helper';
import {logError} from '@utils/log';

import WebsocketManager from './websocket_manager';

import type {ServerDatabase} from '@typings/database/database';

jest.mock('@react-native-community/netinfo');
jest.mock('react-native/Libraries/AppState/AppState');
jest.mock('react-native-background-timer');
jest.mock('@actions/local/user');
jest.mock('@actions/remote/user');
jest.mock('@actions/websocket');
jest.mock('@actions/websocket/event');
jest.mock('@client/websocket');
jest.mock('@database/manager');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/user');
jest.mock('@utils/log');
jest.mock('@store/ephemeral_store');

describe('WebsocketManager', () => {
    let manager: typeof WebsocketManager;
    let mockWebSocketClient: any;
    let mockCallbacks: {[key: string]: () => void};
    const mockServerUrl = 'https://example.com';
    const mockToken = 'mock-token';
    const mockCredentials = [{serverUrl: mockServerUrl, token: mockToken} as ServerCredential];

    beforeEach(async () => {
        mockCallbacks = {};
        await DatabaseManager.init([mockServerUrl]);

        // Reset NetInfo mock
        (NetInfo.fetch as jest.Mock).mockResolvedValue({isConnected: true, type: 'wifi'});
        (NetInfo.addEventListener as jest.Mock).mockReturnValue(jest.fn());

        // Reset AppState mock
        AppState.currentState = 'active';

        // Reset WebSocketClient mock
        mockWebSocketClient = {
            setFirstConnectCallback: jest.fn((cb) => {
                mockCallbacks.firstConnect = cb;
            }),

            setEventCallback: jest.fn(),
            setReconnectCallback: jest.fn((cb) => {
                mockCallbacks.reconnect = cb;
            }),
            setReliableReconnectCallback: jest.fn(),
            setCloseCallback: jest.fn(),
            initialize: jest.fn(),
            isConnected: jest.fn().mockReturnValue(true),
            close: jest.fn(),
            invalidate: jest.fn(),
        };
        (WebSocketClient as jest.Mock).mockImplementation(() => mockWebSocketClient);

        // Reset DatabaseManager mock
        jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockImplementation(() => ({
            database: {},
            operator: {},
        } as ServerDatabase));

        manager = WebsocketManager;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(mockServerUrl);
        jest.clearAllMocks();
    });

    describe('init', () => {
        it('should initialize correctly', async () => {
            await manager.init(mockCredentials);

            expect(NetInfo.fetch).toHaveBeenCalled();
            expect(WebSocketClient).toHaveBeenCalledWith(mockServerUrl, mockToken);
            expect(NetInfo.addEventListener).toHaveBeenCalled();
        });

        it('should handle initialization error gracefully', async () => {
            (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            await manager.init(mockCredentials);

            expect(jest.mocked(logError)).toHaveBeenCalled();
        });
    });

    describe('client management', () => {
        beforeEach(async () => {
            await manager.init(mockCredentials);
            jest.clearAllMocks();
        });

        it('should create and invalidate clients correctly', () => {
            const client = manager.createClient(mockServerUrl, mockToken);
            expect(client).toBeDefined();

            manager.invalidateClient(mockServerUrl);
            expect(manager.getClient(mockServerUrl)).toBeUndefined();
        });

        it('should handle websocket state observations', () => {
            const observable = manager.observeWebsocketState(mockServerUrl);
            expect(observable).toBeDefined();
        });
    });

    describe('proper callbacks set', () => {
        it('should remove playbooks when the reconnect callback is called', () => {
            const client = manager.createClient(mockServerUrl, mockToken);
            expect(client).toBeDefined();

            expect(client.setReconnectCallback).toHaveBeenCalled();
            jest.mocked(client.setReconnectCallback).mock.calls[0][0]();
            expect(EphemeralStore.clearChannelPlaybooksSynced).toHaveBeenCalled();
        });
    });

    describe('connection handling', () => {
        beforeEach(async () => {
            await manager.init(mockCredentials);
        });

        it('should handle first connect correctly', async () => {
            mockWebSocketClient.isConnected.mockReturnValueOnce(false);

            await manager.initializeClient(mockServerUrl);

            expect(mockWebSocketClient.initialize).toHaveBeenCalledWith({}, true);
            expect(handleFirstConnect).toHaveBeenCalledWith(mockServerUrl, 'WebSocket Reconnect');

            if (mockCallbacks.firstConnect) {
                mockCallbacks.firstConnect();
            }
        });

        it('should handle reconnect correctly', async () => {
            const client = manager.getClient(mockServerUrl);
            expect(client).toBeDefined();

            mockCallbacks.reconnect();
            expect(handleReconnect).toHaveBeenCalledWith(mockServerUrl);
        });
    });

    describe('state changes', () => {
        beforeEach(async () => {
            await manager.init(mockCredentials);
        });

        it('should handle app state changes', () => {
            const mockIntervalId = 123;
            jest.spyOn(BackgroundTimer, 'setInterval').mockReturnValue(mockIntervalId);

            // Get the app state callback and simulate background state
            const mockAppStateChange = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
            mockAppStateChange('active');
            mockAppStateChange('background');

            expect(BackgroundTimer.setInterval).toHaveBeenCalled();
            expect(BackgroundTimer.setInterval).toHaveBeenCalledWith(expect.any(Function), 15000);
        });

        it('should handle network state changes', () => {
            const mockNetInfoCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
            mockNetInfoCallback({isConnected: false, type: 'none'});

            // Verify that clients are closed when network is disconnected
            expect(manager.getClient(mockServerUrl)?.close).toHaveBeenCalled();
        });
    });

    describe('periodic updates', () => {
        beforeEach(async () => {
            jest.mocked(getCurrentUserId).mockResolvedValue('user1');
            jest.mocked(queryAllUsers).mockImplementation(() => TestHelper.fakeQuery([
                TestHelper.fakeUserModel({id: 'user1'}),
                TestHelper.fakeUserModel({id: 'user2'}),
            ]));
            await manager.init(mockCredentials);
        });

        it('should handle periodic status updates', async () => {
            const client = manager.getClient(mockServerUrl);
            expect(client).toBeDefined();

            // Trigger first connect callback which starts periodic updates
            mockCallbacks.firstConnect();

            // Wait for all promises to resolve
            await new Promise((resolve) => setImmediate(resolve));

            expect(fetchStatusByIds).toHaveBeenCalledWith(mockServerUrl, ['user2']);
        });
    });
});
