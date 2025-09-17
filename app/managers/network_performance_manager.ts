// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged} from 'rxjs/operators';

import type {ClientResponseMetrics} from '@mattermost/react-native-network-client';

export type NetworkPerformanceState = 'normal' | 'slow';

interface NetworkPerformanceMetrics {
    averageLatency: number;
    requestCount: number;
    timestamp: number;
}

interface AccumulatedMetrics {
    totalLatency: number;
    requestCount: number;
}

const SLOW_LATENCY_THRESHOLD = 3000;

const REPORT_INTERVAL = 3;
const HISTORY_LIMIT = 10;

const shouldReportMetrics = (requestCount: number): boolean => {
    return requestCount % REPORT_INTERVAL === 0;
};

const calculatePerformanceState = (metrics: NetworkPerformanceMetrics): NetworkPerformanceState => {
    const {averageLatency} = metrics;

    if (averageLatency >= SLOW_LATENCY_THRESHOLD) {
        return 'slow';
    }

    return 'normal';
};

const createAccumulatedMetrics = (): AccumulatedMetrics => ({
    totalLatency: 0,
    requestCount: 0,
});

class NetworkPerformanceManagerSingleton {
    private performanceSubjects: Record<string, BehaviorSubject<NetworkPerformanceState>> = {};
    private metricsHistory: Record<string, NetworkPerformanceMetrics[]> = {};
    private currentMetrics: Record<string, AccumulatedMetrics> = {};

    /**
     * Adds network request metrics and triggers performance reporting when thresholds are met.
     * Reports every 10 requests.
     */
    public addMetrics = (serverUrl: string, metrics: ClientResponseMetrics) => {
        if (!this.currentMetrics[serverUrl]) {
            this.currentMetrics[serverUrl] = createAccumulatedMetrics();
        }

        const current = this.currentMetrics[serverUrl];

        current.totalLatency += metrics.latency;
        current.requestCount += 1;

        if (shouldReportMetrics(current.requestCount)) {
            this.reportPerformanceMetrics(serverUrl);
        }
    };

    private reportPerformanceMetrics(serverUrl: string) {
        const current = this.currentMetrics[serverUrl];
        if (!current || current.requestCount === 0) {
            return;
        }

        const metrics: NetworkPerformanceMetrics = {
            averageLatency: current.totalLatency / current.requestCount,
            requestCount: current.requestCount,
            timestamp: Date.now(),
        };

        if (!this.metricsHistory[serverUrl]) {
            this.metricsHistory[serverUrl] = [];
        }
        this.metricsHistory[serverUrl].push(metrics);

        if (this.metricsHistory[serverUrl].length > HISTORY_LIMIT) {
            this.metricsHistory[serverUrl] = this.metricsHistory[serverUrl].slice(-HISTORY_LIMIT);
        }

        const performanceState = calculatePerformanceState(metrics);
        this.getPerformanceSubject(serverUrl).next(performanceState);

        this.currentMetrics[serverUrl] = createAccumulatedMetrics();
    }

    /**
     * Returns an observable that emits network performance state changes.
     * Emits 'normal' or 'slow' based on current performance metrics.
     */
    public observePerformanceState = (serverUrl: string) => {
        return this.getPerformanceSubject(serverUrl).asObservable().pipe(
            distinctUntilChanged(),
        );
    };

    /**
     * Gets the current network performance state for a server.
     */
    public getCurrentPerformanceState = (serverUrl: string): NetworkPerformanceState => {
        return this.getPerformanceSubject(serverUrl).getValue();
    };

    /**
     * Gets the historical performance metrics for a server.
     */
    public getPerformanceHistory = (serverUrl: string): NetworkPerformanceMetrics[] => {
        return this.metricsHistory[serverUrl] || [];
    };

    /**
     * Gets the current accumulated metrics for a server.
     */
    public getCurrentMetrics = (serverUrl: string) => {
        return this.currentMetrics[serverUrl];
    };

    /**
     * Removes all data and subscriptions for a server.
     */
    public removeServer = (serverUrl: string) => {
        if (this.performanceSubjects[serverUrl]) {
            this.performanceSubjects[serverUrl].complete();
            delete this.performanceSubjects[serverUrl];
        }
        delete this.metricsHistory[serverUrl];
        delete this.currentMetrics[serverUrl];
    };

    private getPerformanceSubject = (serverUrl: string) => {
        if (!this.performanceSubjects[serverUrl]) {
            this.performanceSubjects[serverUrl] = new BehaviorSubject<NetworkPerformanceState>('normal');
        }
        return this.performanceSubjects[serverUrl];
    };
}

export const testExports = {
    NetworkPerformanceManagerSingleton,
    SLOW_LATENCY_THRESHOLD,
    REPORT_INTERVAL,
    shouldReportMetrics,
    calculatePerformanceState,
    createAccumulatedMetrics,
};

const NetworkPerformanceManager = new NetworkPerformanceManagerSingleton();
export default NetworkPerformanceManager;
