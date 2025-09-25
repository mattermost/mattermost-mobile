// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {testExports} from './network_performance_manager';

import type {ClientResponseMetrics} from '@mattermost/react-native-network-client';
import type {AppStateStatus} from 'react-native';

jest.mock('react-native', () => ({
    AppState: {
        addEventListener: jest.fn(() => ({
            remove: jest.fn(),
        })),
    },
}));

const {
    NetworkPerformanceManagerSingleton,
    REQUEST_OUTCOME_WINDOW_SIZE,
    calculatePerformanceStateFromOutcomes,
} = testExports;

const createMockMetrics = (latency: number, size: number, compressedSize: number): ClientResponseMetrics => ({
    latency,
    size,
    compressedSize,
    startTime: Date.now(),
    endTime: Date.now() + latency,
    networkType: 'wifi',
    tlsCipherSuite: 'TLS_AES_256_GCM_SHA384',
    tlsVersion: 'TLSv1.3',
    httpVersion: 'HTTP/2',
    isCached: false,
    connectionTime: 0,
    speedInMbps: 0,
});

describe('Pure Functions', () => {
    describe('calculatePerformanceStateFromOutcomes', () => {
        it('should return normal when not enough requests', () => {
            const outcomes = [
                {timestamp: Date.now(), isSlow: true, wasEarlyDetection: false},
                {timestamp: Date.now(), isSlow: true, wasEarlyDetection: false},
            ];

            const state = calculatePerformanceStateFromOutcomes(outcomes);
            expect(state).toBe('normal');
        });

        it('should return normal when slow percentage is below threshold', () => {
            const outcomes = Array.from({length: 10}, (_, i) => ({
                timestamp: Date.now(),
                isSlow: i < 3,
                wasEarlyDetection: false,
            }));

            const state = calculatePerformanceStateFromOutcomes(outcomes);
            expect(state).toBe('normal');
        });

        it('should return slow when slow percentage meets threshold', () => {
            const outcomes = Array.from({length: 10}, (_, i) => ({
                timestamp: Date.now(),
                isSlow: i < 7,
                wasEarlyDetection: false,
            }));

            const state = calculatePerformanceStateFromOutcomes(outcomes);
            expect(state).toBe('slow');
        });

        it('should return slow when slow percentage exceeds threshold', () => {
            const outcomes = Array.from({length: 10}, (_, i) => ({
                timestamp: Date.now(),
                isSlow: i < 8,
                wasEarlyDetection: false,
            }));

            const state = calculatePerformanceStateFromOutcomes(outcomes);
            expect(state).toBe('slow');
        });
    });
});

describe('NetworkPerformanceManager', () => {
    let performanceManager: InstanceType<typeof NetworkPerformanceManagerSingleton>;
    const serverUrl = 'https://test-server.com';

    beforeEach(() => {
        performanceManager = new NetworkPerformanceManagerSingleton();
    });

    describe('request tracking lifecycle', () => {
        it('should start and complete request tracking', () => {
            const url = '/api/v4/users/me';
            const metrics = createMockMetrics(500, 1000, 500);

            const requestId = performanceManager.startRequestTracking(serverUrl, url);
            expect(typeof requestId).toBe('string');
            expect(requestId).toContain('-');

            performanceManager.completeRequestTracking(serverUrl, requestId, metrics);

            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(1);
            expect(stats.slowRequests).toBe(0);
        });

        it('should track slow requests correctly', () => {
            const url = '/api/v4/posts';
            const slowMetrics = createMockMetrics(3000, 1000, 500);

            const requestId = performanceManager.startRequestTracking(serverUrl, url);
            performanceManager.completeRequestTracking(serverUrl, requestId, slowMetrics);

            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(1);
            expect(stats.slowRequests).toBe(1);
            expect(stats.slowPercentage).toBe(1.0);
        });

        it('should cancel request tracking on failure', () => {
            const url = '/api/v4/teams';

            const requestId = performanceManager.startRequestTracking(serverUrl, url);
            performanceManager.cancelRequestTracking(serverUrl, requestId);

            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(0);
        });
    });

    describe('performance state calculation', () => {
        it('should return normal when slow percentage is below threshold', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            for (let i = 0; i < 10; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(i < 3 ? 3000 : 500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            subscription.unsubscribe();
            expect(states).toContain('normal');
        });

        it('should return slow when slow percentage meets threshold', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            for (let i = 0; i < 10; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(i < 7 ? 3000 : 500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            subscription.unsubscribe();
            expect(states).toContain('slow');
        });
    });

    describe('outcome statistics', () => {
        it('should provide accurate request outcome statistics', () => {
            for (let i = 0; i < 20; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(i < 15 ? 3000 : 500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(20);
            expect(stats.slowRequests).toBe(15);
            expect(stats.slowPercentage).toBe(0.75);
            expect(stats.earlyDetectionCount).toBe(0);
        });

        it('should limit outcome window size', () => {
            for (let i = 0; i < REQUEST_OUTCOME_WINDOW_SIZE + 10; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(REQUEST_OUTCOME_WINDOW_SIZE);
        });
    });

    describe('server management', () => {
        it('should handle multiple servers independently', () => {
            const serverUrl2 = 'https://test-server-2.com';

            for (let i = 0; i < 10; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            for (let i = 0; i < 10; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl2, `/api/request-${i}`);
                const metrics = createMockMetrics(i < 8 ? 3000 : 500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl2, requestId, metrics);
            }

            const state1 = performanceManager.getCurrentPerformanceState(serverUrl);
            const state2 = performanceManager.getCurrentPerformanceState(serverUrl2);

            expect(state1).toBe('normal');
            expect(state2).toBe('slow');

            performanceManager.removeServer(serverUrl2);
        });

        it('should clean up when server is removed', () => {
            const requestId = performanceManager.startRequestTracking(serverUrl, '/api/test');
            const metrics = createMockMetrics(500, 1000, 500);
            performanceManager.completeRequestTracking(serverUrl, requestId, metrics);

            performanceManager.removeServer(serverUrl);

            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(0);
        });
    });

    describe('observable behavior', () => {
        it('should emit state changes when performance changes', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            for (let i = 0; i < 10; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(i < 8 ? 3000 : 500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            subscription.unsubscribe();
            expect(states).toEqual(['normal', 'slow']);
        });
    });

    describe('AppState monitoring', () => {
        const {AppState} = require('react-native');
        let appStateHandler: (nextAppState: AppStateStatus) => void;

        beforeEach(() => {
            AppState.addEventListener.mockImplementation((event: string, handler: (nextAppState: AppStateStatus) => void) => {
                if (event === 'change') {
                    appStateHandler = handler;
                }
                return {remove: jest.fn()};
            });
        });

        it('should setup AppState monitoring on construction', () => {
            const manager = new NetworkPerformanceManagerSingleton();
            expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
            manager.destroy();
        });

        it('should clean up active requests when app goes to background', () => {
            performanceManager.startRequestTracking(serverUrl, '/api/test');

            expect(performanceManager.getActiveRequestCount(serverUrl)).toBe(1);

            appStateHandler('background');

            expect(performanceManager.getActiveRequestCount(serverUrl)).toBe(0);
        });

        it('should reset performance state to normal when app becomes inactive', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            for (let i = 0; i < 10; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(i < 8 ? 3000 : 500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            expect(performanceManager.getCurrentPerformanceState(serverUrl)).toBe('slow');

            appStateHandler('inactive');

            expect(performanceManager.getCurrentPerformanceState(serverUrl)).toBe('normal');
            subscription.unsubscribe();
        });

        it('should not clean up when app state is active', () => {
            const requestId = performanceManager.startRequestTracking(serverUrl, '/api/test');

            expect(performanceManager.getActiveRequestCount(serverUrl)).toBe(1);

            appStateHandler('active');

            expect(performanceManager.getActiveRequestCount(serverUrl)).toBe(1);

            performanceManager.cancelRequestTracking(serverUrl, requestId);
        });

        it('should clean up AppState subscription on destroy', () => {
            const mockRemove = jest.fn();
            AppState.addEventListener.mockReturnValue({remove: mockRemove});

            const manager = new NetworkPerformanceManagerSingleton();
            manager.destroy();

            expect(mockRemove).toHaveBeenCalled();
        });
    });
});
