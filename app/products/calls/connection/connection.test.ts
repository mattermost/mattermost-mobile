// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {RTCMonitor, RTCPeer, parseRTCStats} from '@mattermost/calls/lib';
import {Platform} from 'react-native';
import InCallManager from 'react-native-incall-manager';

import NetworkManager from '@managers/network_manager';

import {newConnection} from './connection';
import {WebSocketClient} from './websocket_client';

jest.mock('./websocket_client');
jest.mock('@mattermost/calls/lib');

describe('newConnection', () => {
    const mockClient = {
        getWebSocketUrl: jest.fn(() => 'ws://localhost:8065'),
        getCallsConfig: jest.fn(() => ({
            ICEServers: ['stun:stun.example.com'],
            ICEServersConfigs: [{urls: ['stun:stun.example.com']}],
            AllowEnableCalls: true,
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
            };
        });

        Platform.OS = 'web';

        InCallManager.start = jest.fn();
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

    it('should initialize connection with ICE servers', async () => {
        const connection = await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            false,
        );
        expect(connection).toBeDefined();
        expect(mockClient.getCallsConfig).toHaveBeenCalled();
        expect(mockClient.genTURNCredentials).toHaveBeenCalled();
    });

    it('should handle mute/unmute correctly', async () => {
        const connection = await newConnection(
            'http://localhost:8065',
            'channelID',
            () => {},
            () => {},
            true,
        );

        expect(connection.mute).toBeDefined();
        expect(connection.unmute).toBeDefined();

        connection.mute();
        connection.unmute();
    });

    it('should handle disconnect', async () => {
        const mockCloseCb = jest.fn();
        const connection = await newConnection(
            'http://localhost:8065',
            'channelID',
            mockCloseCb,
            () => {},
            false,
        );

        connection.disconnect();
        expect(mockCloseCb).toHaveBeenCalled();
    });

    it('collectICEStats', (done) => {
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

        newConnection('http://localhost:8065', 'channelID', () => {}, () => {}, false).
            then((connection) => {
                expect(connection).toBeDefined();
                expect(joinHandler).toHaveBeenCalled();
            });
    });
});
