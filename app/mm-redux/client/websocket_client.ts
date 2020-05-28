// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
const MAX_WEBSOCKET_FAILS = 7;
const MIN_WEBSOCKET_RETRY_TIME = 3000; // 3 sec

const MAX_WEBSOCKET_RETRY_TIME = 300000; // 5 mins

let Socket: any;

class WebSocketClient {
    conn?: WebSocket;
    connectionUrl: null;
    token: string|null;
    sequence: number;
    connectFailCount: number;
    eventCallback?: Function;
    firstConnectCallback?: Function;
    reconnectCallback?: Function;
    errorCallback?: Function;
    closeCallback?: Function;
    connectingCallback?: Function;
    stop: boolean;
    platform: string;
    connectionTimeout: any;

    constructor() {
        this.connectionUrl = null;
        this.token = null;
        this.sequence = 1;
        this.connectFailCount = 0;
        this.stop = false;
        this.platform = '';
    }

    initialize(token: string|null, opts: any) {
        const defaults = {
            forceConnection: true,
            connectionUrl: this.connectionUrl,
            webSocketConnector: WebSocket,
        };

        const {connectionUrl, forceConnection, webSocketConnector, platform, ...additionalOptions} = Object.assign({}, defaults, opts);

        if (platform) {
            this.platform = platform;
        }

        if (forceConnection) {
            this.stop = false;
        }

        return new Promise((resolve, reject) => {
            if (this.conn) {
                resolve();
                return;
            }

            if (connectionUrl == null) {
                console.log('websocket must have connection url'); //eslint-disable-line no-console
                reject(new Error('websocket must have connection url'));
                return;
            }

            if (this.connectFailCount === 0) {
                console.log('websocket connecting to ' + connectionUrl); //eslint-disable-line no-console
            }

            Socket = webSocketConnector;
            if (this.connectingCallback) {
                this.connectingCallback();
            }

            const regex = /^(?:https?|wss?):(?:\/\/)?[^/]*/;
            const captured = (regex).exec(connectionUrl);

            let origin;
            if (captured) {
                origin = captured[0];

                if (platform === 'android') {
                    // this is done cause for android having the port 80 or 443 will fail the connection
                    // the websocket will append them
                    const split = origin.split(':');
                    const port = split[2];
                    if (port === '80' || port === '443') {
                        origin = `${split[0]}:${split[1]}`;
                    }
                }
            } else {
                // If we're unable to set the origin header, the websocket won't connect, but the URL is likely malformed anyway
                const errorMessage = 'websocket failed to parse origin from ' + connectionUrl;
                console.warn(errorMessage); // eslint-disable-line no-console
                reject(new Error(errorMessage));
                return;
            }

            this.conn = new Socket(connectionUrl, [], {headers: {origin}, ...(additionalOptions || {})});
            this.connectionUrl = connectionUrl;
            this.token = token;

            this.conn!.onopen = () => {
                if (token) {
                    // we check for the platform as a workaround until we fix on the server that further authentications
                    // are ignored
                    this.sendMessage('authentication_challenge', {token});
                }

                if (this.connectFailCount > 0) {
                    console.log('websocket re-established connection'); //eslint-disable-line no-console
                    if (this.reconnectCallback) {
                        this.reconnectCallback();
                    }
                } else if (this.firstConnectCallback) {
                    this.firstConnectCallback();
                }

                this.connectFailCount = 0;
                resolve();
            };

            this.conn!.onclose = () => {
                this.conn = undefined;
                this.sequence = 1;

                if (this.connectFailCount === 0) {
                    console.log('websocket closed'); //eslint-disable-line no-console
                }

                this.connectFailCount++;

                if (this.closeCallback) {
                    this.closeCallback(this.connectFailCount);
                }

                let retryTime = MIN_WEBSOCKET_RETRY_TIME;

                // If we've failed a bunch of connections then start backing off
                if (this.connectFailCount > MAX_WEBSOCKET_FAILS) {
                    retryTime = MIN_WEBSOCKET_RETRY_TIME * this.connectFailCount;
                    if (retryTime > MAX_WEBSOCKET_RETRY_TIME) {
                        retryTime = MAX_WEBSOCKET_RETRY_TIME;
                    }
                }

                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                }

                this.connectionTimeout = setTimeout(
                    () => {
                        if (this.stop) {
                            clearTimeout(this.connectionTimeout);
                            return;
                        }
                        this.initialize(token, opts);
                    },
                    retryTime,
                );
            };

            this.conn!.onerror = (evt) => {
                if (this.connectFailCount <= 1) {
                    console.log('websocket error'); //eslint-disable-line no-console
                    console.log(evt); //eslint-disable-line no-console
                }

                if (this.errorCallback) {
                    this.errorCallback(evt);
                }
            };

            this.conn!.onmessage = (evt) => {
                const msg = JSON.parse(evt.data);
                if (msg.seq_reply) {
                    if (msg.error) {
                        console.warn(msg); //eslint-disable-line no-console
                    }
                } else if (this.eventCallback) {
                    this.eventCallback(msg);
                }
            };
        });
    }

    setConnectingCallback(callback: Function) {
        this.connectingCallback = callback;
    }

    setEventCallback(callback: Function) {
        this.eventCallback = callback;
    }

    setFirstConnectCallback(callback: Function) {
        this.firstConnectCallback = callback;
    }

    setReconnectCallback(callback: Function) {
        this.reconnectCallback = callback;
    }

    setErrorCallback(callback: Function) {
        this.errorCallback = callback;
    }

    setCloseCallback(callback: Function) {
        this.closeCallback = callback;
    }

    close(stop = false) {
        this.stop = stop;
        this.connectFailCount = 0;
        this.sequence = 1;
        if (this.conn && this.conn.readyState === Socket.OPEN) {
            this.conn.onclose = () => {}; //eslint-disable-line @typescript-eslint/no-empty-function
            this.conn.close();
            this.conn = undefined;
            console.log('websocket closed'); //eslint-disable-line no-console
        }
    }

    sendMessage(action: string, data: any) {
        const msg = {
            action,
            seq: this.sequence++,
            data,
        };

        if (this.conn && this.conn.readyState === Socket.OPEN) {
            this.conn.send(JSON.stringify(msg));
        } else if (!this.conn || this.conn.readyState === Socket.CLOSED) {
            this.conn = undefined;
            this.initialize(this.token, {platform: this.platform});
        }
    }

    userTyping(channelId: string, parentId: string) {
        this.sendMessage('user_typing', {
            channel_id: channelId,
            parent_id: parentId,
        });
    }

    getStatuses() {
        this.sendMessage('get_statuses', null);
    }

    getStatusesByIds(userIds: string[]) {
        this.sendMessage('get_statuses_by_ids', {
            user_ids: userIds,
        });
    }
}

export default new WebSocketClient();
