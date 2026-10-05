// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {NetInfoCellularGeneration, NetInfoStateType, type NetInfoState} from '@react-native-community/netinfo';

import {General} from '@constants';

import {boundedRateLimitHoldMs, testExports} from '.';

const {NetworkPostureManagerSingleton, CONGESTED_DOWN_MS, SAMPLE_STALE_MS} = testExports;

const serverUrl = 'https://server.example.com';

const netState = (overrides: Partial<NetInfoState> = {}) => ({
    type: NetInfoStateType.wifi,
    isConnected: true,
    isInternetReachable: true,
    details: {isConnectionExpensive: false},
    ...overrides,
}) as NetInfoState;

describe('NetworkPostureManager', () => {
    let manager: InstanceType<typeof NetworkPostureManagerSingleton>;
    let emitNetInfo: (state: NetInfoState) => void;

    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.spyOn(NetInfo, 'addEventListener').mockImplementation((listener) => {
            emitNetInfo = listener;
            return jest.fn();
        });
        manager = new NetworkPostureManagerSingleton();
        emitNetInfo(netState());
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should be unknown and conservative until the first sample', () => {
        expect(manager.getPosture(serverUrl)).toBe('unknown');
        expect(manager.getGates(serverUrl).prefetchChannels).toBe(false);
        expect(manager.getGates(serverUrl).emitTyping).toBe(false);
    });

    it('should report good with full gates on a fast link', () => {
        manager.recordSample(serverUrl, 80, false);

        expect(manager.getPosture(serverUrl)).toBe('good');
        expect(manager.getGates(serverUrl)).toEqual({
            autoLoadImages: true,
            postsPageSize: General.POST_CHUNK_SIZE,
            emitTyping: true,
            prefetchChannels: true,
        });
    });

    it('should report congested on a slow link', () => {
        for (let i = 0; i < 5; i++) {
            manager.recordSample(serverUrl, 3000, false);
        }

        expect(manager.getPosture(serverUrl)).toBe('congested');
    });

    it('should downgrade immediately on a transport failure and need three good samples to recover', () => {
        manager.recordSample(serverUrl, 90, false);
        manager.recordSample(serverUrl, 20000, true);
        expect(manager.getPosture(serverUrl)).toBe('congested');

        manager.recordSample(serverUrl, 90, false);
        manager.recordSample(serverUrl, 90, false);
        expect(manager.getPosture(serverUrl)).toBe('congested');

        manager.recordSample(serverUrl, 90, false);
        expect(manager.getPosture(serverUrl)).toBe('good');
    });

    it('should report congested while a request outlives the budget and restore when it ends', () => {
        manager.recordSample(serverUrl, 80, false);
        const id = manager.beginRequest(serverUrl);

        jest.advanceTimersByTime(CONGESTED_DOWN_MS + 50);
        expect(manager.getPosture(serverUrl)).toBe('congested');

        manager.endRequest(serverUrl, id);
        expect(manager.getPosture(serverUrl)).toBe('good');
    });

    it('should decay to unknown when samples go stale', () => {
        manager.recordSample(serverUrl, 80, false);

        jest.advanceTimersByTime(SAMPLE_STALE_MS + 1);
        expect(manager.getPosture(serverUrl)).toBe('unknown');
    });

    it('should cap a metered link at fair', () => {
        emitNetInfo(netState({type: NetInfoStateType.cellular, details: {isConnectionExpensive: true, cellularGeneration: NetInfoCellularGeneration['4g'], carrier: null}}));
        manager.recordSample(serverUrl, 80, false);

        expect(manager.getPosture(serverUrl)).toBe('fair');
        expect(manager.getGates(serverUrl).prefetchChannels).toBe(false);
        expect(manager.getGates(serverUrl).postsPageSize).toBe(30);
    });

    it('should force congested on a 2G link', () => {
        emitNetInfo(netState({type: NetInfoStateType.cellular, details: {isConnectionExpensive: true, cellularGeneration: NetInfoCellularGeneration['2g'], carrier: null}}));
        manager.recordSample(serverUrl, 80, false);

        expect(manager.getPosture(serverUrl)).toBe('congested');
    });

    it('should report offline when disconnected and start fresh on reconnect', () => {
        manager.recordSample(serverUrl, 3000, true);
        emitNetInfo(netState({isConnected: false}));
        expect(manager.getPosture(serverUrl)).toBe('offline');

        emitNetInfo(netState());
        expect(manager.getPosture(serverUrl)).toBe('unknown');

        manager.recordSample(serverUrl, 80, false);
        expect(manager.getPosture(serverUrl)).toBe('good');
    });

    it('should hold congested for the rate-limit window, then need the upgrade streak', () => {
        manager.recordSample(serverUrl, 80, false);
        manager.noteRateLimited(serverUrl, 10_000);

        manager.recordSample(serverUrl, 80, false);
        manager.recordSample(serverUrl, 80, false);
        manager.recordSample(serverUrl, 80, false);
        expect(manager.getPosture(serverUrl)).toBe('congested');

        jest.advanceTimersByTime(10_001);
        manager.recordSample(serverUrl, 80, false);
        manager.recordSample(serverUrl, 80, false);
        expect(manager.getPosture(serverUrl)).toBe('congested');

        manager.recordSample(serverUrl, 80, false);
        expect(manager.getPosture(serverUrl)).toBe('good');
    });

    it('should bound the rate-limit hold', () => {
        expect(boundedRateLimitHoldMs(undefined)).toBe(1000);
        expect(boundedRateLimitHoldMs(0)).toBe(1000);
        expect(boundedRateLimitHoldMs(5000)).toBe(5000);
        expect(boundedRateLimitHoldMs(600_000)).toBe(60_000);
    });
});
