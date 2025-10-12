// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, type AppStateStatus, type NativeEventSubscription} from 'react-native';
import {BehaviorSubject, type Subscription} from 'rxjs';
import {distinctUntilChanged, filter} from 'rxjs/operators';

import {observeLowConnectivityMonitor} from '@queries/app/global';
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

const SLOW_REQUEST_THRESHOLD = 800;
const EARLY_DETECTION_SLOW_THRESHOLD = 2000;
const SLOW_REQUEST_PERCENTAGE_THRESHOLD = 0.7;
const REQUEST_OUTCOME_WINDOW_SIZE = 20;
const MINIMUM_REQUESTS_FOR_INITIAL_DETECTION = 4;
const MINIMUM_REQUESTS_FOR_SUBSEQUENT_DETECTION = 10;

const calculatePerformanceStateFromOutcomes = (outcomes: RequestOutcome[], isInitialDetection: boolean, currentState: NetworkPerformanceState): NetworkPerformanceState => {
    const minimumRequests = isInitialDetection ? MINIMUM_REQUESTS_FOR_INITIAL_DETECTION : MINIMUM_REQUESTS_FOR_SUBSEQUENT_DETECTION;

    if (outcomes.length < minimumRequests) {
        return currentState;
    }

    const recentOutcomes = outcomes.slice(-minimumRequests);
    const slowRequestCount = recentOutcomes.filter((outcome) => outcome.isSlow).length;
    const slowPercentage = slowRequestCount / recentOutcomes.length;

    return slowPercentage >= SLOW_REQUEST_PERCENTAGE_THRESHOLD ? 'slow' : 'normal';
};

class NetworkPerformanceManagerSingleton {
    private performanceSubjects: Record<string, BehaviorSubject<NetworkPerformanceState>> = {};
    private activeRequests: Record<string, Record<string, ActiveRequest>> = {};
    private requestOutcomes: Record<string, RequestOutcome[]> = {};
    private totalRequestCount: Record<string, number> = {};
    private initialRequestTimestamp: Record<string, number> = {};
    private isInitialDetection: Record<string, boolean> = {};
    private appStateSubscription: NativeEventSubscription | null = null;
    private lowConnectivityMonitorEnabled = true;
    private monitorSubscription: Subscription | null = null;

    constructor() {
        this.setupAppStateMonitoring();
        this.setupMonitorObserver();
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
        }, EARLY_DETECTION_SLOW_THRESHOLD);

        this.activeRequests[serverUrl][requestId] = request;
        return requestId;
    };

    /**
     * Completes request tracking and adds metrics for performance reporting.
     * Should be called when the request finishes with the ID from startRequestTracking.
     */
    public completeRequestTracking = (serverUrl: string, requestId: string, metrics: ClientResponseMetrics) => {
        const activeRequest = this.activeRequests[serverUrl]?.[requestId];
        const wasEarlyDetected = !activeRequest; // If not found, it was already early detected and removed

        this.clearActiveRequest(serverUrl, requestId);

        // Only record the outcome if it wasn't already recorded by early detection
        if (!wasEarlyDetected) {
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
     * Only emits when low connectivity monitoring is enabled.
     */
    public observePerformanceState = (serverUrl: string) => {
        return this.getPerformanceSubject(serverUrl).asObservable().pipe(
            filter(() => this.lowConnectivityMonitorEnabled),
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
    public getRequestOutcomeStats = (serverUrl: string, useRecentOnly = false) => {
        let outcomes = this.requestOutcomes[serverUrl] || [];

        if (useRecentOnly && outcomes.length > 0) {
            const isInitialDetection = !this.isInitialDetection[serverUrl];
            const minimumRequests = isInitialDetection ? MINIMUM_REQUESTS_FOR_INITIAL_DETECTION : MINIMUM_REQUESTS_FOR_SUBSEQUENT_DETECTION;
            outcomes = outcomes.slice(-minimumRequests);
        }

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
        delete this.totalRequestCount[serverUrl];
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

        if (this.monitorSubscription) {
            this.monitorSubscription.unsubscribe();
            this.monitorSubscription = null;
        }

        Object.keys(this.activeRequests).forEach((serverUrl) => {
            this.clearAllActiveRequests(serverUrl);
        });

        Object.keys(this.performanceSubjects).forEach((serverUrl) => {
            this.performanceSubjects[serverUrl].complete();
        });

        this.performanceSubjects = {};
        this.requestOutcomes = {};
        this.totalRequestCount = {};
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

        if (elapsedTime >= EARLY_DETECTION_SLOW_THRESHOLD) {
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

        if (!this.totalRequestCount[serverUrl]) {
            this.totalRequestCount[serverUrl] = 0;
        }

        if (!this.initialRequestTimestamp[serverUrl] && outcome.isSlow) {
            this.initialRequestTimestamp[serverUrl] = outcome.timestamp;
        }

        this.requestOutcomes[serverUrl].push(outcome);
        this.totalRequestCount[serverUrl]++;

        if (this.requestOutcomes[serverUrl].length > REQUEST_OUTCOME_WINDOW_SIZE) {
            this.requestOutcomes[serverUrl] = this.requestOutcomes[serverUrl].slice(-REQUEST_OUTCOME_WINDOW_SIZE);
        }

        const outcomes = this.requestOutcomes[serverUrl];
        const currentPerformanceState = this.getCurrentPerformanceState(serverUrl);
        const isInitialDetection = !this.isInitialDetection[serverUrl];
        const newPerformanceState = calculatePerformanceStateFromOutcomes(outcomes, isInitialDetection, currentPerformanceState);

        if (currentPerformanceState !== newPerformanceState) {
            const stats = this.getRequestOutcomeStats(serverUrl, true);
            const statusChange = newPerformanceState === 'slow' ? 'degraded' : 'improved';

            const logData: Record<string, unknown> = {
                totalRequests: stats.totalRequests,
                slowRequests: stats.slowRequests,
                slowPercentage: `${(stats.slowPercentage * 100).toFixed(1)}%`,
                earlyDetectionCount: stats.earlyDetectionCount,
                lastOutcome: {
                    isSlow: outcome.isSlow,
                    wasEarlyDetection: outcome.wasEarlyDetection,
                },
            };

            if (newPerformanceState === 'slow') {
                const detectionDelayMs = outcome.timestamp - this.initialRequestTimestamp[serverUrl];
                logData.currentTimestamp = Date.now();
                logData.detectionDelayMs = detectionDelayMs;
                logData.detectionDelaySeconds = `${(detectionDelayMs / 1000).toFixed(1)}s`;

                this.isInitialDetection[serverUrl] = true;
                delete this.initialRequestTimestamp[serverUrl];
            }

            logDebug(`Network performance ${statusChange} for ${serverUrl}: ${currentPerformanceState} -> ${newPerformanceState}`, logData);
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

    private setupMonitorObserver = () => {
        this.monitorSubscription = observeLowConnectivityMonitor().subscribe((enabled) => {
            this.lowConnectivityMonitorEnabled = enabled;
        });
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
    EARLY_DETECTION_SLOW_THRESHOLD,
    REQUEST_OUTCOME_WINDOW_SIZE,
    MINIMUM_REQUESTS_FOR_INITIAL_DETECTION,
    MINIMUM_REQUESTS_FOR_SUBSEQUENT_DETECTION,
    calculatePerformanceStateFromOutcomes,
};

const NetworkPerformanceManager = new NetworkPerformanceManagerSingleton();
export default NetworkPerformanceManager;
