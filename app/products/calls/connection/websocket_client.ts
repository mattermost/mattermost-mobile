// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {EventEmitter} from 'events';

import {encode} from '@msgpack/msgpack/dist';

import Calls from '@constants/calls';
import DatabaseManager from '@database/manager';
import {getCommonSystemValues} from '@queries/servers/system';
import {logError} from '@utils/log';

const wsMinReconnectRetryTimeMs = 1000; // 1 second
const wsReconnectionTimeout = 30000; // 30 seconds
const wsReconnectTimeIncrement = 500; // 0.5 seconds
export const wsReconnectionTimeoutErr = new Error('max disconnected time reached');

export class WebSocketClient extends EventEmitter {
    private readonly serverUrl: string;
    private readonly wsPath: string;
    private authToken: string;
    private ws: WebSocket | null = null;
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

        const system = await getCommonSystemValues(database);
        const connectionUrl = (system.config.WebsocketURL || this.serverUrl) + this.wsPath;

        this.ws = new WebSocket(`${connectionUrl}?connection_id=${this.connID}&sequence_number=${this.serverSeqNo}`, [], {headers: {authorization: `Bearer ${this.authToken}`}});

        if (isReconnect) {
            this.ws.onopen = () => {
                this.lastDisconnect = 0;
                this.reconnectRetryTime = wsMinReconnectRetryTimeMs;
                this.emit('open', this.originalConnID, this.connID, true);
            };
        }

        this.ws.onerror = (err) => {
            this.emit('error', err);
        };

        this.ws.onclose = () => {
            this.ws = null;
            if (!this.closed) {
                this.close();
            }
        };

        this.ws.onmessage = ({data}) => {
            if (!data) {
                return;
            }
            let msg;
            try {
                msg = JSON.parse(data);
            } catch (err) {
                logError('calls: ws msg parse error', err);
                return;
            }

            if (msg) {
                this.serverSeqNo = msg.seq + 1;
            }

            if (!msg || !msg.event || !msg.data) {
                return;
            }

            if (msg.event === 'hello') {
                if (msg.data.connection_id !== this.connID) {
                    this.connID = msg.data.connection_id;
                    this.serverSeqNo = 0;
                    if (this.originalConnID === '') {
                        this.originalConnID = this.connID;
                    }
                }
                if (!isReconnect) {
                    this.emit('open', this.originalConnID, this.connID, false);
                }
                return;
            } else if (!this.connID) {
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
        };
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
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            if (binary) {
                this.ws.send(encode(msg));
            } else {
                this.ws.send(JSON.stringify(msg));
            }
        }
    }

    close() {
        if (this.ws) {
            this.closed = true;
            this.ws.close();
            this.ws = null;
            this.seqNo = 1;
            this.serverSeqNo = 0;
            this.connID = '';
            this.originalConnID = '';
        } else {
            this.emit('close');

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
                if (!this.ws && !this.closed) {
                    this.init(true);
                }
            }, this.reconnectRetryTime);

            this.reconnectRetryTime += wsReconnectTimeIncrement;
        }
    }

    state() {
        if (!this.ws) {
            return WebSocket.CLOSED;
        }
        return this.ws.readyState;
    }
}
