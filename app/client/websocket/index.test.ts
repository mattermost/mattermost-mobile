// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {WebSocketReadyState, getOrCreateWebSocketClient} from '@mattermost/react-native-network-client';

import {WebsocketEvents} from '@constants';
import DatabaseManager from '@database/manager';
import {getConfigValue} from '@queries/servers/system';
import {enableFakeTimers, disableFakeTimers, advanceTimers} from '@test/timer_helpers';
import {hasReliableWebsocket} from '@utils/config';
import {logDebug, logInfo, logError, logWarning} from '@utils/log';

import WebSocketClient from './index';

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

const mockedGetConfigValue = jest.mocked(getConfigValue);

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

const mockedHasReliableWebsocket = jest.mocked(hasReliableWebsocket);
const mockedGetOrCreateWebSocketClient = jest.mocked(getOrCreateWebSocketClient);

describe('WebSocketClient', () => {
    const serverUrl = 'https://example.com';
    const token = 'test-token';

    const createMockConn = () => ({
        onOpen: jest.fn(),
        onClose: jest.fn(),
        onError: jest.fn(),
        onMessage: jest.fn(),
        send: jest.fn(),
        readyState: WebSocketReadyState.CLOSED,
        open() {
            this.readyState = WebSocketReadyState.OPEN;
            this.onOpen.mock.calls[0][0]({});
        },
        close() {
            this.readyState = WebSocketReadyState.CLOSED;
            this.onClose.mock.calls[0][0]({});
        },
    });

    let mockConn: ReturnType<typeof createMockConn>;
    let client: WebSocketClient;

    beforeEach(() => {
        mockConn = createMockConn();
        const mockClient = {client: mockConn};
        mockedGetOrCreateWebSocketClient.mockResolvedValue(mockClient as any);
        mockedHasReliableWebsocket.mockReturnValue(false);
        client = new WebSocketClient(serverUrl, token);
        enableFakeTimers();
    });

    afterEach(() => {
        client.close(true);
        disableFakeTimers();
    });

    it('should initialize the WebSocketClient', async () => {
        DatabaseManager.serverDatabases[serverUrl] = {database: {} as any, operator: {} as any};
        mockedGetConfigValue.mockResolvedValueOnce('wss://example.com');
        mockedGetConfigValue.mockResolvedValueOnce('5.0.0');
        mockedGetConfigValue.mockResolvedValueOnce('true');

        await client.initialize();

        expect(mockedGetOrCreateWebSocketClient).toHaveBeenCalledWith('wss://example.com/api/v4/websocket', {headers: {origin: 'wss://example.com'}, timeoutInterval: 30000});
        expect(logInfo).toHaveBeenCalledWith('websocket connecting to wss://example.com/api/v4/websocket');
    });

    it('should handle WebSocket open event - skip sync', async () => {
        const firstConnectCallback = jest.fn();
        client.setFirstConnectCallback(firstConnectCallback);

        await client.initialize({}, true);

        expect(mockConn.readyState).toBe(WebSocketReadyState.OPEN);

        expect(logInfo).toHaveBeenCalledWith('websocket connected to', 'wss://example.com/api/v4/websocket');
        expect(firstConnectCallback).toHaveBeenCalled();
    });

    it('should handle WebSocket open event - dont skip sync', async () => {
        const reconnectCallback = jest.fn();
        client.setReconnectCallback(reconnectCallback);

        await client.initialize();

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

        mockConn.close();

        expect(logInfo).toHaveBeenCalledWith('websocket closed', 'wss://example.com/api/v4/websocket');
        expect(closeCallback).toHaveBeenCalled();
    });

    it('should handle WebSocket close event - reconnect', async () => {
        enableFakeTimers();

        const closeCallback = jest.fn();
        client.setCloseCallback(closeCallback);

        const connectingCallback = jest.fn();
        client.setConnectingCallback(connectingCallback);

        await client.initialize();

        expect(connectingCallback).toHaveBeenCalledTimes(1);
        expect(closeCallback).toHaveBeenCalledTimes(0);

        mockConn.close();

        await advanceTimers(6000);

        expect(connectingCallback).toHaveBeenCalledTimes(2);
        expect(closeCallback).toHaveBeenCalledTimes(1);
        expect(mockConn.readyState).toBe(WebSocketReadyState.OPEN);
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

        expect(mockConn.send).toHaveBeenNthCalledWith(1, JSON.stringify({
            action: 'authentication_challenge',
            seq: 1,
            data: {
                token: 'test-token',
            },
        }));
        expect(mockConn.send).toHaveBeenNthCalledWith(2, JSON.stringify({
            action: 'ping',
            seq: 2,
        }));
        expect(mockConn.send).toHaveBeenNthCalledWith(3, JSON.stringify({
            action: 'user_typing',
            seq: 3,
            data: {
                channel_id: 'channel1',
                parent_id: 'parent1',
            },
        }));
    });

    it('should fail to send user typing event', async () => {
        client.close(true);
        client.sendUserTypingEvent('channel1', 'parent1');

        expect(mockConn.send).not.toHaveBeenCalled();
    });

    it('should check if the WebSocket is connected', async () => {
        await client.initialize();

        expect(client.isConnected()).toBe(true);
    });

    it('should send ping messages on interval and handle pong responses', async () => {
        await client.initialize();

        // Wait until we get a client PING (which should happen almost immediately)
        await advanceTimers(10);
        expect(mockConn.send).toHaveBeenNthCalledWith(1, JSON.stringify({
            action: 'authentication_challenge',
            seq: 1,
            data: {
                token: 'test-token',
            },
        }));
        expect(mockConn.send).toHaveBeenNthCalledWith(2, JSON.stringify({
            action: 'ping',
            seq: 2,
        }));

        // Second ping should be sent if we got a pong response
        const pongMessage = {data: {text: WebsocketEvents.PONG}, seq_reply: 2, status: 'OK'};
        mockConn.onMessage.mock.calls[0][0]({message: pongMessage});

        // Second ping should be sent if we got a pong response
        await advanceTimers(30100);
        expect(mockConn.send).toHaveBeenNthCalledWith(3, JSON.stringify({
            action: 'ping',
            seq: 3,
        }));

        // Verify ping sequence increments
        const pongMessage2 = {data: {text: WebsocketEvents.PONG}, seq_reply: 3, status: 'OK'};
        mockConn.onMessage.mock.calls[0][0]({message: pongMessage2});

        await advanceTimers(30100);
        expect(mockConn.send).toHaveBeenNthCalledWith(4, JSON.stringify({
            action: 'ping',
            seq: 4,
        }));
    });

    it('should handle ping timeouts and reconnect', async () => {
        await client.initialize();

        // Send first PING (which should happen almost immediately)
        await advanceTimers(10);
        expect(mockConn.send).toHaveBeenNthCalledWith(1, JSON.stringify({
            action: 'authentication_challenge',
            seq: 1,
            data: {
                token: 'test-token',
            },
        }));
        expect(mockConn.send).toHaveBeenNthCalledWith(2, JSON.stringify({
            action: 'ping',
            seq: 2,
        }));

        // No pong received, next interval should trigger close
        await advanceTimers(30100);
        expect(mockConn.onClose).toHaveBeenCalled();

        // Reset mock and verify reconnect behavior
        mockConn.onClose.mockClear();
        mockConn.send.mockClear();

        // Should attempt to reconnect after timeout
        await advanceTimers(3000);

        // Should start pinging again immediately after reconnect
        mockConn.onOpen.mock.calls[0][0]();
        await advanceTimers(10);

        expect(mockConn.send).toHaveBeenNthCalledWith(1, JSON.stringify({
            action: 'authentication_challenge',
            seq: 1,
            data: {
                token: 'test-token',
            },
        }));
        expect(mockConn.send).toHaveBeenNthCalledWith(2, JSON.stringify({
            action: 'ping',
            seq: 2,
        }));
    });

    it('should clear ping interval on close', async () => {
        enableFakeTimers();

        await client.initialize();
        mockConn.onOpen.mock.calls[0][0](); // Complete the connection
        mockConn.send.mockClear(); // Clear the initial authentication call

        // Advance timer - no ping should be sent
        await advanceTimers(20000);

        client.close(true);

        // Advance timer - no ping should be sent
        await advanceTimers(20000);

        expect(mockConn.send).not.toHaveBeenCalled();
    });

    it('should reset ping interval state when reconnecting during pending ping', async () => {
        enableFakeTimers();

        const closeCallback = jest.fn();
        client.setCloseCallback(closeCallback);

        const connectingCallback = jest.fn();
        client.setConnectingCallback(connectingCallback);

        await client.initialize();

        // Wait until we get a client PING (which should be almost immediate)
        await advanceTimers(10);

        expect(mockConn.send).toHaveBeenNthCalledWith(1, JSON.stringify({
            action: 'authentication_challenge',
            seq: 1,
            data: {
                token: 'test-token',
            },
        }));
        expect(mockConn.send).toHaveBeenNthCalledWith(2, JSON.stringify({
            action: 'ping',
            seq: 2,
        }));

        mockConn.close();

        // Let connection reconnect
        await advanceTimers(5100);

        // And client for PINGs to start again
        await advanceTimers(10);

        expect(connectingCallback).toHaveBeenCalledTimes(2);
        expect(closeCallback).toHaveBeenCalledTimes(1);
        expect(mockConn.send).toHaveBeenNthCalledWith(3, JSON.stringify({
            action: 'authentication_challenge',
            seq: 1,
            data: {
                token: 'test-token',
            },
        }));
        expect(mockConn.send).toHaveBeenNthCalledWith(4, JSON.stringify({
            action: 'ping',
            seq: 2,
        }));

        // Second ping should be sent if we got a pong response
        const pongMessage = {data: {text: WebsocketEvents.PONG}, seq_reply: 2, status: 'OK'};
        mockConn.onMessage.mock.calls[0][0]({message: pongMessage});

        // Ensure we continue to get client PINGs
        await advanceTimers(30100);
        expect(mockConn.send).toHaveBeenNthCalledWith(5, JSON.stringify({
            action: 'ping',
            seq: 3,
        }));

        expect(connectingCallback).toHaveBeenCalledTimes(2);
        expect(closeCallback).toHaveBeenCalledTimes(1);

        disableFakeTimers();
    });
});
