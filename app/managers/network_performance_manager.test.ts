// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {testExports} from './network_performance_manager';

import type {ClientResponseMetrics} from '@mattermost/react-native-network-client';

const {
    NetworkPerformanceManagerSingleton,
    REPORT_INTERVAL,
    shouldReportMetrics,
    calculatePerformanceState,
    createAccumulatedMetrics,
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

    describe('shouldReportMetrics', () => {
        it('should report every 10 requests', () => {
            expect(shouldReportMetrics(REPORT_INTERVAL)).toBe(true);
            expect(shouldReportMetrics(REPORT_INTERVAL * 2)).toBe(true);
            expect(shouldReportMetrics(REPORT_INTERVAL * 3)).toBe(true);
        });

        it('should not report between every 10 requests', () => {
            expect(shouldReportMetrics(REPORT_INTERVAL - 1)).toBe(false);
            expect(shouldReportMetrics((REPORT_INTERVAL * 2) - 1)).toBe(false);
            expect(shouldReportMetrics((REPORT_INTERVAL * 3) - 1)).toBe(false);
        });
    });

    describe('calculatePerformanceState', () => {
        const metrics = {
            averageLatency: 500,
            requestCount: 10,
            timestamp: Date.now(),
        };

        it('should return normal for good latency', () => {
            const state = calculatePerformanceState(metrics);
            expect(state).toBe('normal');
        });

        it('should return slow for high latency', () => {
            const slowMetrics = {...metrics, averageLatency: 4000};
            const state = calculatePerformanceState(slowMetrics);
            expect(state).toBe('slow');
        });
    });

    describe('createAccumulatedMetrics', () => {
        it('should create empty accumulated metrics', () => {
            const metrics = createAccumulatedMetrics();
            expect(metrics).toEqual({
                totalLatency: 0,
                requestCount: 0,
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

    beforeEach(() => {
        performanceManager.removeServer(serverUrl);
    });

    afterEach(() => {
        performanceManager.removeServer(serverUrl);
    });

    describe('metrics accumulation', () => {
        it('should accumulate metrics correctly', () => {
            const metrics1 = createMockMetrics(500, 1000, 500);
            const metrics2 = createMockMetrics(1000, 2000, 1000);

            performanceManager.addMetrics(serverUrl, metrics1);
            performanceManager.addMetrics(serverUrl, metrics2);

            const currentMetrics = performanceManager.getCurrentMetrics(serverUrl);
            expect(currentMetrics).toEqual({
                totalLatency: 1500,
                requestCount: 2,
            });
        });

    });

    describe('reporting thresholds', () => {
        it('should report after initial count', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            // Add exactly INITIAL_REPORT_COUNT metrics
            for (let i = 0; i < REPORT_INTERVAL; i++) {
                performanceManager.addMetrics(serverUrl, createMockMetrics(500, 1000, 500));
            }

            subscription.unsubscribe();
            expect(states).toContain('normal'); // Should have reported
        });

        it('should report every subsequent count after initial', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            // Add initial batch
            for (let i = 0; i < REPORT_INTERVAL; i++) {
                performanceManager.addMetrics(serverUrl, createMockMetrics(500, 1000, 500));
            }

            // Add subsequent batch with different performance to trigger emission
            for (let i = 0; i < REPORT_INTERVAL; i++) {
                performanceManager.addMetrics(serverUrl, createMockMetrics(4000, 1000, 500));
            }

            subscription.unsubscribe();
            expect(states).toHaveLength(2); // Initial + one subsequent report
        });
    });

    describe('performance state calculation', () => {
        it('should return normal for good metrics', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            // Add metrics with good performance
            for (let i = 0; i < REPORT_INTERVAL; i++) {
                performanceManager.addMetrics(serverUrl, createMockMetrics(500, 1000, 500));
            }

            subscription.unsubscribe();
            expect(states).toContain('normal');
        });

        it('should return slow for high latency', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            // Add metrics with high latency (above 3000ms threshold)
            for (let i = 0; i < REPORT_INTERVAL; i++) {
                performanceManager.addMetrics(serverUrl, createMockMetrics(4000, 1000, 500));
            }

            subscription.unsubscribe();
            expect(states).toContain('slow');
        });

        it('should return slow for very high latency', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            // Add metrics with very high latency
            for (let i = 0; i < REPORT_INTERVAL; i++) {
                performanceManager.addMetrics(serverUrl, createMockMetrics(4000, 1000, 500));
            }

            subscription.unsubscribe();
            expect(states).toContain('slow');
        });

    });

    describe('history management', () => {
        it('should maintain performance history', () => {
            // Add initial batch
            for (let i = 0; i < REPORT_INTERVAL; i++) {
                performanceManager.addMetrics(serverUrl, createMockMetrics(500, 1000, 500));
            }

            const history = performanceManager.getPerformanceHistory(serverUrl);
            expect(history).toHaveLength(1);
            expect(history[0].requestCount).toBe(REPORT_INTERVAL);
            expect(history[0].averageLatency).toBe(500);
        });

        it('should limit history size', () => {
            // Add multiple batches to exceed history limit
            for (let batch = 0; batch < 15; batch++) {
                for (let i = 0; i < REPORT_INTERVAL; i++) {
                    performanceManager.addMetrics(serverUrl, createMockMetrics(500, 1000, 500));
                }
            }

            const history = performanceManager.getPerformanceHistory(serverUrl);
            expect(history.length).toBeLessThanOrEqual(10); // HISTORY_LIMIT
        });
    });

    describe('server management', () => {
        it('should handle multiple servers independently', () => {
            const serverUrl2 = 'https://test-server-2.com';

            // Add metrics to both servers
            for (let i = 0; i < REPORT_INTERVAL; i++) {
                performanceManager.addMetrics(serverUrl, createMockMetrics(500, 1000, 500));
                performanceManager.addMetrics(serverUrl2, createMockMetrics(4000, 1000, 500));
            }

            const state1 = performanceManager.getCurrentPerformanceState(serverUrl);
            const state2 = performanceManager.getCurrentPerformanceState(serverUrl2);

            expect(state1).toBe('normal');
            expect(state2).toBe('slow');

            performanceManager.removeServer(serverUrl2);
        });

        it('should clean up when server is removed', () => {
            // Add some data
            for (let i = 0; i < REPORT_INTERVAL; i++) {
                performanceManager.addMetrics(serverUrl, createMockMetrics(500, 1000, 500));
            }

            performanceManager.removeServer(serverUrl);

            expect(performanceManager.getCurrentMetrics(serverUrl)).toBeUndefined();
            expect(performanceManager.getPerformanceHistory(serverUrl)).toEqual([]);
        });
    });

    describe('observable behavior', () => {
        it('should emit state changes when performance changes', () => {
            const states: string[] = [];
            const subscription = performanceManager.observePerformanceState(serverUrl).subscribe((state) => {
                states.push(state);
            });

            // Add first batch of 10 requests - should emit 'normal'
            for (let i = 0; i < REPORT_INTERVAL; i++) {
                performanceManager.addMetrics(serverUrl, createMockMetrics(500, 1000, 500));
            }

            // Add second batch with different performance - should emit 'slow'
            for (let i = 0; i < REPORT_INTERVAL; i++) {
                performanceManager.addMetrics(serverUrl, createMockMetrics(4000, 1000, 500));
            }

            subscription.unsubscribe();
            expect(states).toEqual(['normal', 'slow']); // Should emit both states
        });
    });
});
