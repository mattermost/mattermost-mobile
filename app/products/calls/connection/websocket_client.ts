// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {EventEmitter} from 'events';

import {encode} from '@msgpack/msgpack/dist';

import Calls from '@constants/calls';
import DatabaseManager from '@database/manager';
import {getCommonSystemValues} from '@queries/servers/system';
import {logError} from '@utils/log';

export default class WebSocketClient extends EventEmitter {
    private readonly serverUrl: string;
    private readonly wsPath: string;
    private ws: WebSocket | null = null;
    private seqNo = 0;
    private connID = '';
    private eventPrefix = `custom_${Calls.PluginId}`;

    constructor(serverUrl: string, wsPath: string) {
        super();
        this.serverUrl = serverUrl;
        this.wsPath = wsPath;
    }

    async initialize() {
        const database = DatabaseManager.serverDatabases[this.serverUrl]?.database;
        if (!database) {
            return;
        }

        const system = await getCommonSystemValues(database);
        const connectionUrl = (system.config.WebsocketURL || this.serverUrl) + this.wsPath;

        this.ws = new WebSocket(connectionUrl);

        this.ws.onerror = (err) => {
            this.emit('error', err);
            this.ws = null;
            this.close();
        };

        this.ws.onclose = () => {
            this.ws = null;
            this.close();
        };

        this.ws.onmessage = ({data}) => {
            if (!data) {
                return;
            }
            let msg;
            try {
                msg = JSON.parse(data);
            } catch (err) {
                logError(err);
            }

            if (!msg || !msg.event || !msg.data) {
                return;
            }

            if (msg.event === 'hello') {
                this.connID = msg.data.connection_id;
                this.emit('open');
                return;
            } else if (!this.connID) {
                return;
            }

            if (msg.data.connID !== this.connID) {
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
            this.ws.close();
            this.ws = null;
        }
        this.seqNo = 0;
        this.connID = '';
        this.emit('close');
    }

    state() {
        if (!this.ws) {
            return WebSocket.CLOSED;
        }
        return this.ws.readyState;
    }
}
