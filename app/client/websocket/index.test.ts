// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {WebSocketReadyState} from '@mattermost/react-native-network-client';

import {WebsocketEvents} from '@constants';
import DatabaseManager from '@database/manager';
import {getConfigValue} from '@queries/servers/system';
import {hasReliableWebsocket} from '@utils/config';
import {logDebug, logInfo, logError, logWarning} from '@utils/log';

import WebSocketClient from './index';

const getOrCreateWebSocketClient = require('@mattermost/react-native-network-client').getOrCreateWebSocketClient;

jest.mock('@mattermost/react-native-network-client', () => ({
    WebSocketReadyState: {
        OPEN: 1,
        CLOSED: 3,
    },
    getOrCreateWebSocketClient: jest.fn(),
}));

jest.mock('@queries/servers/system', () => ({
    getConfigValue: jest.fn(),
}));

const mockedGetConfigValue = getConfigValue as jest.MockedFunction<typeof getConfigValue>;

jest.mock('@database/manager', () => ({
    serverDatabases: {},
}));

jest.mock('@utils/log', () => ({
    logInfo: jest.fn(),
    logWarning: jest.fn(),
    logError: jest.fn(),
    logDebug: jest.fn(),
}));

jest.mock('@utils/config', () => ({
    hasReliableWebsocket: jest.fn(),
}));

const mockedHasReliableWebsocket = hasReliableWebsocket as jest.MockedFunction<typeof hasReliableWebsocket>;

describe('WebSocketClient', () => {
    let client: WebSocketClient;
    const serverUrl = 'https://example.com';
    const token = 'test-token';

    const mockConn = {
        onOpen: jest.fn(),
        onClose: jest.fn(),
        onError: jest.fn(),
        onMessage: jest.fn(),
        open: jest.fn(),
        close: jest.fn(),
        invalidate: jest.fn(),
        send: jest.fn(),
        readyState: WebSocketReadyState.OPEN,
    };
    const mockClient = {client: mockConn};
    getOrCreateWebSocketClient.mockResolvedValue(mockClient);
    mockedHasReliableWebsocket.mockReturnValue(false);

    beforeEach(() => {
        client = new WebSocketClient(serverUrl, token);
    });

    it('should initialize the WebSocketClient', async () => {
        DatabaseManager.serverDatabases[serverUrl] = {database: {} as any, operator: {} as any};
        mockedGetConfigValue.mockResolvedValueOnce('wss://example.com');
        mockedGetConfigValue.mockResolvedValueOnce('5.0.0');
        mockedGetConfigValue.mockResolvedValueOnce('true');

        await client.initialize();

        expect(logInfo).toHaveBeenCalledWith('websocket connecting to wss://example.com/api/v4/websocket');
    });

    it('should handle WebSocket open event - skip sync', async () => {
        const firstConnectCallback = jest.fn();
        client.setFirstConnectCallback(firstConnectCallback);

        await client.initialize({}, true);

        mockConn.onOpen.mock.calls[0][0]();

        expect(logInfo).toHaveBeenCalledWith('websocket connected to', 'wss://example.com/api/v4/websocket');
        expect(firstConnectCallback).toHaveBeenCalled();
    });

    it('should handle WebSocket open event - dont skip sync', async () => {
        const reconnectCallback = jest.fn();
        client.setReconnectCallback(reconnectCallback);

        await client.initialize();

        mockConn.onOpen.mock.calls[0][0]();

        expect(logInfo).toHaveBeenCalledWith('websocket re-established connection to', 'wss://example.com/api/v4/websocket');
        expect(reconnectCallback).toHaveBeenCalled();
    });

    it('should handle WebSocket open event - dont skip sync, reliable ws', async () => {
        mockedHasReliableWebsocket.mockReturnValueOnce(true);
        const reliableReconnectCallback = jest.fn();
        client.setReliableReconnectCallback(reliableReconnectCallback);
        const missedEventsCallback = jest.fn();
        client.setMissedEventsCallback(missedEventsCallback);
        client.setEventCallback(jest.fn());

        await client.initialize();

        // Set seq to non-zero
        const message = {seq: 0, event: 'test_event'};
        mockConn.onMessage.mock.calls[0][0]({message});

        mockConn.onOpen.mock.calls[0][0]();

        expect(logInfo).toHaveBeenCalledWith('websocket re-established connection to', 'wss://example.com/api/v4/websocket?connection_id=&sequence_number=0');
        expect(reliableReconnectCallback).toHaveBeenCalled();
        expect(missedEventsCallback).toHaveBeenCalled();
    });

    it('should handle WebSocket close event', async () => {
        const closeCallback = jest.fn();
        client.setCloseCallback(closeCallback);

        await client.initialize();

        mockConn.onClose.mock.calls[0][0]({});

        expect(logInfo).toHaveBeenCalledWith('websocket closed', 'wss://example.com/api/v4/websocket');
        expect(closeCallback).toHaveBeenCalled();
    });

    it('should handle WebSocket close event - tls handshake error', async () => {
        await client.initialize();
        const message = {code: 1015, reason: 'tls handshake error'};

        mockConn.onClose.mock.calls[0][0]({message});

        expect(logDebug).toHaveBeenCalledWith('websocket did not connect', 'wss://example.com/api/v4/websocket', message.reason);
    });

    it('should handle WebSocket error event', async () => {
        const errorCallback = jest.fn();
        client.setErrorCallback(errorCallback);

        await client.initialize();

        mockConn.onError.mock.calls[0][0]({url: 'wss://example.com/api/v4/websocket'});

        expect(logError).toHaveBeenCalledWith('websocket error', 'wss://example.com/api/v4/websocket');
        expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle WebSocket message event', async () => {
        const eventCallback = jest.fn();
        client.setEventCallback(eventCallback);

        await client.initialize();

        const message = {seq: 0, event: 'test_event'};
        mockConn.onMessage.mock.calls[0][0]({message});

        expect(client.getServerSequence()).toBe(1);
        expect(eventCallback).toHaveBeenCalledWith(message);
    });

    it('should handle WebSocket message event - seq_reply', async () => {
        const eventCallback = jest.fn();
        client.setEventCallback(eventCallback);

        await client.initialize();

        mockConn.onMessage.mock.calls[0][0]({message: {seq_reply: 1}});
        expect(logWarning).not.toHaveBeenCalled();
        expect(client.getServerSequence()).toBe(0); // does not increment

        const message = {seq_reply: 1, error: 'an error'};
        mockConn.onMessage.mock.calls[0][0]({message});

        expect(logWarning).toHaveBeenCalledWith(message);
        expect(client.getServerSequence()).toBe(0); // does not increment
    });

    it('should handle WebSocket message event - reliable ws', async () => {
        mockedHasReliableWebsocket.mockReturnValueOnce(true);

        const eventCallback = jest.fn();
        client.setEventCallback(eventCallback);

        await client.initialize();

        const message = {seq: 0, event: WebsocketEvents.HELLO, data: {connection_id: 'test-connection-id'}};
        mockConn.onMessage.mock.calls[0][0]({message});

        expect(client.getServerSequence()).toBe(1);
        expect(client.getConnectionId()).toBe('test-connection-id');

        expect(eventCallback).toHaveBeenCalledWith(message);
    });

    it('should handle WebSocket message event - reliable ws, missed event', async () => {
        mockedHasReliableWebsocket.mockReturnValueOnce(true);

        const eventCallback = jest.fn();
        client.setEventCallback(eventCallback);

        await client.initialize();

        const message = {seq: 1, event: 'test_event'};
        mockConn.onMessage.mock.calls[0][0]({message});

        expect(logInfo).toHaveBeenCalledWith('wss://example.com/api/v4/websocket?connection_id=&sequence_number=0', 'missed websocket event, act_seq=1 exp_seq=0');
        expect(client.getConnectionId()).toBe('');
        expect(client.getServerSequence()).toBe(0); // does not increment
        expect(eventCallback).not.toHaveBeenCalled();
    });

    it('should handle WebSocket message event - missed event', async () => {
        const eventCallback = jest.fn();
        client.setEventCallback(eventCallback);
        const reconnectCallback = jest.fn();
        client.setReconnectCallback(reconnectCallback);

        await client.initialize();

        const message = {seq: 1, event: 'test_event'};
        mockConn.onMessage.mock.calls[0][0]({message});

        expect(reconnectCallback).toHaveBeenCalled();
        expect(client.getServerSequence()).toBe(2);
        expect(eventCallback).toHaveBeenCalledWith(message);
    });

    it('should send a user typing event', async () => {
        await client.initialize();

        client.sendUserTypingEvent('channel1', 'parent1');

        expect(mockConn.send).toHaveBeenCalledWith(JSON.stringify({
            action: 'user_typing',
            seq: 1,
            data: {
                channel_id: 'channel1',
                parent_id: 'parent1',
            },
        }));
    });

    it('should fail to send user typing event', async () => {
        client.close();
        client.sendUserTypingEvent('channel1', 'parent1');

        expect(mockConn.send).not.toHaveBeenCalled();
    });

    it('should check if the WebSocket is connected', async () => {
        await client.initialize();

        expect(client.isConnected()).toBe(true);
    });
});
