// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {EventEmitter} from 'events';

import Calls from '@constants/calls';
import {encode} from '@msgpack/msgpack/dist';

export default class WebSocketClient extends EventEmitter {
    private ws: WebSocket | null;
    private seqNo = 1;
    private connID = '';
    private eventPrefix = `custom_${Calls.PluginId}`;

    constructor(connURL: string, authToken: string) {
        super();

        this.ws = new WebSocket(connURL, [], {headers: {authorization: `Bearer ${authToken}`}});

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
                console.log(err); // eslint-disable-line no-console
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
        this.seqNo = 1;
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
