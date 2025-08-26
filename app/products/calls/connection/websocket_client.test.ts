// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// At the moment it feels to much work to make this test pass all the typescript rules due to the heavy mocking involved (e.g., WebSocket global).
// eslint-disable-next-line
// @ts-nocheck

import {encode} from '@msgpack/msgpack';

import DatabaseManager from '@database/manager';

import {WebSocketClient, wsReconnectionTimeoutErr, wsReconnectionTimeout} from './websocket_client';

describe('WebSocketClient', () => {
    const mockServerUrl = 'server1';
    const mockWsPath = '/api/v4/websocket';
    const mockToken = 'mock-token';

    beforeAll(async () => {
        global.WebSocket = jest.fn();
        global.WebSocket.CONNECTING = 0;
        global.WebSocket.OPEN = 1;
        global.WebSocket.CLOSING = 2;
        global.WebSocket.CLOSED = 3;

        await DatabaseManager.init(['server1']);
    });

    afterAll(() => {
        delete global.WebSocket;
    });

    beforeEach(() => {
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('init', async () => {
        let ws = new WebSocketClient('server2', mockWsPath, mockToken);
        await ws.initialize();
        expect(ws.ws).toBeNull();

        ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        expect(ws).toBeDefined();
        expect(ws.ws).toBeNull();

        await ws.init(false);
        expect(ws.ws).not.toBeNull();

        expect(ws.ws.onopen).toBeUndefined();
        expect(ws.ws.onerror).toBeDefined();
        expect(ws.ws.onclose).toBeDefined();
    });

    it('onerror', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        const err = new Error('test error');

        ws.emit = jest.fn();

        ws.ws.onerror(err);

        expect(ws.emit).toHaveBeenCalledWith('error', err);
    });

    it('onclose', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        ws.originalConnID = 'originalConnID';
        ws.connID = 'connID';
        await ws.init(false);

        ws.emit = jest.fn();

        jest.spyOn(ws, 'init');
        jest.spyOn(ws, 'reconnect');

        // Test closed case
        ws.closed = true;

        const ev = {code: 1000, reason: 'test reason'};
        ws.ws.onclose(ev);
        expect(ws.emit).toHaveBeenCalledWith('close', ev);
        expect(ws.reconnect).not.toHaveBeenCalled();

        // Test reconnect case
        jest.useFakeTimers();
        jest.spyOn(global, 'setTimeout');

        ws.closed = false;
        ws.ws.onclose(ev);
        expect(ws.emit).toHaveBeenCalledWith('close', ev);
        expect(ws.reconnect).toHaveBeenCalled();
        expect(setTimeout).toHaveBeenCalledTimes(1);

        jest.runAllTimers();

        await Promise.resolve();

        jest.useRealTimers();

        await expect(ws.init).toHaveBeenCalledWith(true);
        expect(ws.ws.onopen).toBeDefined();

        ws.ws.onopen();
        expect(ws.emit).toHaveBeenCalledWith('open', 'originalConnID', 'connID', true);
    });

    it('state', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        expect(ws.state()).toBe(WebSocket.CLOSED);

        await ws.init(false);
        ws.ws.readyState = WebSocket.CONNECTING;
        expect(ws.state()).toBe(WebSocket.CONNECTING);
    });

    it('close', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        const close = jest.fn();
        ws.ws.close = close;

        ws.close();
        expect(ws.closed).toBe(true);
        expect(close).toHaveBeenCalled();
        expect(ws.ws).toBeNull();
        expect(ws.seqNo).toBe(1);
        expect(ws.serverSeqNo).toBe(0);
        expect(ws.connID).toBe('');
        expect(ws.originalConnID).toBe('');
    });

    it('reconnection timeout', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        // Mock error handler
        const errorHandler = jest.fn();
        ws.on('error', errorHandler);

        // Set last disconnect to be longer than timeout
        ws.lastDisconnect = Date.now() - (wsReconnectionTimeout + 1000);
        ws.reconnect();

        expect(errorHandler).toHaveBeenCalledWith(wsReconnectionTimeoutErr);
        expect(ws.closed).toBe(true);
    });

    it('onmessage', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        // Test hello message
        const helloMsg = {
            event: 'hello',
            data: {
                connection_id: 'new_conn_id',
            },
        };
        ws.ws.onmessage({data: JSON.stringify(helloMsg)});
        expect(ws.connID).toBe('new_conn_id');
        expect(ws.serverSeqNo).toBe(0);

        // Test signal message
        const joinHandler = jest.fn();
        ws.on('join', joinHandler);
        const joinMsg = {
            event: 'custom_com.mattermost.calls_join',
            seq: 1,
            data: {
                connID: 'new_conn_id',
            },
        };
        ws.ws.onmessage({data: JSON.stringify(joinMsg)});
        expect(joinHandler).toHaveBeenCalled();
        expect(ws.serverSeqNo).toBe(2);

        // Test error message
        const errorHandler = jest.fn();
        ws.on('error', errorHandler);
        const errorMsg = {
            event: 'custom_com.mattermost.calls_error',
            seq: 2,
            data: {
                connID: 'new_conn_id',
                error: 'test error',
            },
        };
        ws.ws.onmessage({data: JSON.stringify(errorMsg)});
        expect(errorHandler).toHaveBeenCalledWith(errorMsg.data);
        expect(ws.serverSeqNo).toBe(3);

        // Test signal message
        const messageHandler = jest.fn();
        ws.on('message', messageHandler);
        const signalMsg = {
            event: 'custom_com.mattermost.calls_signal',
            seq: 3,
            data: {
                connID: 'new_conn_id',
                signal: 'test signal',
            },
        };
        ws.ws.onmessage({data: JSON.stringify(signalMsg)});
        expect(messageHandler).toHaveBeenCalledWith(signalMsg.data);
        expect(ws.serverSeqNo).toBe(4);

        // Test invalid message
        ws.ws.onmessage({data: 'invalid json'});
        expect(ws.serverSeqNo).toBe(4);

        // Test message without event
        ws.ws.onmessage({data: JSON.stringify({seq: 4})});
        expect(ws.serverSeqNo).toBe(5);

        // Test message with wrong connID
        const wrongConnIDMsg = {
            event: 'custom_com.mattermost.calls_signal',
            seq: 5,
            data: {
                connID: 'wrong_conn_id',
                signal: 'test signal',
            },
        };
        ws.ws.onmessage({data: JSON.stringify(wrongConnIDMsg)});
        expect(messageHandler).toHaveBeenCalledTimes(1);
        expect(ws.serverSeqNo).toBe(6);
    });

    it('send', async () => {
        const ws = new WebSocketClient(mockServerUrl, mockWsPath, mockToken);
        await ws.init(false);

        // Mock the WebSocket send method
        ws.ws.send = jest.fn();

        // Test JSON message
        const action = 'test_action';
        const data = {foo: 'bar'};
        ws.ws.readyState = WebSocket.OPEN;
        ws.send(action, data);
        expect(ws.ws.send).toHaveBeenCalledWith(JSON.stringify({
            action: `custom_com.mattermost.calls_${action}`,
            seq: 1,
            data,
        }));
        expect(ws.ws.send).toHaveBeenCalledTimes(1);

        // Test binary message
        ws.send(action, data, true);
        expect(ws.ws.send).toHaveBeenCalledWith(encode({
            action: `custom_com.mattermost.calls_${action}`,
            seq: 2,
            data,
        }));
        expect(ws.ws.send).toHaveBeenCalledTimes(2);

        // Test when WebSocket is not ready
        ws.ws.readyState = WebSocket.CONNECTING;
        ws.send(action, data);
        expect(ws.ws.send).toHaveBeenCalledTimes(2); // No additional call

        // Test when WebSocket is closed
        ws.ws.readyState = WebSocket.CLOSED;
        ws.send(action, data);
        expect(ws.ws.send).toHaveBeenCalledTimes(2); // No additional call
    });
});
