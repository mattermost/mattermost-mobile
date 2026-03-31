// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Buffer} from 'buffer';
import {EventEmitter} from 'events';

import {getOrCreateWebSocketClient, WebSocketReadyState, type WebSocketClientInterface} from '@mattermost/react-native-network-client';
import {encode} from '@msgpack/msgpack';

import Calls from '@constants/calls';
import DatabaseManager from '@database/manager';
import {getConfigValue} from '@queries/servers/system';
import {logError, logDebug} from '@utils/log';

const wsMinReconnectRetryTimeMs = 1000; // 1 second
export const wsReconnectionTimeout = 30000; // 30 seconds
const wsReconnectTimeIncrement = 500; // 0.5 seconds
export const wsReconnectionTimeoutErr = new Error('max disconnected time reached');

function toWsUrl(url: string): string {
    return url.replace(/^http(s)?:\/\//, (_, s) => `ws${s ?? ''}://`);
}

export class WebSocketClient extends EventEmitter {
    private readonly serverUrl: string;
    private readonly wsPath: string;
    private authToken: string;
    private wsClient: WebSocketClientInterface | null = null;
    private seqNo = 1;
    private serverSeqNo = 0;
    private connID = '';
    private originalConnID = '';
    private lastDisconnect = 0;
    private reconnectRetryTime = wsMinReconnectRetryTimeMs;
    private closed = false;
    private eventPrefix = `custom_${Calls.PluginId}`;

    constructor(serverUrl: string, wsPath: string, authToken?: string) {
        super();
        this.serverUrl = serverUrl;
        this.wsPath = wsPath;
        this.authToken = authToken || '';
    }

    private async init(isReconnect: boolean) {
        const database = DatabaseManager.serverDatabases[this.serverUrl]?.database;
        if (!database) {
            return;
        }

        // Tear down any existing connection
        if (this.wsClient) {
            try {
                await this.wsClient.invalidate();
            } catch {
                // ignore invalidation errors during reconnect
            }
            this.wsClient = null;
        }

        const websocketURL = await getConfigValue(database, 'WebsocketURL');
        const baseUrl = toWsUrl(websocketURL || this.serverUrl);
        const wsUrl = `${baseUrl}${this.wsPath}?connection_id=${this.connID}&sequence_number=${this.serverSeqNo}`;

        const {client} = await getOrCreateWebSocketClient(wsUrl, {
            headers: {authorization: `Bearer ${this.authToken}`},
        });
        this.wsClient = client;

        if (isReconnect) {
            this.wsClient.onOpen(() => {
                this.lastDisconnect = 0;
                this.reconnectRetryTime = wsMinReconnectRetryTimeMs;

                // Emit 'open' here (before hello) so that connection.ts can send the
                // 'reconnect' message to the server with the previous session's connID
                // as prevConnID. At this point this.connID still holds the previous
                // session ID (it was passed in the URL and has not yet been updated by
                // the incoming hello message).
                this.emit('open', this.originalConnID, this.connID, true);
            });
        }

        this.wsClient.onError((event) => {
            this.emit('error', event);
        });

        this.wsClient.onClose((event) => {
            this.emit('close', event);
            if (!this.closed) {
                this.reconnect();
            }
        });

        this.wsClient.onMessage(({message: raw}) => {
            if (!raw) {
                return;
            }

            // iOS native pre-parses JSON via SwiftyJSON; Android passes raw string.
            let msg: Record<string, any>;
            if (typeof raw === 'string') {
                try {
                    msg = JSON.parse(raw);
                } catch (err) {
                    logError('calls: ws msg parse error', err);
                    return;
                }
            } else if (typeof raw === 'object' && raw !== null) {
                msg = raw as Record<string, any>;
            } else {
                logError('calls: ws msg unexpected type', typeof raw);
                return;
            }

            if (typeof msg.seq === 'number') {
                this.serverSeqNo = msg.seq + 1;
            }

            if (!msg?.event || !msg?.data) {
                return;
            }

            if (msg.event === 'hello') {
                if (msg.data.connection_id !== this.connID) {
                    logDebug('calls: ws new conn id from server');
                    this.connID = msg.data.connection_id;
                    this.serverSeqNo = 0;
                    if (this.originalConnID === '') {
                        logDebug('calls: ws setting original conn id');
                        this.originalConnID = this.connID;
                    }
                }
                if (!isReconnect) {
                    this.emit('open', this.originalConnID, this.connID, false);
                }
                return;
            } else if (!this.connID) {
                logDebug('calls: ws message received while waiting for hello');
                return;
            }

            if (msg.data.connID !== this.connID && msg.data.connID !== this.originalConnID) {
                return;
            }

            if (msg.event === this.eventPrefix + '_join') {
                this.emit('join');
            }

            if (msg.event === this.eventPrefix + '_error') {
                this.emit('error', msg.data);
            }

            if (msg.event === this.eventPrefix + '_signal') {
                this.emit('message', msg.data);
            }
        });

        this.wsClient.open();
    }

    initialize() {
        return this.init(false);
    }

    send(action: string, data?: Object, binary?: boolean) {
        const msg = {
            action: `${this.eventPrefix}_${action}`,
            seq: this.seqNo++,
            data,
        };
        if (this.wsClient && this.wsClient.readyState === WebSocketReadyState.OPEN) {
            if (binary) {
                if (!this.wsClient.sendBinary) {
                    logError('calls: sendBinary not supported by native client');
                    return;
                }
                const encoded = encode(msg);
                const base64 = Buffer.from(encoded).toString('base64');
                this.wsClient.sendBinary!(base64);
            } else {
                this.wsClient.send(JSON.stringify(msg));
            }
        }
    }

    close() {
        this.closed = true;

        // Errors during teardown are intentionally ignored
        this.wsClient?.invalidate().catch(() => { /* ignore */ });
        this.wsClient = null;
        this.seqNo = 1;
        this.serverSeqNo = 0;
        this.connID = '';
        this.originalConnID = '';
    }

    reconnect() {
        const now = Date.now();
        if (this.lastDisconnect === 0) {
            this.lastDisconnect = now;
        }

        if ((now - this.lastDisconnect) >= wsReconnectionTimeout) {
            this.closed = true;
            this.emit('error', wsReconnectionTimeoutErr);
            return;
        }

        setTimeout(() => {
            if (!this.closed) {
                logDebug(`calls: attempting ws reconnection to ${this.serverUrl + this.wsPath}`);
                this.init(true).catch((err) => logError('calls: ws reconnection init failed', err));
            }
        }, this.reconnectRetryTime);

        this.reconnectRetryTime += wsReconnectTimeIncrement;
    }

    state() {
        if (this.closed || !this.wsClient) {
            return WebSocketReadyState.CLOSED;
        }
        return this.wsClient.readyState;
    }

    get sessionID() {
        return this.originalConnID;
    }
}
