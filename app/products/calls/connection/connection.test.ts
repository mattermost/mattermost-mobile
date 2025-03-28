// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {RTCMonitor, RTCPeer, parseRTCStats} from '@mattermost/calls/lib';
import {zlibSync, strToU8} from 'fflate';
import {Platform} from 'react-native';
import InCallManager from 'react-native-incall-manager';

import NetworkManager from '@managers/network_manager';

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
    foregroundServiceSetup: jest.fn(),
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

    beforeAll(() => {
        // eslint-disable-next-line
        // @ts-ignore
        global.navigator = {};

        // eslint-disable-next-line
        // @ts-ignore
        NetworkManager.getClient = jest.fn(() => mockClient);

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => {
            return {
                getStats: jest.fn(),
                on: jest.fn(),
            };
        });

        // eslint-disable-next-line
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

        InCallManager.start = jest.fn();
        InCallManager.stop = jest.fn();
        InCallManager.stopProximitySensor = jest.fn();
    });

    afterAll(() => {
        // eslint-disable-next-line
        // @ts-ignore
        delete global.navigator;

        jest.resetAllMocks();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('join', async () => {
        const wsSend = jest.fn();

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            on: jest.fn(),
            getStats: jest.fn(),
        }));

        let openHandler;
        // eslint-disable-next-line
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
            () => {},
            () => {},
            true,
            true,
        );
        expect(connection).toBeDefined();

        expect(wsSend).toHaveBeenCalledWith('join', {av1Support: false, channelID: 'channelID'});

        // reconnect
        expect(openHandler).toBeDefined();
        openHandler!('originalConnID', 'prevConnID', true);
        expect(wsSend).toHaveBeenCalledWith('reconnect', {channelID: 'channelID', originalConnID: 'originalConnID', prevConnID: 'prevConnID'});
    });

    it('mute/unmute', async () => {
        const mockReplaceTrack = jest.fn();
        const mockAddStream = jest.fn();
        const wsSend = jest.fn();

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            replaceTrack: mockReplaceTrack,
            addStream: mockAddStream,
            on: jest.fn(),
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

        const connection = await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            () => {},
            () => {},
            true,
            true,
        );

        // First unmute should use addStream
        await connection.unmute();
        expect(mockAddStream).toHaveBeenCalledWith(expect.any(Object));
        expect(wsSend).toHaveBeenCalledWith('unmute');

        connection.mute();

        // Subsequent unmute should use replaceTrack
        await connection.unmute();
        expect(mockReplaceTrack).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
        expect(wsSend).toHaveBeenCalledWith('unmute');
    });

    it('raise/unraise hand', async () => {
        const wsSend = jest.fn();

        // eslint-disable-next-line
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
            () => {},
            () => {},
            false,
            false,
        );

        connection.raiseHand();
        expect(wsSend).toHaveBeenCalledWith('raise_hand');

        connection.unraiseHand();
        expect(wsSend).toHaveBeenCalledWith('unraise_hand');
    });

    it('react', async () => {
        const wsSend = jest.fn();

        // eslint-disable-next-line
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
            () => {},
            () => {},
            false,
            false,
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

        // eslint-disable-next-line
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
            () => {},
            () => {},
            false,
            false,
        );

        // eslint-disable-next-line
        // @ts-ignore
        errorHandler(new Error('test error'));
        expect(mockCloseCb).not.toHaveBeenCalled();

        // eslint-disable-next-line
        // @ts-ignore
        errorHandler(wsReconnectionTimeoutErr);
        expect(mockCloseCb).toHaveBeenCalled();
    });

    it('ws close', async () => {
        let closeHandler: (event: WebSocketCloseEvent) => void;
        const mockCloseCb = jest.fn();

        // eslint-disable-next-line
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
            () => {},
            () => {},
            false,
            false,
        );

        // eslint-disable-next-line
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
            () => {},
            () => {},
            true,
            true,
        );

        expect(getUserMedia).toHaveBeenCalledWith({
            video: false,
            audio: true,
        });
        expect(getUserMedia).toHaveBeenCalledTimes(1);

        await connection.initializeVoiceTrack();
        expect(getUserMedia).toHaveBeenCalledTimes(1);
    });

    it('initialize video track, start=true', async () => {
        const getUserMedia = require('react-native-webrtc').mediaDevices.getUserMedia;
        const mockVideoTrack = {
            id: 'videoTrackId',
            enabled: false,
            stop: jest.fn(),
            release: jest.fn(),
        };

        const setLocalVideoURL = jest.fn();
        const connection = await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            setLocalVideoURL,
            () => {},
            true,
            true,
        );

        getUserMedia.mockResolvedValueOnce({
            getVideoTracks: () => [mockVideoTrack],
            id: 'videoStreamId',
            toURL: jest.fn(() => 'video-url'),
        });

        // Test initializing video track with start=true
        await connection.initializeVideoTrack(true);

        expect(getUserMedia).toHaveBeenCalledWith({
            video: {
                frameRate: 30,
                facingMode: 'user',
            },
            audio: false,
        });
        expect(getUserMedia).toHaveBeenCalledTimes(2);
        expect(setLocalVideoURL).toHaveBeenCalledWith('video-url');
        expect(mockVideoTrack.enabled).toBe(true);
    });

    it('initialize video track, start=false', async () => {
        const getUserMedia = require('react-native-webrtc').mediaDevices.getUserMedia;

        const setLocalVideoURL = jest.fn();
        const connection = await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            setLocalVideoURL,
            () => {},
            true,
            true,
        );

        // Create a new video track mock that will be released
        const mockVideoTrackToRelease = {
            id: 'videoTrackId2',
            enabled: false,
            stop: jest.fn(),
            release: jest.fn(),
        };

        getUserMedia.mockResolvedValueOnce({
            getVideoTracks: () => [mockVideoTrackToRelease],
            id: 'videoStreamId2',
            toURL: jest.fn(() => 'video-url-2'),
        });

        // Test initializing video track with start=false
        await connection.initializeVideoTrack(false);

        expect(getUserMedia).toHaveBeenCalledTimes(2);
        expect(setLocalVideoURL).not.toHaveBeenCalled();
        expect(mockVideoTrackToRelease.stop).toHaveBeenCalled();
        expect(mockVideoTrackToRelease.release).toHaveBeenCalled();
        expect(mockVideoTrackToRelease.enabled).toBe(false);
    });

    it('does not initialize video track when EnableVideo is false', async () => {
        const getUserMedia = require('react-native-webrtc').mediaDevices.getUserMedia;
        getUserMedia.mockClear();

        // Mock client to return config with EnableVideo: false
        const mockClientWithVideoDisabled = {
            getWebSocketUrl: jest.fn(() => 'ws://localhost:8065'),
            getCallsConfig: jest.fn(() => ({
                ICEServers: ['stun:stun.example.com'],
                ICEServersConfigs: [{urls: ['stun:stun.example.com']}],
                AllowEnableCalls: true,
                EnableVideo: false,
                EnableAV1: true,
            })),
            genTURNCredentials: jest.fn(() => Promise.resolve([{
                urls: ['turn:turn.example.com'],
                username: 'user',
                credential: 'pass',
            }])),
        };

        // Override the NetworkManager.getClient mock for this test
        // eslint-disable-next-line
        // @ts-ignore
        NetworkManager.getClient = jest.fn(() => mockClientWithVideoDisabled);

        const setLocalVideoURL = jest.fn();
        await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            setLocalVideoURL,
            () => {},
            true,
            true,
        );

        // Should only call getUserMedia for voice track, not for video
        expect(getUserMedia).toHaveBeenCalledTimes(1);
        expect(getUserMedia).toHaveBeenCalledWith({
            video: false,
            audio: true,
        });
    });

    it('initializes video track when EnableVideo is true', async () => {
        const getUserMedia = require('react-native-webrtc').mediaDevices.getUserMedia;
        getUserMedia.mockClear();

        // Mock client to return config with EnableVideo: true
        const mockClientWithVideoEnabled = {
            getWebSocketUrl: jest.fn(() => 'ws://localhost:8065'),
            getCallsConfig: jest.fn(() => ({
                ICEServers: ['stun:stun.example.com'],
                ICEServersConfigs: [{urls: ['stun:stun.example.com']}],
                AllowEnableCalls: true,
                EnableVideo: true,
                EnableAV1: true,
            })),
            genTURNCredentials: jest.fn(() => Promise.resolve([{
                urls: ['turn:turn.example.com'],
                username: 'user',
                credential: 'pass',
            }])),
        };

        // Mock video track
        const mockVideoTrack = {
            id: 'videoTrackId',
            enabled: true,
            stop: jest.fn(),
            release: jest.fn(),
        };

        // Set up getUserMedia to return a video track on second call
        getUserMedia.mockImplementation((config: {video?: boolean | object; audio?: boolean | object}) => {
            if (config.video) {
                return Promise.resolve({
                    getVideoTracks: () => [mockVideoTrack],
                    id: 'videoStreamId',
                    toURL: jest.fn(() => 'video-url'),
                });
            }

            return Promise.resolve({
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
            });
        });

        // Override the NetworkManager.getClient mock for this test
        // eslint-disable-next-line
        // @ts-ignore
        NetworkManager.getClient = jest.fn(() => mockClientWithVideoEnabled);

        const setLocalVideoURL = jest.fn();
        await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            setLocalVideoURL,
            () => {},
            true,
            true,
        );

        // Should call getUserMedia twice - once for voice and once for video
        expect(getUserMedia).toHaveBeenCalledTimes(2);
        expect(getUserMedia).toHaveBeenCalledWith({
            video: false,
            audio: true,
        });
        expect(getUserMedia).toHaveBeenCalledWith({
            video: {
                frameRate: 30,
                facingMode: 'user',
            },
            audio: false,
        });

        // Video track should be initialized but stopped since start=false
        expect(mockVideoTrack.stop).toHaveBeenCalled();
        expect(mockVideoTrack.release).toHaveBeenCalled();
    });

    it('rtc peer', async () => {
        const wsSend = jest.fn();
        const wsClose = jest.fn();
        const peerDestroy = jest.fn();
        const peerSignal = jest.fn();
        const peerReplaceTrack = jest.fn();
        const peerAddStream = jest.fn();

        const handlers: Record<string, any> = {};

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            on: (event: string, handler: any) => {
                handlers[event] = handler;
            },
            getStats: jest.fn(),
            destroy: peerDestroy,
            signal: peerSignal,
            replaceTrack: peerReplaceTrack,
            addStream: peerAddStream,
        }));

        // eslint-disable-next-line
        // @ts-ignore
        parseRTCStats.mockImplementation(() => mockRTCStats);

        let wsMsgHandler;
        // eslint-disable-next-line
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
            () => {},
            () => {},
            true,
            true,
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

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            on: (event: string, handler: any) => {
                handlers[event] = handler;
            },
            getStats: jest.fn(),
            destroy: peerDestroy,
            signal: peerSignal,
        }));

        // eslint-disable-next-line
        // @ts-ignore
        parseRTCStats.mockImplementation(() => mockRTCStats);

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
            close: wsClose,
        }));

        const connection = await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            () => {},
            () => {},
            true,
            true,
        );
        expect(connection).toBeDefined();

        await Promise.resolve();

        handlers.close();

        expect(wsClose).toHaveBeenCalled();
        expect(wsSend).toHaveBeenCalledWith('leave');
        expect(peerDestroy).toHaveBeenCalled();
    });

    it('collectICEStats', (done) => {
        Platform.OS = 'web';

        const wsSend = jest.fn();
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
                done();
            }
        });

        // eslint-disable-next-line
        // @ts-ignore
        WebSocketClient.mockImplementation(() => {
            return {
                initialize: jest.fn(),
                on: joinHandler,
                send: wsSend,
            };
        });

        // eslint-disable-next-line
        // @ts-ignore
        parseRTCStats.mockImplementation(() => mockRTCStats);

        newConnection('http://localhost:8065', 'channelID', () => {}, () => {}, () => {}, () => {}, false, false).
            then((connection) => {
                expect(connection).toBeDefined();
                expect(joinHandler).toHaveBeenCalled();
            });
    });

    it('start and stop video', async () => {
        const wsSend = jest.fn();
        const mockReplaceTrack = jest.fn();
        const mockAddStream = jest.fn();
        const setLocalVideoURL = jest.fn();

        // Mock video track and stream
        const mockVideoTrack = {
            id: 'videoTrackId',
            enabled: false,
            stop: jest.fn(),
            release: jest.fn(),
        };

        const mockVideoStream = {
            id: 'videoStreamId',
            toURL: jest.fn(() => 'video-url'),
        };

        const getUserMedia = require('react-native-webrtc').mediaDevices.getUserMedia;

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => ({
            replaceTrack: mockReplaceTrack,
            addStream: mockAddStream,
            on: jest.fn(),
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

        const connection = await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            setLocalVideoURL,
            () => {},
            true,
            true,
        );

        getUserMedia.mockResolvedValueOnce({
            getVideoTracks: () => [mockVideoTrack],
            id: 'videoStreamId',
            toURL: mockVideoStream.toURL,
        });

        // Test startVideo when no video track exists yet
        await connection.startVideo();

        // Should have initialized video
        expect(getUserMedia).toHaveBeenCalledWith({
            video: {
                frameRate: 30,
                facingMode: 'user',
            },
            audio: false,
        });

        // Should have added stream since track wasn't added before
        expect(mockAddStream).toHaveBeenCalled();
        expect(mockVideoTrack.enabled).toBe(true);
        expect(setLocalVideoURL).toHaveBeenCalledWith('video-url');
        expect(wsSend).toHaveBeenCalledWith('video_on', {
            data: JSON.stringify({
                videoStreamID: 'videoStreamId',
            }),
        });

        // Reset mocks for stopVideo test
        wsSend.mockClear();
        mockReplaceTrack.mockClear();
        mockVideoTrack.enabled = true;

        // Test stopVideo
        connection.stopVideo();

        expect(mockReplaceTrack).toHaveBeenCalledWith('videoTrackId', null);
        expect(mockVideoTrack.enabled).toBe(false);
        expect(wsSend).toHaveBeenCalledWith('video_off');

        // Reset mocks for second startVideo test
        wsSend.mockClear();
        mockReplaceTrack.mockClear();
        mockAddStream.mockClear();

        // Test startVideo when video track already exists
        await connection.startVideo();

        // Should have used replaceTrack since track was already added
        expect(mockReplaceTrack).toHaveBeenCalledWith('videoTrackId', mockVideoTrack);
        expect(mockAddStream).not.toHaveBeenCalled();
        expect(mockVideoTrack.enabled).toBe(true);
        expect(wsSend).toHaveBeenCalledWith('video_on', {
            data: JSON.stringify({
                videoStreamID: 'videoStreamId',
            }),
        });
    });

    it('waitForPeerConnection', async () => {
        let connection = await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            () => {},
            () => {},
            true,
            true,
        );
        expect(connection).toBeDefined();

        await Promise.resolve();

        jest.useFakeTimers();

        let res = connection.waitForPeerConnection();

        jest.runAllTimers();

        await expect(res).rejects.toEqual('timed out waiting for peer connection');

        // eslint-disable-next-line
        // @ts-ignore
        RTCPeer.mockImplementation(() => {
            return {
                getStats: jest.fn(),
                on: jest.fn(),
                connected: true,
            };
        });

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

        connection = await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            () => {},
            () => {},
            true,
            true,
        );
        expect(connection).toBeDefined();

        await Promise.resolve();

        res = connection.waitForPeerConnection();
        jest.runAllTimers();
        await expect(res).resolves.not.toThrow();
        jest.useRealTimers();
    });
});
