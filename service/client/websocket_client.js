// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

const MAX_WEBSOCKET_FAILS = 7;
const MIN_WEBSOCKET_RETRY_TIME = 3000; // 3 sec
const MAX_WEBSOCKET_RETRY_TIME = 300000; // 5 mins

/* eslint-disable global-require, no-process-env */

let Socket;
if (process.env.NODE_ENV === 'test') {
    Socket = require('ws');
} else {
    Socket = WebSocket;
}

/* eslint-enable global-require, no-process-env */

class WebSocketClient {
    constructor() {
        this.conn = null;
        this.connectionUrl = null;
        this.sequence = 1;
        this.connectFailCount = 0;
        this.eventCallback = null;
        this.firstConnectCallback = null;
        this.reconnectCallback = null;
        this.errorCallback = null;
        this.closeCallback = null;
        this.dispatch = null;
        this.getState = null;
    }

    initialize(connectionUrl = this.connectionUrl, token, dispatch, getState) {
        return new Promise((resolve, reject) => {
            if (this.conn) {
                resolve();
                return;
            }

            if (connectionUrl == null) {
                console.log('websocket must have connection url'); //eslint-disable-line no-console
                reject('websocket must have connection url');
                return;
            }

            if (!dispatch) {
                console.log('websocket must have a dispatch'); //eslint-disable-line no-console
                reject('websocket must have a dispatch');
                return;
            }

            if (this.connectFailCount === 0) {
                console.log('websocket connecting to ' + connectionUrl); //eslint-disable-line no-console
            }

            this.conn = new Socket(connectionUrl);
            this.connectionUrl = connectionUrl;
            this.dispatch = dispatch;
            this.getState = getState;

            this.conn.onopen = () => {
                if (token) {
                    this.sendMessage('authentication_challenge', {token});
                }

                if (this.connectFailCount > 0) {
                    console.log('websocket re-established connection'); //eslint-disable-line no-console
                    if (this.reconnectCallback) {
                        this.reconnectCallback(this.dispatch, this.getState);
                    }
                } else if (this.firstConnectCallback) {
                    this.firstConnectCallback(this.dispatch, this.getState);
                    resolve();
                }

                this.connectFailCount = 0;
            };

            this.conn.onclose = () => {
                this.conn = null;
                this.sequence = 1;

                if (this.connectFailCount === 0) {
                    console.log('websocket closed'); //eslint-disable-line no-console
                }

                this.connectFailCount++;

                if (this.closeCallback) {
                    this.closeCallback(this.connectFailCount, this.dispatch, this.getState);
                }

                let retryTime = MIN_WEBSOCKET_RETRY_TIME;

                // If we've failed a bunch of connections then start backing off
                if (this.connectFailCount > MAX_WEBSOCKET_FAILS) {
                    retryTime = MIN_WEBSOCKET_RETRY_TIME * this.connectFailCount * this.connectFailCount;
                    if (retryTime > MAX_WEBSOCKET_RETRY_TIME) {
                        retryTime = MAX_WEBSOCKET_RETRY_TIME;
                    }
                }

                setTimeout(
                    () => {
                        this.initialize(connectionUrl, token);
                    },
                    retryTime
                );
            };

            this.conn.onerror = (evt) => {
                if (this.connectFailCount <= 1) {
                    console.log('websocket error'); //eslint-disable-line no-console
                    console.log(evt); //eslint-disable-line no-console
                }

                if (this.errorCallback) {
                    this.errorCallback(evt, this.dispatch, this.getState);
                }
            };

            this.conn.onmessage = (evt) => {
                const msg = JSON.parse(evt.data);
                if (msg.seq_reply) {
                    if (msg.error) {
                        console.log(msg); //eslint-disable-line no-console
                    }
                } else if (this.eventCallback) {
                    this.eventCallback(msg, this.dispatch, this.getState);
                }
            };
        });
    }

    setEventCallback(callback) {
        this.eventCallback = callback;
    }

    setFirstConnectCallback(callback) {
        this.firstConnectCallback = callback;
    }

    setReconnectCallback(callback) {
        this.reconnectCallback = callback;
    }

    setErrorCallback(callback) {
        this.errorCallback = callback;
    }

    setCloseCallback(callback) {
        this.closeCallback = callback;
    }

    close() {
        this.connectFailCount = 0;
        this.sequence = 1;
        if (this.conn && this.conn.readyState === Socket.OPEN) {
            this.conn.onclose = () => {}; //eslint-disable-line no-empty-function
            this.conn.close();
            this.conn = null;
            console.log('websocket closed'); //eslint-disable-line no-console
        }
    }

    sendMessage(action, data) {
        const msg = {
            action,
            seq: this.sequence++,
            data
        };

        if (this.conn && this.conn.readyState === Socket.OPEN) {
            this.conn.send(JSON.stringify(msg));
        } else if (!this.conn || this.conn.readyState === Socket.CLOSED) {
            this.conn = null;
            this.initialize();
        }
    }

    userTyping(channelId, parentId) {
        this.sendMessage('user_typing', {
            channel_id: channelId,
            parent_id: parentId
        });
    }

    getStatuses() {
        this.sendMessage('get_statuses', null);
    }

    getStatusesByIds(userIds) {
        this.sendMessage('get_statuses_by_ids', {
            user_ids: userIds
        });
    }
}

export default new WebSocketClient();
