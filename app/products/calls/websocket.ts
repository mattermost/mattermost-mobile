// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {EventEmitter} from 'events';

import Calls from '@constants/calls';
import {encode} from '@msgpack/msgpack/dist';

const wsMinReconnectRetryTimeMs = 1000; // 1 second
const wsReconnectionTimeout = 30000; // 30 seconds
const wsReconnectTimeIncrement = 500; // 0.5 seconds
export const wsReconnectionTimeoutErr = new Error('max disconnected time reached');

export class WebSocketClient extends EventEmitter {
    private ws: WebSocket | null = null;
    private wsURL: string;
    private authToken: string;
    private seqNo = 1;
    private serverSeqNo = 0;
    private connID = '';
    private originalConnID = '';
    private eventPrefix = `custom_${Calls.PluginId}`;
    private lastDisconnect = 0;
    private reconnectRetryTime = wsMinReconnectRetryTimeMs;
    private closed = false;

    constructor(wsURL: string, authToken: string) {
        super();
        this.wsURL = wsURL;
        this.authToken = authToken;
        this.init(false);
    }

    private init(isReconnect: boolean) {
        if (this.closed) {
            return;
        }

        this.ws = new WebSocket(`${this.wsURL}?connection_id=${this.connID}&sequence_number=${this.serverSeqNo}`, [], {headers: {authorization: `Bearer ${this.authToken}`}});

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
                console.log('calls: ws msg parse error', err); // eslint-disable-line no-console
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
