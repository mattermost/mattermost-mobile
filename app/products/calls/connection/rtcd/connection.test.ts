// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {RTCMonitor, RTCPeer, parseRTCStats} from '@mattermost/calls/lib';
import {zlibSync, strToU8} from 'fflate';
import {Platform} from 'react-native';

import {startAudioSession, stopAudioSession} from '@calls/connection/session/audio';
import NetworkManager from '@managers/network_manager';
import {enableFakeTimers, disableFakeTimers} from '@test/timer_helpers';

import {WebSocketClient, wsReconnectionTimeoutErr} from '../websocket_client';

import {newRtcdConnection} from './connection';

jest.mock('../websocket_client');
jest.mock('@mattermost/calls/lib');
jest.mock('@livekit/react-native-webrtc', () => ({
    registerGlobals: jest.fn(),
    mediaDevices: {
        getUserMedia: jest.fn().mockResolvedValue({
            getAudioTracks: () => [{
                id: 'audioTrackId',
                enabled: true,
            }],
            getTracks: () => [{
                id: 'audioTrackId',
                enabled: true,
                stop: jest.fn(),
                release: jest.fn(),
            }],
        }),
    },
}));
jest.mock('@calls/connection/session/foreground_service', () => ({
    foregroundServiceStart: jest.fn(),
    foregroundServiceStop: jest.fn(),
}));
jest.mock('@calls/connection/session/audio', () => ({
    startAudioSession: jest.fn(() => Promise.resolve()),
    stopAudioSession: jest.fn(() => Promise.resolve()),
    createAudioRouteManager: jest.fn(() => mockAudioRouteManager),
}));

const mockAudioRouteManager = {
    setUserSelectedAudioRoute: jest.fn(),
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(),
};

describe('newRtcdConnection', () => {
    const mockClient = {
        getWebSocketUrl: jest.fn(() => 'ws://localhost:8065'),
        getCallsConfig: jest.fn(() => ({
            ICEServers: ['stun:stun.example.com'],
            ICEServersConfigs: [{urls: ['stun:stun.example.com']}],
            AllowEnableCalls: true,
            EnableAV1: true,
        })),
        getVersion: jest.fn(() => ({
            version: '1.7.0',
        })),
        genTURNCredentials: jest.fn(() => Promise.resolve([{
            urls: ['turn:turn.example.com'],
            username: 'user',
            credential: 'pass',
        }])),
    };

    const mockRTCStats = {
        iceStats: {
            succeeded: [
                {
                    id: 'candidatePairA',
                    timestamp: 45,
                    priority: 45,
                    state: 'succeeded',
                    local: {
                        candidateType: 'host',
                        protocol: 'udp',
                        port: 45000,
                    },
                    remote: {
                        candidateType: 'host',
                        protocol: 'udp',
                        port: 8443,
                    },
                },
            ],
            failed: [],
        },
    };

    const mockIntl = {formatMessage: jest.fn((m) => m.defaultMessage)} as unknown as import('react-intl').IntlShape;

    beforeAll(() => {
        // @ts-ignore
        global.navigator = {};

        // @ts-ignore
        NetworkManager.getClient = jest.fn(() => mockClient);

        // @ts-ignore
        RTCPeer.mockImplementation(() => {
            return {
                getStats: jest.fn(),
                on: jest.fn(),
                once: jest.fn(),
                off: jest.fn(),
            };
        });

        // @ts-ignore
        RTCMonitor.mockImplementation(() => {
            return {
                on: jest.fn(),
                clearCache: jest.fn(),
                stop: jest.fn(),
                start: jest.fn(),
            };
        });

        Platform.OS = 'android';
    });

    afterAll(() => {
        // @ts-ignore
        delete global.navigator;

        jest.resetAllMocks();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        enableFakeTimers();
    });

    afterEach(() => {
        disableFakeTimers();
    });

    it('join', async () => {
        const wsSend = jest.fn();

        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        let openHandler;

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                } else if (event === 'open') {
                    openHandler = handler;
                    handler();
                }
            },
            send: wsSend,
        }));

        const connection = await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            true,
            mockIntl,
        );
        expect(connection).toBeDefined();

        expect(wsSend).toHaveBeenCalledWith('join', {av1Support: false, channelID: 'channelID'});

        // reconnect
        expect(openHandler).toBeDefined();
        openHandler!('originalConnID', 'prevConnID', true);
        expect(wsSend).toHaveBeenCalledWith('reconnect', {channelID: 'channelID', originalConnID: 'originalConnID', prevConnID: 'prevConnID'});
    });

    it('should start the audio session and route manager on join, and stop both on disconnect', async () => {
        const wsSend = jest.fn();

        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
            destroy: jest.fn(),
        }));

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: wsSend,
            close: jest.fn(),
        }));

        const connection = await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            false,
            mockIntl,
        );

        expect(startAudioSession).toHaveBeenCalled();
        expect(mockAudioRouteManager.start).toHaveBeenCalled();

        connection.disconnect();

        expect(stopAudioSession).toHaveBeenCalled();
        expect(mockAudioRouteManager.stop).toHaveBeenCalled();
    });

    it('mute/unmute', async () => {
        const mockReplaceTrack = jest.fn();
        const mockAddStream = jest.fn();
        const wsSend = jest.fn();

        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            replaceTrack: mockReplaceTrack,
            addStream: mockAddStream,
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: wsSend,
        }));

        const connection = await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            true,
            mockIntl,
        );

        // First unmute should use addStream
        connection.unmute();
        expect(mockAddStream).toHaveBeenCalledWith(expect.any(Object));
        expect(wsSend).toHaveBeenCalledWith('unmute');

        connection.mute();

        // Subsequent unmute should use replaceTrack
        connection.unmute();
        expect(mockReplaceTrack).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
        expect(wsSend).toHaveBeenCalledWith('unmute');
    });

    it('raise/unraise hand', async () => {
        const wsSend = jest.fn();

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: jest.fn(),
            send: wsSend,
        }));

        const connection = await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            false,
            mockIntl,
        );

        connection.raiseHand();
        expect(wsSend).toHaveBeenCalledWith('raise_hand');

        connection.unraiseHand();
        expect(wsSend).toHaveBeenCalledWith('unraise_hand');
    });

    it('react', async () => {
        const wsSend = jest.fn();

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: jest.fn(),
            send: wsSend,
        }));

        const connection = await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            false,
            mockIntl,
        );

        const emoji = {name: 'thumbsup', unified: '1F44D'};
        connection.sendReaction(emoji);
        expect(wsSend).toHaveBeenCalledWith('react', {
            data: JSON.stringify(emoji),
        });
    });

    it('ws error', async () => {
        const mockCloseCb = jest.fn();
        let errorHandler: (err: Error) => void;

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'error') {
                    errorHandler = handler;
                }
            },
            send: jest.fn(),
            close: jest.fn(),
        }));

        await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            mockCloseCb,
            () => {},
            false,
            mockIntl,
        );

        // @ts-ignore
        errorHandler(new Error('test error'));
        expect(mockCloseCb).not.toHaveBeenCalled();

        // @ts-ignore
        errorHandler(wsReconnectionTimeoutErr);
        expect(mockCloseCb).toHaveBeenCalled();
    });

    it('ws close', async () => {
        let closeHandler: (event: WebSocketCloseEvent) => void;
        const mockCloseCb = jest.fn();

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'close') {
                    closeHandler = handler;
                }
            },
            send: jest.fn(),
        }));

        await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            mockCloseCb,
            () => {},
            false,
            mockIntl,
        );

        // @ts-ignore
        closeHandler({code: 1000, reason: 'normal'});
        expect(mockCloseCb).not.toHaveBeenCalled();
    });

    it('voice track', async () => {
        const getUserMedia = require('@livekit/react-native-webrtc').mediaDevices.getUserMedia;

        const connection = await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            true,
            mockIntl,
        );

        expect(getUserMedia).toHaveBeenCalledWith({
            video: false,
            audio: true,
        });
        expect(getUserMedia).toHaveBeenCalledTimes(1);

        await connection.initializeVoiceTrack();
        expect(getUserMedia).toHaveBeenCalledTimes(1);
    });

    it('rtc peer', async () => {
        const wsSend = jest.fn();
        const wsClose = jest.fn();
        const peerDestroy = jest.fn();
        const peerSignal = jest.fn();

        const handlers: Record<string, any> = {};

        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            on: (event: string, handler: any) => {
                handlers[event] = handler;
            },
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
            destroy: peerDestroy,
            signal: peerSignal,
        }));

        // @ts-ignore
        parseRTCStats.mockImplementation(() => mockRTCStats);

        let wsMsgHandler;

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                } else if (event === 'message') {
                    wsMsgHandler = handler;
                }
            },
            send: wsSend,
            close: wsClose,
        }));

        const connection = await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            true,
            mockIntl,
        );
        expect(connection).toBeDefined();

        await Promise.resolve();

        handlers.candidate({candidate: 'candidate'});
        expect(wsSend).toHaveBeenCalledWith('ice', {data: '{"candidate":"candidate"}'});

        handlers.offer({offer: 'sdp'});
        expect(wsSend).toHaveBeenCalledWith('sdp', {data: zlibSync(strToU8('{"offer":"sdp"}'))}, true);

        expect(wsMsgHandler).toBeDefined();

        wsMsgHandler!({data: '{"type": "answer"}'});
        expect(peerSignal).toHaveBeenCalledWith('{"type": "answer"}');

        wsMsgHandler!({data: '{"type": "offer"}'});
        expect(peerSignal).toHaveBeenCalledWith('{"type": "offer"}');

        wsMsgHandler!({data: '{"type": "candidate"}'});
        expect(peerSignal).toHaveBeenCalledWith('{"type": "candidate"}');

        const mockGetTracks = jest.fn().mockReturnValue([
            {
                id: 'audioTrackId', enabled: true, stop: jest.fn(), release: jest.fn(),
            },
        ]);
        const mockGetVideoTracks = jest.fn().mockReturnValue([]);
        handlers.stream({
            getTracks: mockGetTracks,
            getVideoTracks: mockGetVideoTracks,
        });
        expect(mockGetTracks).toHaveBeenCalled();
        expect(mockGetVideoTracks).toHaveBeenCalled();

        handlers.error(new Error('test error'));
        expect(wsClose).toHaveBeenCalled();
        expect(wsSend).toHaveBeenCalledWith('leave');
        expect(peerDestroy).toHaveBeenCalled();

        handlers.close();
    });

    it('rtc peer close', async () => {
        const wsSend = jest.fn();
        const wsClose = jest.fn();
        const peerDestroy = jest.fn();
        const peerSignal = jest.fn();

        const handlers: Record<string, any> = {};

        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            on: (event: string, handler: any) => {
                handlers[event] = handler;
            },
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
            destroy: peerDestroy,
            signal: peerSignal,
        }));

        // @ts-ignore
        parseRTCStats.mockImplementation(() => mockRTCStats);

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: wsSend,
            close: wsClose,
        }));

        const connection = await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            true,
            mockIntl,
        );
        expect(connection).toBeDefined();

        await Promise.resolve();

        handlers.close();

        expect(wsClose).toHaveBeenCalled();
        expect(wsSend).toHaveBeenCalledWith('leave');
        expect(peerDestroy).toHaveBeenCalled();
    });

    it('collectICEStats', async () => {
        Platform.OS = 'web';

        const wsSend = jest.fn();
        let resolveJoin: () => void;
        const joinPromise = new Promise<void>((resolve) => {
            resolveJoin = resolve;
        });

        const joinHandler = jest.fn(async (event: string, cb: () => void) => {
            if (event === 'join') {
                await cb();
                expect(parseRTCStats).toHaveBeenCalled();
                expect(wsSend).toHaveBeenCalledWith('metric', {
                    metric_name: 'client_ice_candidate_pair',
                    data: JSON.stringify({
                        state: 'succeeded',
                        local: {
                            type: 'host',
                            protocol: 'udp',
                        },
                        remote: {
                            type: 'host',
                            protocol: 'udp',
                        },
                    }),
                },
                );
                resolveJoin();
            }
        });

        // @ts-ignore
        WebSocketClient.mockImplementation(() => {
            return {
                initialize: jest.fn(),
                on: joinHandler,
                send: wsSend,
            };
        });

        // @ts-ignore
        parseRTCStats.mockImplementation(() => mockRTCStats);

        const connection = await newRtcdConnection('http://localhost:8065', 'channelID', () => {}, () => {}, false, mockIntl);
        expect(connection).toBeDefined();
        expect(joinHandler).toHaveBeenCalled();
        await joinPromise;
    });

    it('waitForPeerConnection', async () => {
        // Default mock: ws.on('join') never fires → peer never created →
        // onPeerConnected resolver never called → timeout fires.
        const connection = await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            true,
            mockIntl,
        );
        expect(connection).toBeDefined();

        await Promise.resolve();

        const res = connection.waitForPeerConnection();
        jest.runAllTimers();
        await expect(res).rejects.toEqual(new Error('timed out waiting for peer connection'));
    });

    it('waitForPeerConnection resolves when peer connects', async () => {
        // Capture the 'connect' callback registered by peer.once() inside
        // ws.on('join'). We fire it after waitForPeerConnection has had a
        // chance to set its onPeerConnected resolver.
        let connectCb: (() => void) | null = null;

        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            getStats: jest.fn(),
            on: jest.fn(),
            once: jest.fn().mockImplementation((event: string, cb: () => void) => {
                if (event === 'connect') {
                    connectCb = cb;
                }
            }),
            off: jest.fn(),
            connected: false,
        }));

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: jest.fn(),
            sessionID: 'sessionID',
        }));

        const connection = await newRtcdConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            true,
            mockIntl,
        );
        expect(connection).toBeDefined();
        expect(connectCb).not.toBeNull();

        await Promise.resolve();

        const res = connection.waitForPeerConnection();

        // Now fire the connect event — onPeerConnected is set.
        connectCb!();

        await expect(res).resolves.toBe('sessionID');
    });
});
