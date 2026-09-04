// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {RTCMonitor, RTCPeer, parseRTCStats} from '@mattermost/calls/lib';
import CallsNative, {type AudioRoute} from '@mattermost/calls-native';
import {zlibSync, strToU8} from 'fflate';
import {Platform} from 'react-native';
import {mediaDevices} from 'react-native-webrtc';

import {setMyVideoURL, setVideoURL} from '@calls/state';
import NetworkManager from '@managers/network_manager';
import {enableFakeTimers, disableFakeTimers} from '@test/timer_helpers';

import {newConnection} from './connection';
import {WebSocketClient, wsReconnectionTimeoutErr} from './websocket_client';

jest.mock('./websocket_client');
jest.mock('@mattermost/calls/lib');
jest.mock('react-native-webrtc', () => ({
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
jest.mock('@calls/connection/foreground_service', () => ({
    foregroundServiceStart: jest.fn(),
    foregroundServiceStop: jest.fn(),
}));
jest.mock('@calls/state', () => ({
    setAudioDeviceInfo: jest.fn(),
    processMeanOpinionScore: jest.fn(),
    setVideoURL: jest.fn(),
    setMyVideoURL: jest.fn(),
}));

describe('newConnection', () => {
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

        const connection = await newConnection(
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

    it('should call startAudioSession when connecting', async () => {

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: jest.fn(),
            send: jest.fn(),
        }));

        await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            false,
            mockIntl,
        );

        expect(CallsNative.startAudioSession).toHaveBeenCalled();
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

        const connection = await newConnection(
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

        const connection = await newConnection(
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

        const connection = await newConnection(
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

        await newConnection(
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

        await newConnection(
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
        const getUserMedia = require('react-native-webrtc').mediaDevices.getUserMedia;

        const connection = await newConnection(
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

        const connection = await newConnection(
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

        const connection = await newConnection(
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

        const connection = await newConnection('http://localhost:8065', 'channelID', () => {}, () => {}, false, mockIntl);
        expect(connection).toBeDefined();
        expect(joinHandler).toHaveBeenCalled();
        await joinPromise;
    });

    it('waitForPeerConnection', async () => {
        // Default mock: ws.on('join') never fires → peer never created →
        // onPeerConnected resolver never called → timeout fires.
        const connection = await newConnection(
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

        const connection = await newConnection(
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

    // Helper: connect (triggering the join handler) and return the connection +
    // registered onAudioRouteChanged listener.
    const connectAndGetRouteListener = async (initialRoute?: Partial<AudioRoute>) => {
        (CallsNative.getAudioRoute as jest.Mock).mockResolvedValueOnce({
            selectedAudioDevice: 'EARPIECE',
            availableAudioDeviceList: ['EARPIECE', 'SPEAKER_PHONE'],
            ...initialRoute,
        });

        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: () => void) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: jest.fn(),
        }));

        const conn = await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            false,
            mockIntl,
        );

        const calls = (CallsNative.onAudioRouteChanged as jest.Mock).mock.calls;
        const listener = calls[calls.length - 1]?.[0] as (route: AudioRoute) => void;
        return {conn, listener};
    };

    describe('audio routing', () => {
        it('should select Bluetooth over WiredHeadset and Earpiece (highest priority)', async () => {
            const {listener} = await connectAndGetRouteListener();
            jest.clearAllMocks();

            listener({
                selectedAudioDevice: 'EARPIECE',
                availableAudioDeviceList: ['SPEAKER_PHONE', 'EARPIECE', 'WIRED_HEADSET', 'BLUETOOTH'],
            });

            expect(CallsNative.setAudioRoute).toHaveBeenCalledWith('BLUETOOTH');
        });

        it('should select WiredHeadset over Earpiece when Bluetooth is not available', async () => {
            const {listener} = await connectAndGetRouteListener();
            jest.clearAllMocks();

            listener({
                selectedAudioDevice: 'EARPIECE',
                availableAudioDeviceList: ['SPEAKER_PHONE', 'EARPIECE', 'WIRED_HEADSET'],
            });

            expect(CallsNative.setAudioRoute).toHaveBeenCalledWith('WIRED_HEADSET');
        });

        it('should use the initial route from getAudioRoute on join', async () => {
            await connectAndGetRouteListener({
                selectedAudioDevice: 'BLUETOOTH',
                availableAudioDeviceList: ['BLUETOOTH', 'EARPIECE', 'SPEAKER_PHONE'],
            });

            expect(CallsNative.getAudioRoute).toHaveBeenCalled();
            expect(CallsNative.setAudioRoute).toHaveBeenCalledWith('BLUETOOTH');
        });

        it('should not re-route when user-pinned device is still available', async () => {
            const {conn, listener} = await connectAndGetRouteListener();

            conn.setUserSelectedAudioRoute('SPEAKER_PHONE');
            jest.clearAllMocks();

            listener({
                selectedAudioDevice: 'SPEAKER_PHONE',
                availableAudioDeviceList: ['EARPIECE', 'SPEAKER_PHONE'],
            });

            expect(CallsNative.setAudioRoute).not.toHaveBeenCalled();
        });

        it('should clear user pin and auto-route when pinned device disconnects', async () => {
            const {conn, listener} = await connectAndGetRouteListener();

            conn.setUserSelectedAudioRoute('BLUETOOTH');
            jest.clearAllMocks();

            listener({
                selectedAudioDevice: 'EARPIECE',
                availableAudioDeviceList: ['EARPIECE', 'SPEAKER_PHONE'],
            });

            expect(CallsNative.setAudioRoute).toHaveBeenCalledWith('EARPIECE');
        });
    });

    it('routes inbound tracks by track type', async () => {
        const setScreenShareURL = jest.fn();
        let streamHandler: any;

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            on: (event: string, handler: any) => {
                if (event === 'stream') {
                    streamHandler = handler;
                }
            },
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        // eslint-disable-next-line
        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: jest.fn(),
        }));

        await newConnection('http://localhost:8065', 'channelID', () => {}, setScreenShareURL, true, mockIntl);

        const videoStream = {
            id: 'streamA',
            toURL: () => 'url://camera',
            getTracks: () => [{id: 'trackA', kind: 'video'}],
            getVideoTracks: () => [{id: 'trackA', kind: 'video'}],
        };
        streamHandler(videoStream, {type: 'video', sender_id: 'sessionA'});

        expect(setVideoURL).toHaveBeenCalledWith('sessionA', 'url://camera');
        expect(setScreenShareURL).not.toHaveBeenCalled();

        const screenStream = {
            id: 'streamB',
            toURL: () => 'url://screen',
            getTracks: () => [{id: 'trackB', kind: 'video'}],
            getVideoTracks: () => [{id: 'trackB', kind: 'video'}],
        };
        streamHandler(screenStream, {type: 'screen', sender_id: 'sessionB'});

        expect(setScreenShareURL).toHaveBeenCalledWith('url://screen');
    });

    it('treats a stream with no track info as a screen share', async () => {
        const setScreenShareURL = jest.fn();
        let streamHandler: any;

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            on: (event: string, handler: any) => {
                if (event === 'stream') {
                    streamHandler = handler;
                }
            },
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        // eslint-disable-next-line
        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: jest.fn(),
        }));

        await newConnection('http://localhost:8065', 'channelID', () => {}, setScreenShareURL, true, mockIntl);

        streamHandler({
            id: 'streamC',
            toURL: () => 'url://mystery',
            getTracks: () => [{id: 'trackC', kind: 'video'}],
            getVideoTracks: () => [{id: 'trackC', kind: 'video'}],
        }, undefined);

        // The media map is only populated by a data channel message, so it can
        // be absent on older servers or simply not have arrived yet. Falling
        // back to the previous behaviour is better than dropping the track.
        expect(setScreenShareURL).toHaveBeenCalledWith('url://mystery');
        expect(setVideoURL).not.toHaveBeenCalled();
    });

    it('ignores video tracks with an unknown track info type', async () => {
        const setScreenShareURL = jest.fn();
        let streamHandler: any;

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            on: (event: string, handler: any) => {
                if (event === 'stream') {
                    streamHandler = handler;
                }
            },
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        // eslint-disable-next-line
        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: jest.fn(),
        }));

        await newConnection('http://localhost:8065', 'channelID', () => {}, setScreenShareURL, true, mockIntl);

        streamHandler({
            id: 'streamD',
            toURL: () => 'url://mystery',
            getTracks: () => [{id: 'trackD', kind: 'video'}],
            getVideoTracks: () => [{id: 'trackD', kind: 'video'}],
        }, {type: 'something-new', sender_id: 'sessionD'});

        expect(setScreenShareURL).not.toHaveBeenCalled();
        expect(setVideoURL).not.toHaveBeenCalled();
    });

    it('startVideo publishes the camera and signals video_on', async () => {
        const mockAddTrack = jest.fn();
        const wsSend = jest.fn();
        const mockStop = jest.fn();

        const videoTrack = {id: 'videoTrackId', kind: 'video', enabled: true, stop: mockStop, _switchCamera: jest.fn()};
        // eslint-disable-next-line
        // @ts-ignore
        mediaDevices.getUserMedia.mockResolvedValueOnce({
            id: 'localVideoStream',
            toURL: () => 'url://self',
            getVideoTracks: () => [videoTrack],
            getTracks: () => [videoTrack],
        });

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            addTrack: mockAddTrack,
            replaceTrack: jest.fn(),
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        // eslint-disable-next-line
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

        const connection = await newConnection('http://localhost:8065', 'channelID', () => {}, () => {}, false, mockIntl);

        await connection.startVideo();

        expect(mockAddTrack).toHaveBeenCalledWith(videoTrack, expect.any(Object), {
            encodings: [{maxBitrate: 1000 * 1000, maxFramerate: 30, scaleResolutionDownBy: 1.0}],
        });
        expect(wsSend).toHaveBeenCalledWith('video_on', {data: JSON.stringify({videoStreamID: 'localVideoStream'})});
        expect(setMyVideoURL).toHaveBeenCalledWith('url://self');
    });

    it('stopVideo detaches, signals video_off and releases the camera', async () => {
        const mockReplaceTrack = jest.fn();
        const wsSend = jest.fn();
        const mockStop = jest.fn();

        const videoTrack = {id: 'videoTrackId', kind: 'video', enabled: true, stop: mockStop, _switchCamera: jest.fn()};
        // eslint-disable-next-line
        // @ts-ignore
        mediaDevices.getUserMedia.mockResolvedValueOnce({
            id: 'localVideoStream',
            toURL: () => 'url://self',
            getVideoTracks: () => [videoTrack],
            getTracks: () => [videoTrack],
        });

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            addTrack: jest.fn(),
            replaceTrack: mockReplaceTrack,
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        // eslint-disable-next-line
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

        const connection = await newConnection('http://localhost:8065', 'channelID', () => {}, () => {}, false, mockIntl);

        await connection.startVideo();
        connection.stopVideo();

        expect(mockReplaceTrack).toHaveBeenCalledWith('videoTrackId', null);
        expect(wsSend).toHaveBeenCalledWith('video_off');
        expect(mockStop).toHaveBeenCalled();
        expect(setMyVideoURL).toHaveBeenCalledWith('');
    });

    it('restarts the camera after it was stopped, reusing the existing sender', async () => {
        const mockAddTrack = jest.fn();
        const mockReplaceTrack = jest.fn();

        // getUserMedia hands back a brand new track on every start, so the
        // second track has a different ID -- which is the whole point here.
        const firstTrack = {id: 'videoTrack1', kind: 'video', enabled: true, stop: jest.fn(), release: jest.fn(), _switchCamera: jest.fn()};
        const secondTrack = {id: 'videoTrack2', kind: 'video', enabled: true, stop: jest.fn(), release: jest.fn(), _switchCamera: jest.fn()};

        (mediaDevices.getUserMedia as unknown as jest.Mock).
            mockResolvedValueOnce({
                id: 'localVideoStream1',
                toURL: () => 'url://self1',
                getVideoTracks: () => [firstTrack],
                getTracks: () => [firstTrack],
            }).
            mockResolvedValueOnce({
                id: 'localVideoStream2',
                toURL: () => 'url://self2',
                getVideoTracks: () => [secondTrack],
                getTracks: () => [secondTrack],
            });

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            addTrack: mockAddTrack,
            replaceTrack: mockReplaceTrack,
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        // eslint-disable-next-line
        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: jest.fn(),
        }));

        const connection = await newConnection('http://localhost:8065', 'channelID', () => {}, () => {}, false, mockIntl);

        await connection.startVideo();
        connection.stopVideo();
        await connection.startVideo();

        // The sender is created once and kept alive across the cycle.
        expect(mockAddTrack).toHaveBeenCalledTimes(1);
        expect(mockAddTrack).toHaveBeenCalledWith(firstTrack, expect.any(Object), {
            encodings: [{maxBitrate: 1000 * 1000, maxFramerate: 30, scaleResolutionDownBy: 1.0}],
        });

        // replaceTrack is keyed by the ID the sender is registered under, which
        // a null replacement does not re-key.
        expect(mockReplaceTrack).toHaveBeenCalledTimes(2);
        expect(mockReplaceTrack).toHaveBeenNthCalledWith(1, 'videoTrack1', null);
        expect(mockReplaceTrack).toHaveBeenNthCalledWith(2, 'videoTrack1', secondTrack);
        expect(setMyVideoURL).toHaveBeenCalledWith('url://self2');
    });

    it('disconnect stops and releases an active camera track', async () => {
        const mockStop = jest.fn();
        const mockRelease = jest.fn();

        const videoTrack = {id: 'videoTrackId', kind: 'video', enabled: true, stop: mockStop, release: mockRelease, _switchCamera: jest.fn()};
        // eslint-disable-next-line
        // @ts-ignore
        mediaDevices.getUserMedia.mockResolvedValueOnce({
            id: 'localVideoStream',
            toURL: () => 'url://self',
            getVideoTracks: () => [videoTrack],
            getTracks: () => [videoTrack],
        });

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            addTrack: jest.fn(),
            replaceTrack: jest.fn(),
            destroy: jest.fn(),
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        // eslint-disable-next-line
        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: jest.fn(),
            close: jest.fn(),
        }));

        const connection = await newConnection('http://localhost:8065', 'channelID', () => {}, () => {}, false, mockIntl);

        await connection.startVideo();
        connection.disconnect();

        // Hanging up must free the capture device, or the hardware camera
        // indicator stays lit (MM-68796).
        expect(mockStop).toHaveBeenCalled();
        expect(mockRelease).toHaveBeenCalled();
        expect(setMyVideoURL).toHaveBeenCalledWith('');
    });
    it('switchCamera switches the active camera track', async () => {
        const mockSwitchCamera = jest.fn();

        const videoTrack = {id: 'videoTrackId', kind: 'video', enabled: true, stop: jest.fn(), release: jest.fn(), _switchCamera: mockSwitchCamera};
        (mediaDevices.getUserMedia as unknown as jest.Mock).mockResolvedValueOnce({
            id: 'localVideoStream',
            toURL: () => 'url://self',
            getVideoTracks: () => [videoTrack],
            getTracks: () => [videoTrack],
        });

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            addTrack: jest.fn(),
            replaceTrack: jest.fn(),
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        // eslint-disable-next-line
        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: jest.fn(),
        }));

        const connection = await newConnection('http://localhost:8065', 'channelID', () => {}, () => {}, false, mockIntl);

        await connection.startVideo();
        connection.switchCamera();

        // Local device swap only: no signalling, no renegotiation.
        expect(mockSwitchCamera).toHaveBeenCalledTimes(1);
    });

    it('switchCamera is a no-op when no camera track is active', async () => {
        const mockSwitchCamera = jest.fn();

        const videoTrack = {id: 'videoTrackId', kind: 'video', enabled: true, stop: jest.fn(), release: jest.fn(), _switchCamera: mockSwitchCamera};
        (mediaDevices.getUserMedia as unknown as jest.Mock).mockResolvedValueOnce({
            id: 'localVideoStream',
            toURL: () => 'url://self',
            getVideoTracks: () => [videoTrack],
            getTracks: () => [videoTrack],
        });

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            addTrack: jest.fn(),
            replaceTrack: jest.fn(),
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        // eslint-disable-next-line
        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: jest.fn(),
        }));

        const connection = await newConnection('http://localhost:8065', 'channelID', () => {}, () => {}, false, mockIntl);

        // startVideo was never called, so there is nothing to switch.
        connection.switchCamera();

        expect(mockSwitchCamera).not.toHaveBeenCalled();
    });

    it('clears the sender key when replaceTrack throws so the camera can recover', async () => {
        const mockAddTrack = jest.fn();

        // Detaching (a null replacement) still works; re-attaching is what fails.
        const mockReplaceTrack = jest.fn((_id: string, track: unknown) => {
            if (track) {
                throw new Error('replaceTrack failed');
            }
        });

        const makeTrack = (id: string) => ({id, kind: 'video', enabled: true, stop: jest.fn(), release: jest.fn(), _switchCamera: jest.fn()});
        const firstTrack = makeTrack('videoTrack1');
        const secondTrack = makeTrack('videoTrack2');
        const thirdTrack = makeTrack('videoTrack3');

        const makeStream = (id: string, track: unknown) => ({
            id,
            toURL: () => `url://${id}`,
            getVideoTracks: () => [track],
            getTracks: () => [track],
        });

        // jest's clearMocks does not drain queued mockResolvedValueOnce values,
        // so reset before queueing to keep this test's three starts aligned
        // with its three streams, then restore the module-level default.
        const getUserMedia = mediaDevices.getUserMedia as unknown as jest.Mock;
        getUserMedia.mockReset();
        getUserMedia.
            mockResolvedValueOnce(makeStream('stream1', firstTrack)).
            mockResolvedValueOnce(makeStream('stream2', secondTrack)).
            mockResolvedValueOnce(makeStream('stream3', thirdTrack)).
            mockResolvedValue({
                getAudioTracks: () => [{id: 'audioTrackId', enabled: true}],
                getTracks: () => [{id: 'audioTrackId', enabled: true, stop: jest.fn(), release: jest.fn()}],
            });

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            addTrack: mockAddTrack,
            replaceTrack: mockReplaceTrack,
            on: jest.fn(),
            once: jest.fn(),
            off: jest.fn(),
            getStats: jest.fn(),
        }));

        // eslint-disable-next-line
        // @ts-ignore
        WebSocketClient.mockImplementation(() => ({
            initialize: jest.fn(),
            on: (event: string, handler: any) => {
                if (event === 'join') {
                    handler();
                }
            },
            send: jest.fn(),
        }));

        const connection = await newConnection('http://localhost:8065', 'channelID', () => {}, () => {}, false, mockIntl);

        await connection.startVideo();
        connection.stopVideo();

        // This start goes down the replaceTrack path and throws.
        await connection.startVideo();

        expect(secondTrack.stop).toHaveBeenCalled();
        expect(secondTrack.release).toHaveBeenCalled();

        // The next attempt must not be stuck on the same failing branch: with
        // the sender key cleared it falls back to addTrack and recovers.
        await connection.startVideo();

        expect(mockAddTrack).toHaveBeenCalledTimes(2);
        expect(mockAddTrack).toHaveBeenNthCalledWith(2, thirdTrack, expect.any(Object), {
            encodings: [{maxBitrate: 1000 * 1000, maxFramerate: 30, scaleResolutionDownBy: 1.0}],
        });
        expect(setMyVideoURL).toHaveBeenCalledWith('url://stream3');
    });
});
