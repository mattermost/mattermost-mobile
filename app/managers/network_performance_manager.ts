// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, type AppStateStatus, type NativeEventSubscription} from 'react-native';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged} from 'rxjs/operators';

import {logDebug} from '@utils/log';

import type {ClientResponseMetrics} from '@mattermost/react-native-network-client';

export type NetworkPerformanceState = 'normal' | 'slow';

interface ActiveRequest {
    id: string;
    url: string;
    startTime: number;
    checkTimer?: NodeJS.Timeout;
}

interface RequestOutcome {
    timestamp: number;
    isSlow: boolean;
    wasEarlyDetection: boolean;
}

const SLOW_REQUEST_THRESHOLD = 2000;
const SLOW_REQUEST_PERCENTAGE_THRESHOLD = 0.7;

// We use a count-based sliding window instead of time-based filtering to prevent
// flip-flopping between states. With the 70% threshold and 10 minimum requests,
// the network needs 7/10 new requests to be fast/slow to change state, regardless
// of how old previous requests are. This provides stable state transitions.
const REQUEST_OUTCOME_WINDOW_SIZE = 20;
const MINIMUM_REQUESTS_FOR_INITIAL_DETECTION = 4;
const MINIMUM_REQUESTS_FOR_SUBSEQUENT_DETECTION = 10;

const calculatePerformanceStateFromOutcomes = (outcomes: RequestOutcome[], isInitialDetection: boolean): NetworkPerformanceState => {
    const minimumRequests = isInitialDetection ? MINIMUM_REQUESTS_FOR_INITIAL_DETECTION : MINIMUM_REQUESTS_FOR_SUBSEQUENT_DETECTION;

    if (isInitialDetection && outcomes.length < minimumRequests) {
        return 'normal';
    }

    const slowRequestCount = outcomes.filter((outcome) => outcome.isSlow).length;
    const slowPercentage = slowRequestCount / outcomes.length;

    return slowPercentage >= SLOW_REQUEST_PERCENTAGE_THRESHOLD ? 'slow' : 'normal';
};

class NetworkPerformanceManagerSingleton {
    private performanceSubjects: Record<string, BehaviorSubject<NetworkPerformanceState>> = {};
    private activeRequests: Record<string, Record<string, ActiveRequest>> = {};
    private requestOutcomes: Record<string, RequestOutcome[]> = {};
    private initialRequestTimestamp: Record<string, number> = {};
    private isInitialDetection: Record<string, boolean> = {};
    private appStateSubscription: NativeEventSubscription | null = null;

    constructor() {
        this.setupAppStateMonitoring();
    }

    /**
     * Starts tracking a request for early performance detection.
     * Returns a unique request ID that should be used when the request completes.
     */
    public startRequestTracking = (serverUrl: string, url: string): string => {
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        if (!this.activeRequests[serverUrl]) {
            this.activeRequests[serverUrl] = {};
        }

        const request: ActiveRequest = {
            id: requestId,
            url,
            startTime: Date.now(),
        };

        request.checkTimer = setTimeout(() => {
            this.checkRequestLatency(serverUrl, requestId);
        }, SLOW_REQUEST_THRESHOLD);

        this.activeRequests[serverUrl][requestId] = request;
        return requestId;
    };

    /**
     * Completes request tracking and adds metrics for performance reporting.
     * Should be called when the request finishes with the ID from startRequestTracking.
     */
    public completeRequestTracking = (serverUrl: string, requestId: string, metrics: ClientResponseMetrics | undefined) => {
        const activeRequest = this.activeRequests[serverUrl]?.[requestId];
        const wasEarlyDetected = !activeRequest; // If not found, it was already early detected and removed

        this.clearActiveRequest(serverUrl, requestId);

        // Only record the outcome if it wasn't already recorded by early detection
        if (!wasEarlyDetected && metrics?.latency) {
            this.recordRequestOutcome(serverUrl, {
                timestamp: Date.now(),
                isSlow: metrics.latency >= SLOW_REQUEST_THRESHOLD,
                wasEarlyDetection: false,
            });
        }
    };

    /**
     * Cancels request tracking when a request fails.
     * Should be called when the request fails with the ID from startRequestTracking.
     */
    public cancelRequestTracking = (serverUrl: string, requestId: string) => {
        this.clearActiveRequest(serverUrl, requestId);
    };

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
     * Gets the current request outcome statistics for a server.
     */
    public getRequestOutcomeStats = (serverUrl: string) => {
        const outcomes = this.requestOutcomes[serverUrl] || [];
        if (!outcomes.length) {
            return {
                totalRequests: 0,
                slowRequests: 0,
                slowPercentage: 0,
                earlyDetectionCount: 0,
            };
        }

        const slowRequests = outcomes.filter((outcome) => outcome.isSlow).length;
        const earlyDetectionCount = outcomes.filter((outcome) => outcome.wasEarlyDetection).length;

        return {
            totalRequests: outcomes.length,
            slowRequests,
            slowPercentage: slowRequests / outcomes.length,
            earlyDetectionCount,
        };
    };

    /**
     * Gets the count of active requests for a server (for testing purposes).
     */
    public getActiveRequestCount = (serverUrl: string): number => {
        return Object.keys(this.activeRequests[serverUrl] || {}).length;
    };

    /**
     * Removes all data and subscriptions for a server.
     */
    public removeServer = (serverUrl: string) => {
        this.clearAllActiveRequests(serverUrl);
        if (this.performanceSubjects[serverUrl]) {
            this.performanceSubjects[serverUrl].complete();
            delete this.performanceSubjects[serverUrl];
        }
        delete this.requestOutcomes[serverUrl];
        delete this.initialRequestTimestamp[serverUrl];
        delete this.isInitialDetection[serverUrl];
    };

    /**
     * Cleans up all resources when the manager is being destroyed.
     */
    public destroy = () => {
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = null;
        }

        Object.keys(this.activeRequests).forEach((serverUrl) => {
            this.clearAllActiveRequests(serverUrl);
        });

        Object.keys(this.performanceSubjects).forEach((serverUrl) => {
            this.performanceSubjects[serverUrl].complete();
        });

        this.performanceSubjects = {};
        this.requestOutcomes = {};
        this.initialRequestTimestamp = {};
        this.isInitialDetection = {};
    };

    private checkRequestLatency = (serverUrl: string, requestId: string) => {
        const activeRequest = this.activeRequests[serverUrl]?.[requestId];
        if (!activeRequest) {
            return;
        }

        const currentTime = Date.now();
        const elapsedTime = currentTime - activeRequest.startTime;

        if (elapsedTime >= SLOW_REQUEST_THRESHOLD) {
            this.recordRequestOutcome(serverUrl, {
                timestamp: currentTime,
                isSlow: true,
                wasEarlyDetection: true,
            });

            this.clearActiveRequest(serverUrl, requestId);
        }
    };

    private clearActiveRequest = (serverUrl: string, requestId: string) => {
        const activeRequest = this.activeRequests[serverUrl]?.[requestId];
        if (activeRequest?.checkTimer) {
            clearTimeout(activeRequest.checkTimer);
        }
        if (this.activeRequests[serverUrl]) {
            delete this.activeRequests[serverUrl][requestId];
        }
    };

    private clearAllActiveRequests = (serverUrl: string) => {
        const requests = this.activeRequests[serverUrl];
        if (requests) {
            Object.values(requests).forEach((request) => {
                if (request.checkTimer) {
                    clearTimeout(request.checkTimer);
                }
            });
            delete this.activeRequests[serverUrl];
        }
    };

    private recordRequestOutcome = (serverUrl: string, outcome: RequestOutcome) => {
        if (!this.performanceSubjects[serverUrl]) {
            return;
        }

        if (!this.requestOutcomes[serverUrl]) {
            this.requestOutcomes[serverUrl] = [];
        }

        if (!this.initialRequestTimestamp[serverUrl] && outcome.isSlow) {
            this.initialRequestTimestamp[serverUrl] = outcome.timestamp;
        }

        this.requestOutcomes[serverUrl].push(outcome);

        if (this.requestOutcomes[serverUrl].length > REQUEST_OUTCOME_WINDOW_SIZE) {
            this.requestOutcomes[serverUrl] = this.requestOutcomes[serverUrl].slice(-REQUEST_OUTCOME_WINDOW_SIZE);
        }

        const outcomes = this.requestOutcomes[serverUrl];
        const currentPerformanceState = this.getCurrentPerformanceState(serverUrl);
        const isInitialDetection = !this.isInitialDetection[serverUrl];
        const newPerformanceState = calculatePerformanceStateFromOutcomes(outcomes, isInitialDetection);

        if (currentPerformanceState !== newPerformanceState && newPerformanceState === 'slow') {
            const stats = this.getRequestOutcomeStats(serverUrl);
            const detectionDelayMs = outcome.timestamp - this.initialRequestTimestamp[serverUrl];

            logDebug(`Network performance degraded for ${serverUrl}: ${currentPerformanceState} -> ${newPerformanceState}`, {
                totalRequests: stats.totalRequests,
                slowRequests: stats.slowRequests,
                slowPercentage: `${(stats.slowPercentage * 100).toFixed(1)}%`,
                earlyDetectionCount: stats.earlyDetectionCount,
                currentTimestamp: Date.now(),
                detectionDelayMs,
                detectionDelaySeconds: `${(detectionDelayMs / 1000).toFixed(1)}s`,
                lastOutcome: {
                    isSlow: outcome.isSlow,
                    wasEarlyDetection: outcome.wasEarlyDetection,
                },
            });

            this.isInitialDetection[serverUrl] = true;
            delete this.initialRequestTimestamp[serverUrl];
        }

        this.getPerformanceSubject(serverUrl).next(newPerformanceState);
    };

    private getPerformanceSubject = (serverUrl: string) => {
        if (!this.performanceSubjects[serverUrl]) {
            this.performanceSubjects[serverUrl] = new BehaviorSubject<NetworkPerformanceState>('normal');
        }
        return this.performanceSubjects[serverUrl];
    };

    private setupAppStateMonitoring = () => {
        this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    };

    private handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState !== 'active') {
            this.cleanupOnAppStateChange();
        }
    };

    private cleanupOnAppStateChange = () => {
        Object.keys(this.activeRequests).forEach((serverUrl) => {
            this.clearAllActiveRequests(serverUrl);
        });

        Object.keys(this.performanceSubjects).forEach((serverUrl) => {
            this.performanceSubjects[serverUrl].next('normal');
        });
    };
}

export const testExports = {
    NetworkPerformanceManagerSingleton,
    SLOW_REQUEST_THRESHOLD,
    REQUEST_OUTCOME_WINDOW_SIZE,
    MINIMUM_REQUESTS_FOR_INITIAL_DETECTION,
    MINIMUM_REQUESTS_FOR_SUBSEQUENT_DETECTION,
    calculatePerformanceStateFromOutcomes,
};

const NetworkPerformanceManager = new NetworkPerformanceManagerSingleton();
export default NetworkPerformanceManager;
