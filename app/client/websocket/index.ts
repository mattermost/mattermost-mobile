// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {WebsocketEvents} from '@constants';
import {getConfig} from '@mm-redux/selectors/entities/general';
import Store from '@store/store';

const MAX_WEBSOCKET_FAILS = 7;
const MIN_WEBSOCKET_RETRY_TIME = 3000; // 3 sec

const MAX_WEBSOCKET_RETRY_TIME = 300000; // 5 mins

class WebSocketClient {
    conn?: WebSocket;
    connectionUrl: string;
    connectionTimeout: any;
    connectionId: string | null;
    token: string|null;

    // responseSequence is the number to track a response sent
    // via the websocket. A response will always have the same sequence number
    // as the request.
    responseSequence: number;

    // serverSequence is the incrementing sequence number from the
    // server-sent event stream.
    serverSequence: number;
    connectFailCount: number;
    eventCallback?: Function;
    firstConnectCallback?: Function;
    missedEventsCallback?: Function;
    reconnectCallback?: Function;
    errorCallback?: Function;
    closeCallback?: Function;
    connectingCallback?: Function;
    stop: boolean;

    constructor() {
        this.connectionUrl = '';
        this.connectionId = '';
        this.token = null;
        this.responseSequence = 1;
        this.serverSequence = 0;
        this.connectFailCount = 0;
        this.stop = false;
    }

    initialize(token: string|null, opts = {}) {
        const defaults = {
            forceConnection: true,
            connectionUrl: this.connectionUrl,
        };

        const {connectionUrl, forceConnection, ...additionalOptions} = Object.assign({}, defaults, opts);

        if (forceConnection) {
            this.stop = false;
        }

        return new Promise((resolve, reject) => {
            if (this.conn) {
                resolve(null);
                return;
            }

            if (connectionUrl == null) {
                console.log('websocket must have connection url'); //eslint-disable-line no-console
                reject(new Error('websocket must have connection url'));
                return;
            }

            if (this.connectingCallback) {
                this.connectingCallback();
            }

            const regex = /^(?:https?|wss?):(?:\/\/)?[^/]*/;
            const captured = (regex).exec(connectionUrl);

            let origin;
            if (captured) {
                origin = captured[0];

                if (Platform.OS === 'android') {
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

            let url = connectionUrl;
            const config = getConfig(Store.redux?.getState());
            const reliableWebSockets = config?.EnableReliableWebSockets === 'true';

            if (reliableWebSockets) {
                // Add connection id, and last_sequence_number to the query param.
                // We cannot also send it as part of the auth_challenge, because the session cookie is already sent with the request.
                url = `${connectionUrl}?connection_id=${this.connectionId}&sequence_number=${this.serverSequence}`;
            }

            if (this.connectFailCount === 0) {
                console.log('websocket connecting to ' + url); //eslint-disable-line no-console
            }

            this.conn = new WebSocket(url, [], {headers: {origin}, ...(additionalOptions || {})});
            this.connectionUrl = connectionUrl;
            this.token = token;

            this.conn!.onopen = () => {
                // No need to reset sequence number here.
                if (!reliableWebSockets) {
                    this.serverSequence = 0;
                }

                if (token) {
                    // we check for the platform as a workaround until we fix on the server that further authentications
                    // are ignored
                    this.sendMessage('authentication_challenge', {token});
                }

                if (this.connectFailCount > 0) {
                    console.log('websocket re-established connection'); //eslint-disable-line no-console
                    if (!reliableWebSockets && this.reconnectCallback) {
                        this.reconnectCallback();
                    } else if (reliableWebSockets && this.serverSequence && this.missedEventsCallback) {
                        this.missedEventsCallback();
                    }
                } else if (this.firstConnectCallback) {
                    this.firstConnectCallback();
                }

                this.connectFailCount = 0;
                resolve(null);
            };

            this.conn!.onclose = () => {
                this.conn = undefined;
                this.responseSequence = 1;

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

            this.conn!.onerror = (evt: any) => {
                if (this.connectFailCount <= 1) {
                    console.log('websocket error'); //eslint-disable-line no-console
                    console.log(evt); //eslint-disable-line no-console
                }

                if (this.errorCallback) {
                    this.errorCallback(evt);
                }
            };

            this.conn!.onmessage = (evt: any) => {
                const msg = JSON.parse(evt.data);

                // This indicates a reply to a websocket request.
                // We ignore sequence number validation of message responses
                // and only focus on the purely server side event stream.
                if (msg.seq_reply) {
                    if (msg.error) {
                        console.warn(msg); //eslint-disable-line no-console
                    }
                } else if (this.eventCallback) {
                    if (reliableWebSockets) {
                        // We check the hello packet, which is always the first packet in a stream.
                        if (msg.event === WebsocketEvents.HELLO && this.reconnectCallback) {
                            //eslint-disable-next-line no-console
                            console.log('got connection id ', msg.data.connection_id);

                            // If we already have a connectionId present, and server sends a different one,
                            // that means it's either a long timeout, or server restart, or sequence number is not found.
                            // Then we do the sync calls, and reset sequence number to 0.
                            if (this.connectionId !== '' && this.connectionId !== msg.data.connection_id) {
                                //eslint-disable-next-line no-console
                                console.log('long timeout, or server restart, or sequence number is not found.');
                                this.reconnectCallback();
                                this.serverSequence = 0;
                            }

                            // If it's a fresh connection, we have to set the connectionId regardless.
                            // And if it's an existing connection, setting it again is harmless, and keeps the code simple.
                            this.connectionId = msg.data.connection_id;
                        }

                        // Now we check for sequence number, and if it does not match,
                        // we just disconnect and reconnect.
                        if (msg.seq !== this.serverSequence) {
                            // eslint-disable-next-line no-console
                            console.log('missed websocket event, act_seq=' + msg.seq + ' exp_seq=' + this.serverSequence);

                            // We are not calling this.close() because we need to auto-restart.
                            this.connectFailCount = 0;
                            this.responseSequence = 1;
                            this.conn?.close(); // Will auto-reconnect after MIN_WEBSOCKET_RETRY_TIME.
                            return;
                        }
                    } else if (msg.seq !== this.serverSequence && this.reconnectCallback) {
                        // eslint-disable-next-line no-console
                        console.log('missed websocket event, act_seq=' + msg.seq + ' exp_seq=' + this.serverSequence);
                        this.reconnectCallback();
                    }

                    this.serverSequence = msg.seq + 1;
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

    setMissedEventsCallback(callback: Function) {
        this.missedEventsCallback = callback;
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
        this.responseSequence = 1;

        if (this.conn && this.conn.readyState === WebSocket.OPEN) {
            this.conn.close();
        }
    }

    sendMessage(action: string, data: any) {
        const msg = {
            action,
            seq: this.responseSequence++,
            data,
        };

        if (this.conn && this.conn.readyState === WebSocket.OPEN) {
            this.conn.send(JSON.stringify(msg));
        } else if (!this.conn || this.conn.readyState === WebSocket.CLOSED) {
            this.conn = undefined;
            this.initialize(this.token);
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
