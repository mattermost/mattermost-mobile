// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// @ts-nocheck
import {Buffer} from 'buffer';

import {getOrCreateWebSocketClient, WebSocketReadyState} from '@mattermost/react-native-network-client';
import {encode} from '@msgpack/msgpack';

import DatabaseManager from '@database/manager';
import {advanceTimers, enableFakeTimers, disableFakeTimers} from '@test/timer_helpers';

import {WebSocketClient, wsReconnectionTimeoutErr, wsReconnectionTimeout} from './websocket_client';

jest.mock('@mattermost/react-native-network-client', () => ({
    getOrCreateWebSocketClient: jest.fn(),
    WebSocketReadyState: {
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3,
    },
}));

describe('WebSocketClient', () => {
    const mockServerUrl = 'server1';
    const mockWsPath = '/api/v4/websocket';
    const mockToken = 'mock-token';

    let mockWsClient;
    let openCallback;
    let closeCallback;
    let errorCallback;
    let messageCallback;

    const makeMockWsClient = () => {
        openCallback = null;
        closeCallback = null;
        errorCallback = null;
        messageCallback = null;

        return {
            onOpen: jest.fn((cb) => {
                openCallback = cb;
            }),
            onClose: jest.fn((cb) => {
                closeCallback = cb;
            }),
            onError: jest.fn((cb) => {
                errorCallback = cb;
            }),
            onMessage: jest.fn((cb) => {
                messageCallback = cb;
            }),
            open: jest.fn(),
            send: jest.fn(),
            sendBinary: jest.fn(),
            invalidate: jest.fn().mockResolvedValue(undefined),
            readyState: WebSocketReadyState.OPEN,
        };
    };

    beforeAll(async () => {
        await DatabaseManager.init(['server1']);
    });

    beforeEach(() => {
        mockWsClient = makeMockWsClient();
        (getOrCreateWebSocketClient as jest.Mock).mockResolvedValue({client: mockWsClient});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should not init when server database is missing', async () => {
        const ws = new WebSocketClient('server2', mockWsPath, mockToken);
        await ws.initialize();
        expect(ws.wsClient).toBeNull();
    });

    it('should init and register handlers', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        expect(ws.wsClient).toBeNull();

        await ws.init(false);

        expect(ws.wsClient).not.toBeNull();
        expect(mockWsClient.onOpen).not.toHaveBeenCalled(); // not a reconnect
        expect(mockWsClient.onError).toHaveBeenCalled();
        expect(mockWsClient.onClose).toHaveBeenCalled();
        expect(mockWsClient.onMessage).toHaveBeenCalled();
        expect(mockWsClient.open).toHaveBeenCalled();
    });

    it('should register onOpen handler on reconnect, reset timers, and emit open with previous connID', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        ws.connID = 'prev_conn_id';
        ws.originalConnID = 'original_conn_id';
        await ws.init(true);

        expect(mockWsClient.onOpen).toHaveBeenCalled();

        ws.emit = jest.fn();

        openCallback();

        // 'open' is emitted before hello so prevConnID is still the previous session ID,
        // which connection.ts forwards to the server to resume the old session.
        expect(ws.emit).toHaveBeenCalledWith('open', 'original_conn_id', 'prev_conn_id', true);
        expect(ws.lastDisconnect).toBe(0);
    });

    it('should update connID on hello during reconnect without re-emitting open', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        ws.connID = 'old_conn_id';
        ws.originalConnID = 'original_conn_id';
        await ws.init(true);

        ws.emit = jest.fn();

        const helloMsg = {event: 'hello', data: {connection_id: 'new_conn_id'}};
        messageCallback({message: JSON.stringify(helloMsg)});

        expect(ws.connID).toBe('new_conn_id');
        expect(ws.emit).not.toHaveBeenCalled(); // open already emitted from onOpen
    });

    it('should emit error on onerror', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        ws.emit = jest.fn();
        const err = new Error('test error');
        errorCallback(err);

        expect(ws.emit).toHaveBeenCalledWith('error', err);
    });

    it('should emit close and reconnect on onclose', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        ws.emit = jest.fn();
        jest.spyOn(ws, 'reconnect').mockImplementation(() => {});

        // closed — should not reconnect
        ws.closed = true;
        const ev = {code: 1000, reason: 'test reason'};
        closeCallback(ev);
        expect(ws.emit).toHaveBeenCalledWith('close', ev);
        expect(ws.reconnect).not.toHaveBeenCalled();

        // not closed — should reconnect
        ws.closed = false;
        closeCallback(ev);
        expect(ws.emit).toHaveBeenCalledWith('close', ev);
        expect(ws.reconnect).toHaveBeenCalled();
    });

    it('should reconnect after close with timer', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        ws.originalConnID = 'originalConnID';
        ws.connID = 'connID';
        await ws.init(false);

        jest.spyOn(ws, 'init');
        enableFakeTimers();

        ws.reconnect();
        await advanceTimers(1000);

        expect(ws.init).toHaveBeenCalledWith(true);

        disableFakeTimers();
    });

    it('should return correct state', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        expect(ws.state()).toBe(WebSocketReadyState.CLOSED);

        await ws.init(false);
        mockWsClient.readyState = WebSocketReadyState.CONNECTING;
        expect(ws.state()).toBe(WebSocketReadyState.CONNECTING);

        mockWsClient.readyState = WebSocketReadyState.OPEN;
        expect(ws.state()).toBe(WebSocketReadyState.OPEN);
    });

    it('should invalidate client on close', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        ws.close();

        expect(ws.closed).toBe(true);
        expect(mockWsClient.invalidate).toHaveBeenCalled();
        expect(ws.wsClient).toBeNull();
        expect(ws.seqNo).toBe(1);
        expect(ws.serverSeqNo).toBe(0);
        expect(ws.connID).toBe('');
        expect(ws.originalConnID).toBe('');
    });

    it('should emit error on reconnection timeout', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        const errorHandler = jest.fn();
        ws.on('error', errorHandler);

        ws.lastDisconnect = Date.now() - (wsReconnectionTimeout + 1000);
        ws.reconnect();

        expect(errorHandler).toHaveBeenCalledWith(wsReconnectionTimeoutErr);
        expect(ws.closed).toBe(true);
    });

    it('should handle hello message and set connID', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        ws.emit = jest.fn();

        const helloMsg = {event: 'hello', data: {connection_id: 'new_conn_id'}};
        messageCallback({message: JSON.stringify(helloMsg)});

        expect(ws.connID).toBe('new_conn_id');
        expect(ws.originalConnID).toBe('new_conn_id');
        expect(ws.serverSeqNo).toBe(0);
        expect(ws.emit).toHaveBeenCalledWith('open', 'new_conn_id', 'new_conn_id', false);
    });

    it('should handle hello message as pre-parsed object (iOS path)', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        ws.emit = jest.fn();

        const helloMsg = {seq: 1, event: 'hello', data: {connection_id: 'new_conn_id'}};
        messageCallback({message: helloMsg});

        expect(ws.connID).toBe('new_conn_id');
        expect(ws.serverSeqNo).toBe(0);
        expect(ws.emit).toHaveBeenCalledWith('open', 'new_conn_id', 'new_conn_id', false);
    });

    it('should handle join, error, and signal messages', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        // Set up connID via hello
        messageCallback({message: JSON.stringify({event: 'hello', data: {connection_id: 'conn_id'}})});

        const joinHandler = jest.fn();
        const errorHandler = jest.fn();
        const messageHandler = jest.fn();
        ws.on('join', joinHandler);
        ws.on('error', errorHandler);
        ws.on('message', messageHandler);

        const joinMsg = {event: 'custom_com.mattermost.calls_join', seq: 1, data: {connID: 'conn_id'}};
        messageCallback({message: JSON.stringify(joinMsg)});
        expect(joinHandler).toHaveBeenCalled();

        const errorMsg = {event: 'custom_com.mattermost.calls_error', seq: 2, data: {connID: 'conn_id', error: 'test error'}};
        messageCallback({message: JSON.stringify(errorMsg)});
        expect(errorHandler).toHaveBeenCalledWith(errorMsg.data);

        const signalMsg = {event: 'custom_com.mattermost.calls_signal', seq: 3, data: {connID: 'conn_id', signal: 'test signal'}};
        messageCallback({message: JSON.stringify(signalMsg)});
        expect(messageHandler).toHaveBeenCalledWith(signalMsg.data);
    });

    it('should ignore messages with wrong connID', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        messageCallback({message: JSON.stringify({event: 'hello', data: {connection_id: 'conn_id'}})});

        const messageHandler = jest.fn();
        ws.on('message', messageHandler);

        const wrongMsg = {event: 'custom_com.mattermost.calls_signal', seq: 1, data: {connID: 'wrong_id'}};
        messageCallback({message: JSON.stringify(wrongMsg)});
        expect(messageHandler).not.toHaveBeenCalled();
    });

    it('should ignore invalid JSON messages', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        const before = ws.serverSeqNo;
        messageCallback({message: 'invalid json'});
        expect(ws.serverSeqNo).toBe(before);
    });

    it('should send JSON message', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        mockWsClient.readyState = WebSocketReadyState.OPEN;
        ws.send('test_action', {foo: 'bar'});

        expect(mockWsClient.send).toHaveBeenCalledWith(JSON.stringify({
            action: 'custom_com.mattermost.calls_test_action',
            seq: 1,
            data: {foo: 'bar'},
        }));
    });

    it('should send binary message as base64-encoded msgpack', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        mockWsClient.readyState = WebSocketReadyState.OPEN;
        const data = {foo: 'bar'};
        ws.send('test_action', data, true);

        const expectedMsg = {action: 'custom_com.mattermost.calls_test_action', seq: 1, data};
        const expectedBase64 = Buffer.from(encode(expectedMsg)).toString('base64');
        expect(mockWsClient.sendBinary).toHaveBeenCalledWith(expectedBase64);
        expect(mockWsClient.send).not.toHaveBeenCalled();
    });

    it('should not send when WebSocket is not open', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        mockWsClient.readyState = WebSocketReadyState.CONNECTING;
        ws.send('test_action', {});
        expect(mockWsClient.send).not.toHaveBeenCalled();

        mockWsClient.readyState = WebSocketReadyState.CLOSED;
        ws.send('test_action', {});
        expect(mockWsClient.send).not.toHaveBeenCalled();
    });
});
