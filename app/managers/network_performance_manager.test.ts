// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {testExports} from './network_performance_manager';

import type {ClientResponseMetrics} from '@mattermost/react-native-network-client';
import type {AppStateStatus} from 'react-native';

jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
}));

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
    MINIMUM_REQUESTS_FOR_INITIAL_DETECTION,
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
        describe('initial detection', () => {
            it('should return normal when not enough requests for initial detection', () => {
                const outcomes = [
                    {timestamp: Date.now(), isSlow: true, wasEarlyDetection: false},
                    {timestamp: Date.now(), isSlow: true, wasEarlyDetection: false},
                ];

                const state = calculatePerformanceStateFromOutcomes(outcomes, true);
                expect(state).toBe('normal');
            });

            it('should return slow when initial detection threshold is met', () => {
                const outcomes = Array.from({length: MINIMUM_REQUESTS_FOR_INITIAL_DETECTION}, (_, i) => ({
                    timestamp: Date.now(),
                    isSlow: i < 3, // 3 out of 4 = 75%
                    wasEarlyDetection: false,
                }));

                const state = calculatePerformanceStateFromOutcomes(outcomes, true);
                expect(state).toBe('slow');
            });

            it('should return normal when initial detection threshold is met but percentage is low', () => {
                const outcomes = Array.from({length: MINIMUM_REQUESTS_FOR_INITIAL_DETECTION}, (_, i) => ({
                    timestamp: Date.now(),
                    isSlow: i < 2, // 2 out of 4 = 50%
                    wasEarlyDetection: false,
                }));

                const state = calculatePerformanceStateFromOutcomes(outcomes, true);
                expect(state).toBe('normal');
            });
        });

        describe('subsequent detection', () => {
            it('should return slow even with fewer requests than subsequent threshold', () => {
                const outcomes = Array.from({length: 6}, (_, i) => ({
                    timestamp: Date.now(),
                    isSlow: i < 5, // 5 out of 6 = 83%
                    wasEarlyDetection: false,
                }));

                const state = calculatePerformanceStateFromOutcomes(outcomes, false);
                expect(state).toBe('slow');
            });

            it('should return normal when slow percentage is below threshold', () => {
                const outcomes = Array.from({length: 10}, (_, i) => ({
                    timestamp: Date.now(),
                    isSlow: i < 3, // 3 out of 10 = 30%
                    wasEarlyDetection: false,
                }));

                const state = calculatePerformanceStateFromOutcomes(outcomes, false);
                expect(state).toBe('normal');
            });

            it('should return slow when slow percentage meets threshold', () => {
                const outcomes = Array.from({length: 10}, (_, i) => ({
                    timestamp: Date.now(),
                    isSlow: i < 7, // 7 out of 10 = 70%
                    wasEarlyDetection: false,
                }));

                const state = calculatePerformanceStateFromOutcomes(outcomes, false);
                expect(state).toBe('slow');
            });

            it('should return slow when slow percentage exceeds threshold', () => {
                const outcomes = Array.from({length: 10}, (_, i) => ({
                    timestamp: Date.now(),
                    isSlow: i < 8, // 8 out of 10 = 80%
                    wasEarlyDetection: false,
                }));

                const state = calculatePerformanceStateFromOutcomes(outcomes, false);
                expect(state).toBe('slow');
            });
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
            performanceManager.observePerformanceState(serverUrl);

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
            performanceManager.observePerformanceState(serverUrl);

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

        it('should use initial detection threshold for first slow detection', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            for (let i = 0; i < MINIMUM_REQUESTS_FOR_INITIAL_DETECTION; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(i < 3 ? 3000 : 500, 1000, 500); // 3 out of 4 = 75%
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            subscription.unsubscribe();
            expect(states).toEqual(['normal', 'slow']);
        });

        it('should not return to normal when switching from initial to subsequent detection', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            for (let i = 0; i < MINIMUM_REQUESTS_FOR_INITIAL_DETECTION; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(i < 3 ? 3000 : 500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            for (let i = 0; i < 4; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-extra-${i}`);
                const metrics = createMockMetrics(i < 3 ? 3000 : 500, 1000, 500); // 3 more slow out of 4
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            subscription.unsubscribe();

            expect(states.filter((s) => s === 'normal')).toHaveLength(1);
            expect(states).toEqual(['normal', 'slow']);
        });
    });

    describe('outcome statistics', () => {
        it('should provide accurate request outcome statistics', () => {
            performanceManager.observePerformanceState(serverUrl);

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
            performanceManager.observePerformanceState(serverUrl);

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

            performanceManager.observePerformanceState(serverUrl);
            performanceManager.observePerformanceState(serverUrl2);

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

        it('should not recreate storage when request completes after server removal', () => {
            performanceManager.observePerformanceState(serverUrl);

            const requestId = performanceManager.startRequestTracking(serverUrl, '/api/test');

            performanceManager.removeServer(serverUrl);

            const metrics = createMockMetrics(3000, 1000, 500);
            performanceManager.completeRequestTracking(serverUrl, requestId, metrics);

            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(0);

            const state = performanceManager.getCurrentPerformanceState(serverUrl);
            expect(state).toBe('normal');
        });

        it('should not recreate storage when early detection timer fires after server removal', () => {
            jest.useFakeTimers();

            performanceManager.observePerformanceState(serverUrl);

            performanceManager.startRequestTracking(serverUrl, '/api/test');

            performanceManager.removeServer(serverUrl);

            jest.advanceTimersByTime(2000);

            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(0);

            const state = performanceManager.getCurrentPerformanceState(serverUrl);
            expect(state).toBe('normal');

            jest.useRealTimers();
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

    describe('debug logging', () => {
        const {logDebug} = require('@utils/log');

        beforeEach(() => {
            logDebug.mockClear();
        });

        it('should log when performance state degrades from normal to slow', () => {
            performanceManager.observePerformanceState(serverUrl);

            for (let i = 0; i < 10; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(i < 8 ? 3000 : 500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            expect(logDebug).toHaveBeenCalledWith(
                `Network performance degraded for ${serverUrl}: normal -> slow`,
                expect.objectContaining({
                    totalRequests: expect.any(Number),
                    slowRequests: expect.any(Number),
                    slowPercentage: expect.any(String),
                    earlyDetectionCount: expect.any(Number),
                    lastOutcome: expect.objectContaining({
                        isSlow: expect.any(Boolean),
                        wasEarlyDetection: expect.any(Boolean),
                    }),
                }),
            );
        });

        it('should not log when performance state remains the same', () => {
            for (let i = 0; i < 3; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            expect(logDebug).not.toHaveBeenCalled();
        });

        it('should log with correct details when performance degrades', () => {
            performanceManager.observePerformanceState(serverUrl);

            for (let i = 0; i < MINIMUM_REQUESTS_FOR_INITIAL_DETECTION; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(3000, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            expect(logDebug).toHaveBeenCalledWith(
                `Network performance degraded for ${serverUrl}: normal -> slow`,
                expect.objectContaining({
                    totalRequests: MINIMUM_REQUESTS_FOR_INITIAL_DETECTION,
                    slowRequests: MINIMUM_REQUESTS_FOR_INITIAL_DETECTION,
                    slowPercentage: '100.0%',
                    earlyDetectionCount: 0,
                    currentTimestamp: expect.any(Number),
                    detectionDelayMs: expect.any(Number),
                    detectionDelaySeconds: expect.any(String),
                    lastOutcome: {
                        isSlow: true,
                        wasEarlyDetection: false,
                    },
                }),
            );
        });

        it('should not log when performance recovers from slow to normal', () => {
            for (let i = 0; i < MINIMUM_REQUESTS_FOR_INITIAL_DETECTION; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/request-${i}`);
                const metrics = createMockMetrics(3000, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            logDebug.mockClear();
            for (let i = 0; i < 20; i++) {
                const requestId = performanceManager.startRequestTracking(serverUrl, `/api/fast-${i}`);
                const metrics = createMockMetrics(500, 1000, 500);
                performanceManager.completeRequestTracking(serverUrl, requestId, metrics);
            }

            expect(logDebug).not.toHaveBeenCalled();
        });
    });

    describe('early detection', () => {
        it('should detect slow request early when timer fires before completion', () => {
            jest.useFakeTimers();

            performanceManager.observePerformanceState(serverUrl);

            // Start requests that will be slow
            for (let i = 0; i < MINIMUM_REQUESTS_FOR_INITIAL_DETECTION; i++) {
                performanceManager.startRequestTracking(serverUrl, `/api/slow-${i}`);
            }

            // Advance time past the slow request threshold
            jest.advanceTimersByTime(2000);

            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(MINIMUM_REQUESTS_FOR_INITIAL_DETECTION);
            expect(stats.slowRequests).toBe(MINIMUM_REQUESTS_FOR_INITIAL_DETECTION);
            expect(stats.earlyDetectionCount).toBe(MINIMUM_REQUESTS_FOR_INITIAL_DETECTION);
            expect(performanceManager.getActiveRequestCount(serverUrl)).toBe(0);

            jest.useRealTimers();
        });

        it('should not record outcome when completing request that was already early detected', () => {
            jest.useFakeTimers();

            performanceManager.observePerformanceState(serverUrl);

            const requestId = performanceManager.startRequestTracking(serverUrl, '/api/test');

            // Advance time to trigger early detection
            jest.advanceTimersByTime(2000);

            // Now complete the request (simulate it finally finishing)
            const metrics = createMockMetrics(2500, 1000, 500);
            performanceManager.completeRequestTracking(serverUrl, requestId, metrics);

            // Should still only have 1 outcome (from early detection, not from completion)
            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(1);
            expect(stats.earlyDetectionCount).toBe(1);

            jest.useRealTimers();
        });

        it('should handle early detection in performance state calculation', () => {
            jest.useFakeTimers();

            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            // Start enough slow requests to trigger initial detection
            for (let i = 0; i < MINIMUM_REQUESTS_FOR_INITIAL_DETECTION; i++) {
                performanceManager.startRequestTracking(serverUrl, `/api/early-${i}`);
            }

            // Trigger early detection
            jest.advanceTimersByTime(2000);

            expect(states).toContain('slow');

            subscription.unsubscribe();
            jest.useRealTimers();
        });
    });

    describe('metrics handling', () => {
        it('should not record outcome when metrics is undefined', () => {
            performanceManager.observePerformanceState(serverUrl);

            const requestId = performanceManager.startRequestTracking(serverUrl, '/api/test');
            performanceManager.completeRequestTracking(serverUrl, requestId, undefined);

            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(0);
        });

        it('should not record outcome when metrics.latency is undefined', () => {
            performanceManager.observePerformanceState(serverUrl);

            const requestId = performanceManager.startRequestTracking(serverUrl, '/api/test');
            const metricsWithoutLatency = {
                ...createMockMetrics(500, 1000, 500),
                latency: undefined as unknown as number,
            };

            performanceManager.completeRequestTracking(serverUrl, requestId, metricsWithoutLatency);

            const stats = performanceManager.getRequestOutcomeStats(serverUrl);
            expect(stats.totalRequests).toBe(0);
        });
    });

    describe('destroy method', () => {
        it('should clean up multiple servers with active requests', () => {
            const serverUrl2 = 'https://test-server-2.com';

            performanceManager.observePerformanceState(serverUrl);
            performanceManager.observePerformanceState(serverUrl2);

            performanceManager.startRequestTracking(serverUrl, '/api/test1');
            performanceManager.startRequestTracking(serverUrl2, '/api/test2');

            expect(performanceManager.getActiveRequestCount(serverUrl)).toBe(1);
            expect(performanceManager.getActiveRequestCount(serverUrl2)).toBe(1);

            performanceManager.destroy();

            expect(performanceManager.getActiveRequestCount(serverUrl)).toBe(0);
            expect(performanceManager.getActiveRequestCount(serverUrl2)).toBe(0);
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
