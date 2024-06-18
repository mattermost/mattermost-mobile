// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type ClientHeaders, getOrCreateWebSocketClient, type WebSocketClientInterface, WebSocketReadyState} from '@mattermost/react-native-network-client';
import {Platform} from 'react-native';

import {WebsocketEvents} from '@constants';
import DatabaseManager from '@database/manager';
import {getConfigValue} from '@queries/servers/system';
import {hasReliableWebsocket} from '@utils/config';
import {toMilliseconds} from '@utils/datetime';
import {logError, logInfo, logWarning} from '@utils/log';

const MAX_WEBSOCKET_FAILS = 7;
const WEBSOCKET_TIMEOUT = toMilliseconds({seconds: 30});
const MIN_WEBSOCKET_RETRY_TIME = toMilliseconds({seconds: 3});
const MAX_WEBSOCKET_RETRY_TIME = toMilliseconds({minutes: 5});
const DEFAULT_OPTIONS = {
    forceConnection: true,
};

export default class WebSocketClient {
    private conn?: WebSocketClientInterface;
    private connectionTimeout: NodeJS.Timeout | undefined;
    private connectionId = '';
    private token: string;
    private stop = false;
    private url = '';
    private serverUrl: string;
    private connectFailCount = 0;

    // The first time we connect to a server (on init or login)
    // we do the sync out of the websocket lifecycle.
    // This is used to avoid calling twice to the sync logic.
    private shouldSkipSync = false;

    // responseSequence is the number to track a response sent
    // via the websocket. A response will always have the same sequence number
    // as the request.
    private responseSequence = 1;

    // serverSequence is the incrementing sequence number from the
    // server-sent event stream.
    private serverSequence = 0;

    // Callbacks
    private eventCallback?: Function;
    private firstConnectCallback?: () => void;
    private missedEventsCallback?: () => void;
    private reconnectCallback?: () => void;
    private reliableReconnectCallback?: () => void;
    private errorCallback?: Function;
    private closeCallback?: (connectFailCount: number) => void;
    private connectingCallback?: () => void;

    constructor(serverUrl: string, token: string) {
        this.token = token;
        this.serverUrl = serverUrl;
    }

    public async initialize(opts = {}, shouldSkipSync = false) {
        const {forceConnection} = Object.assign({}, DEFAULT_OPTIONS, opts);

        if (forceConnection) {
            this.stop = false;
        }

        if (this.conn && this.conn.readyState !== WebSocketReadyState.CLOSED) {
            return;
        }

        const database = DatabaseManager.serverDatabases[this.serverUrl]?.database;
        if (!database) {
            return;
        }

        const [websocketUrl, version, reliableWebsocketConfig] = await Promise.all([
            getConfigValue(database, 'WebsocketURL'),
            getConfigValue(database, 'Version'),
            getConfigValue(database, 'EnableReliableWebSockets'),
        ]);
        const connectionUrl = (websocketUrl || this.serverUrl) + '/api/v4/websocket';

        if (this.connectingCallback) {
            this.connectingCallback();
        }

        const regex = /^(?:https?|wss?):(?:\/\/)?[^/]*/;
        const captured = (regex).exec(connectionUrl);

        let origin;
        if (captured) {
            origin = captured[0];
        } else {
            // If we're unable to set the origin header, the websocket won't connect, but the URL is likely malformed anyway
            const errorMessage = 'websocket failed to parse origin from ' + connectionUrl;
            logWarning(errorMessage);
            return;
        }

        this.url = connectionUrl;

        const reliableWebSockets = hasReliableWebsocket(version, reliableWebsocketConfig);
        if (reliableWebSockets) {
            // Add connection id, and last_sequence_number to the query param.
            // We cannot also send it as part of the auth_challenge, because the session cookie is already sent with the request.
            this.url = `${connectionUrl}?connection_id=${this.connectionId}&sequence_number=${this.serverSequence}`;
        }

        // Manually changing protocol since getOrCreateWebsocketClient does not accept http/s
        if (this.url.startsWith('https:')) {
            this.url = 'wss:' + this.url.substring('https:'.length);
        }

        if (this.url.startsWith('http:')) {
            this.url = 'ws:' + this.url.substring('http:'.length);
        }

        if (this.connectFailCount === 0) {
            logInfo('websocket connecting to ' + this.url);
        }

        this.shouldSkipSync = shouldSkipSync;

        try {
            const headers: ClientHeaders = {origin};
            if (Platform.OS === 'android') {
                // Required to properly handled the reliableWebsocket reconnection
                // iOS is using he underlying cookieJar
                headers.Authorization = `Bearer ${this.token}`;
            }
            const {client} = await getOrCreateWebSocketClient(this.url, {headers, timeoutInterval: WEBSOCKET_TIMEOUT});

            // Check again if the client is the same, to avoid race conditions
            if (this.conn === client) {
                // In case turning on/off Wi-fi on Samsung devices
                // the websocket will call onClose then onError then initialize again with readyState CLOSED, we need to open it again
                if (this.conn.readyState === WebSocketReadyState.CLOSED) {
                    clearTimeout(this.connectionTimeout);
                    this.conn.open();
                }
                return;
            }
            this.conn = client;
        } catch (error) {
            return;
        }

        this.conn!.onOpen(() => {
            clearTimeout(this.connectionTimeout);

            // No need to reset sequence number here.
            if (!reliableWebSockets) {
                this.serverSequence = 0;
            }

            if (this.token) {
                // we check for the platform as a workaround until we fix on the server that further authentications
                // are ignored
                this.sendMessage('authentication_challenge', {token: this.token});
            }

            if (this.shouldSkipSync) {
                logInfo('websocket connected to', this.url);
                this.firstConnectCallback?.();
            } else {
                logInfo('websocket re-established connection to', this.url);
                if (!reliableWebSockets && this.reconnectCallback) {
                    this.reconnectCallback();
                } else if (reliableWebSockets) {
                    // If a sync is needed, it is handled when receiving the HELLO websocket message
                    this.reliableReconnectCallback?.();
                    if (this.serverSequence && this.missedEventsCallback) {
                        this.missedEventsCallback();
                    }
                }
            }

            this.connectFailCount = 0;
        });

        this.conn!.onClose(() => {
            clearTimeout(this.connectionTimeout);
            this.conn = undefined;
            this.responseSequence = 1;

            // We skip the sync on first connect, since we are syncing along
            // the init logic. If the connection closes at any point after that,
            // we don't want to skip the sync. If we keep the same connection and
            // reliable websockets are enabled this won't trigger a new sync.
            this.shouldSkipSync = false;

            if (this.connectFailCount === 0) {
                logInfo('websocket closed', this.url);
            }

            this.connectFailCount++;

            if (this.closeCallback) {
                this.closeCallback(this.connectFailCount);
            }

            if (this.stop) {
                return;
            }

            let retryTime = MIN_WEBSOCKET_RETRY_TIME;

            // If we've failed a bunch of connections then start backing off
            if (this.connectFailCount > MAX_WEBSOCKET_FAILS) {
                retryTime = Math.min(MIN_WEBSOCKET_RETRY_TIME * this.connectFailCount, MAX_WEBSOCKET_RETRY_TIME);
            }

            this.connectionTimeout = setTimeout(
                () => {
                    if (this.stop) {
                        clearTimeout(this.connectionTimeout);
                        return;
                    }
                    this.initialize(opts);
                },
                retryTime,
            );
        });

        this.conn!.onError((evt: any) => {
            if (evt.url === this.url) {
                if (this.connectFailCount <= 1) {
                    logError('websocket error', this.url);
                    logError('WEBSOCKET ERROR EVENT', evt);
                }

                if (this.errorCallback) {
                    this.errorCallback(evt);
                }
            }
        });

        this.conn!.onMessage((evt: any) => {
            const msg = evt.message;

            // This indicates a reply to a websocket request.
            // We ignore sequence number validation of message responses
            // and only focus on the purely server side event stream.
            if (msg.seq_reply) {
                if (msg.error) {
                    logWarning(msg);
                }
            } else if (this.eventCallback) {
                if (reliableWebSockets) {
                    // We check the hello packet, which is always the first packet in a stream.
                    if (msg.event === WebsocketEvents.HELLO) {
                        logInfo(this.url, 'got connection id ', msg.data.connection_id);

                        // If we already have a connectionId present, and server sends a different one,
                        // that means it's either a long timeout, or server restart, or sequence number is not found.
                        // If the server is not available the first time we try to connect, we won't have a connection id
                        // but still we need to sync.
                        // Then we do the sync calls, and reset sequence number to 0.
                        if (this.connectionId !== msg.data.connection_id) {
                            if (this.connectionId) {
                                logInfo(this.url, 'got a new connection due to long timeout, or server restart, or sequence number is not found');
                            } else {
                                logInfo(this.url, 'got the expected new connection id');
                            }
                            if (!this.shouldSkipSync) {
                                this.reconnectCallback?.();
                            }
                            this.serverSequence = 0;
                        }

                        // If it's a fresh connection, we have to set the connectionId regardless.
                        // And if it's an existing connection, setting it again is harmless, and keeps the code simple.
                        this.connectionId = msg.data.connection_id;
                    }

                    // Now we check for sequence number, and if it does not match,
                    // we just disconnect and reconnect.
                    if (msg.seq !== this.serverSequence) {
                        logInfo(this.url, 'missed websocket event, act_seq=' + msg.seq + ' exp_seq=' + this.serverSequence);
                        this.connectionId = ''; // There was some problem with the sequence number, so we reset the connection
                        this.close(false); // Will auto-reconnect after MIN_WEBSOCKET_RETRY_TIME.
                        return;
                    }
                } else if (msg.seq !== this.serverSequence) {
                    logInfo(this.url, 'missed websocket event, act_seq=' + msg.seq + ' exp_seq=' + this.serverSequence);
                    this.reconnectCallback?.();
                }

                this.serverSequence = msg.seq + 1;
                this.eventCallback(msg);
            }
        });

        this.conn.open();
    }

    public setConnectingCallback(callback: () => void) {
        this.connectingCallback = callback;
    }

    public setEventCallback(callback: Function) {
        this.eventCallback = callback;
    }

    public setFirstConnectCallback(callback: () => void) {
        this.firstConnectCallback = callback;
    }

    public setMissedEventsCallback(callback: () => void) {
        this.missedEventsCallback = callback;
    }

    public setReconnectCallback(callback: () => void) {
        this.reconnectCallback = callback;
    }

    public setReliableReconnectCallback(callback: () => void) {
        this.reliableReconnectCallback = callback;
    }

    public setErrorCallback(callback: Function) {
        this.errorCallback = callback;
    }

    public setCloseCallback(callback: (connectFailCount: number) => void) {
        this.closeCallback = callback;
    }

    public close(stop = false) {
        this.stop = stop;
        this.connectFailCount = 0;
        this.responseSequence = 1;
        clearTimeout(this.connectionTimeout);
        this.conn?.close();
    }

    public invalidate() {
        clearTimeout(this.connectionTimeout);
        this.conn?.invalidate();
        this.conn = undefined;
    }

    private sendMessage(action: string, data: any) {
        const msg = {
            action,
            seq: this.responseSequence++,
            data,
        };

        if (this.conn && this.conn.readyState === WebSocketReadyState.OPEN) {
            this.conn.send(JSON.stringify(msg));
        } else if (!this.conn || this.conn.readyState === WebSocketReadyState.CLOSED) {
            this.conn = undefined;
            this.initialize(this.token);
        }
    }

    public sendUserTypingEvent(channelId: string, parentId?: string) {
        this.sendMessage('user_typing', {
            channel_id: channelId,
            parent_id: parentId,
        });
    }

    public isConnected(): boolean {
        return this.conn?.readyState === WebSocketReadyState.OPEN;
    }
}
