// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, Platform} from 'react-native';

import {CollectNetworkMetrics} from '@assets/config.json';
import {Events} from '@constants';
import {t} from '@i18n';
import {setServerCredentials} from '@init/credentials';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {NetworkRequestMetrics} from '@managers/performance_metrics_manager/constant';
import {isErrorWithStatusCode} from '@utils/errors';
import {getFormattedFileSize} from '@utils/file';
import {logDebug, logInfo} from '@utils/log';
import {semverFromServerVersion} from '@utils/server';

import * as ClientConstants from './constants';
import ClientError from './error';

import type {APIClientInterface, ClientHeaders, ClientResponse, ClientResponseMetrics, RequestOptions} from '@mattermost/react-native-network-client';

type UrlData = {
    count: number;
    metrics?: ClientResponseMetrics;
}

type GroupData = {
    activeCount: number;
    startTime: number;
    totalSize: number;
    totalCompressedSize: number;
    urls: Record<string, UrlData>;
    completionFlag: boolean;
    completionTimer?: NodeJS.Timeout;
}

/**
 * ParallelGroup
 * @typedef {Object} ParallelGroup
 * @property {number} startTime is the start time of all requests in the group
 * @property {number} endTime is min end time of all requests in the group
 * @property {number} latency is the max latency (in ms)
 * @property {ClientResponseMetrics[]} requests is the list of requests in the group
 */
type ParallelGroup = {
    startTime: number;
    endTime: number;
    latency: number;
    requests: ClientResponseMetrics[];
}

type CategorizedRequestsResult = {
    parallelGroups: ParallelGroup[];
    maxConcurrency: number;
};

export const testExports = {
    ParallelGroup: {} as ParallelGroup,
};

export default class ClientTracking {
    apiClient: APIClientInterface;
    csrfToken = '';
    requestHeaders: {[x: string]: string} = {};
    serverVersion = '';
    urlVersion = '/api/v4';
    enableLogging = false;

    requestGroups: Map<string, GroupData> = new Map();

    constructor(apiClient: APIClientInterface) {
        this.apiClient = apiClient;
    }

    setBearerToken(bearerToken: string) {
        this.requestHeaders[ClientConstants.HEADER_AUTH] = `${ClientConstants.HEADER_BEARER} ${bearerToken}`;
        setServerCredentials(this.apiClient.baseUrl, bearerToken);
    }

    setCSRFToken(csrfToken: string) {
        this.csrfToken = csrfToken;
    }

    getRequestHeaders(requestMethod: string) {
        const headers = {...this.requestHeaders};

        headers[ClientConstants.HEADER_ACCEPT]= 'application/json';

        if (this.csrfToken && requestMethod.toLowerCase() !== 'get') {
            headers[ClientConstants.HEADER_X_CSRF_TOKEN] = this.csrfToken;
        }

        return headers;
    }

    initTrackGroup(groupLabel: RequestGroupLabel) {
        if (!this.requestGroups.has(groupLabel)) {
            this.requestGroups.set(groupLabel, {
                activeCount: 0,
                startTime: Date.now(),
                totalSize: 0,
                totalCompressedSize: 0,
                urls: {},
                completionFlag: false,
            });
        }
    }

    trackRequest(groupLabel: RequestGroupLabel, url: string, metrics?: ClientResponseMetrics) {
        this.initTrackGroup(groupLabel);

        const group = this.requestGroups.get(groupLabel)!;

        if (group.urls[url]) {
            group.urls[url].count += 1;
        } else {
            group.urls[url] = {
                count: 1,
                metrics,
            };
        }
        group.totalSize += metrics?.size ?? 0;
        group.totalCompressedSize += metrics?.compressedSize ?? 0;
    }

    getAverageLatency(groupLabel: RequestGroupLabel): number {
        const groupData = this.requestGroups.get(groupLabel);
        if (!groupData) {
            return 100;
        }

        const urlData = Object.entries(groupData.urls);
        const sumLatency = urlData.reduce((result, url) => (result + (url[1].metrics?.latency ?? 0)), 0);
        return sumLatency / urlData.length;
    }

    categorizeRequests(groupLabel: RequestGroupLabel): CategorizedRequestsResult {
        const groupData = this.requestGroups.get(groupLabel);
        if (!groupData) {
            const emptyResult: CategorizedRequestsResult = {
                parallelGroups: [],
                maxConcurrency: 0,
            };
            return emptyResult;
        }

        const requestsMetrics = Object.entries(groupData.urls).
            map((e) => e[1].metrics).
            filter((m) => m != null);
        requestsMetrics.sort((a, b) => a.startTime - b.startTime);

        const parallelGroups: ParallelGroup[] = [];
        let maxConcurrency = 0;

        // First pass: group requests
        for (const metrics of requestsMetrics) {
            const groupIndex = parallelGroups.findIndex((g) => metrics.startTime <= g.endTime);

            if (groupIndex >= 0) {
                const currentGroup = parallelGroups[groupIndex];
                currentGroup.requests.push(metrics);
                currentGroup.endTime = Math.min(currentGroup.endTime, metrics.endTime);
                currentGroup.latency = Math.max(currentGroup.latency, metrics.latency);
                maxConcurrency = Math.max(maxConcurrency, currentGroup.requests.length);
            } else {
                // Create a new parallel group
                parallelGroups.push({
                    startTime: metrics.startTime,
                    endTime: metrics.endTime,
                    latency: metrics.latency,
                    requests: [metrics],
                });
            }
        }

        // Second pass: recalculate max latency for all groups (except the last)
        // The max latency should only be considered up until the startTime of the next group
        for (let i = 0; i < parallelGroups.length - 1; i++) {
            const currentGroup = parallelGroups[i];
            let maxGroupLatency = 0;

            for (const metrics of currentGroup.requests) {
                let currentLatency = metrics.latency;

                if ((metrics.startTime + metrics.latency) > currentGroup.endTime) {
                    currentLatency = currentGroup.endTime - metrics.startTime;
                }
                maxGroupLatency = Math.max(maxGroupLatency, currentLatency);
            }

            currentGroup.latency = maxGroupLatency;
        }

        return {parallelGroups, maxConcurrency};
    }

    calculateAverageSpeedWithCategories = (
        parallelGroups: ParallelGroup[],
        elapsedTimeInSeconds: number, // Observed total elapsed time in seconds
    ): { averageSpeedMbps: number; effectiveLatency: number } => {
        // Step 1: Calculate total data size in bits
        const totalDataBits = parallelGroups.reduce((sum, group) => {
            return sum + group.requests.reduce((groupSum, req) => groupSum + (req.compressedSize * 8), 0);
        }, 0);

        // Step 2: Calculate effective latency (in ms)
        const effectiveLatency = parallelGroups.reduce((sum, group) => sum + group.latency, 0);

        // Step 3: Calculate data transfer time
        const dataTransferTime = elapsedTimeInSeconds - (effectiveLatency / 1000);

        // Handle edge case: if data transfer time is zero or negative.
        if (dataTransferTime <= 0) {
            return {averageSpeedMbps: 0, effectiveLatency};
        }

        // Step 4: Calculate average speed
        const averageSpeedBps = totalDataBits / dataTransferTime; // Speed in bps
        const averageSpeedMbps = averageSpeedBps / 1_000_000; // Convert to Mbps

        return {
            averageSpeedMbps,
            effectiveLatency,
        };
    };

    incrementRequestCount(groupLabel: RequestGroupLabel) {
        this.initTrackGroup(groupLabel);

        const group = this.requestGroups.get(groupLabel)!;
        group.activeCount += 1;
    }

    decrementRequestCount(groupLabel: RequestGroupLabel) {
        const group = this.requestGroups.get(groupLabel);
        if (group) {
            group.activeCount -= 1;

            if (group.activeCount <= 0 && !group.completionFlag) {
                this.clearCompletionTimer(groupLabel);
                const latency = this.getAverageLatency(groupLabel);
                group.completionTimer = setTimeout(() => {
                    if (this.allRequestsCompleted(groupLabel)) {
                        group.completionFlag = true;
                        this.handleRequestCompletion(groupLabel);
                        this.clearCompletionTimer(groupLabel);
                    }
                }, latency);
            }
        }
    }

    clearCompletionTimer(groupLabel: RequestGroupLabel) {
        const group = this.requestGroups.get(groupLabel);
        if (group?.completionTimer) {
            clearTimeout(group.completionTimer);
            group.completionTimer = undefined;
        }
    }

    handleRequestCompletion(groupLabel: RequestGroupLabel) {
        const group = this.requestGroups.get(groupLabel);
        if (group) {
            const duration = Date.now() - group.startTime;

            logDebug(`Group "${groupLabel}" completed.`);
            this.sendTelemetryEvent(groupLabel, group, duration);

            this.requestGroups.delete(groupLabel);
        }
    }

    allRequestsCompleted(groupLabel: RequestGroupLabel): boolean {
        const group = this.requestGroups.get(groupLabel);
        return group ? group.activeCount <= 0 : true;
    }

    sendTelemetryEvent(groupLabel: RequestGroupLabel, groupData: GroupData, duration: number) {
        const {totalCompressedSize, totalSize, urls: groupedUrls} = groupData;
        const urls = Object.keys(groupedUrls);
        const urlData = Object.entries(groupedUrls);
        const dupe = urlData.filter((u) => u[1].count > 1);
        const latency = this.getAverageLatency(groupLabel);
        const {parallelGroups, maxConcurrency} = this.categorizeRequests(groupLabel);
        const elapsedTimeInSeconds = duration / 1000;
        const {averageSpeedMbps, effectiveLatency} = this.calculateAverageSpeedWithCategories(parallelGroups, elapsedTimeInSeconds);

        logInfo(`Telemetry Event on ${Platform.OS} for Server ${this.apiClient.baseUrl}
            Group: "${groupLabel}"
            Total Requests: ${urls.length} URLs
            Max Concurrency: ${maxConcurrency}
            Parallel Groups: ${parallelGroups.length}
            Requests in Each Group: ${parallelGroups.map((g) => g.requests.length).join(', ')}
            Total Compressed Size: ${getFormattedFileSize(groupData.totalCompressedSize)}
            Total Size: ${getFormattedFileSize(groupData.totalSize)}
            Elapsed Time: ${elapsedTimeInSeconds} seconds (${duration} ms)
            Average Request Latency: ${latency} ms
            Effective Latency: ${effectiveLatency} ms
            Average Speed: ${averageSpeedMbps.toFixed(4)} Mbps
            `,
        );

        if (dupe.length) {
            logDebug(`Duplicate URLs:\n${dupe.map((d, i) => `${i + 1} - ${d[0]} ${JSON.stringify(d[1])}`).join('\n')}`);
        }

        const {collectNetworkRequestData} = PerformanceMetricsManager;

        const commonArguments = {serverUrl: this.apiClient.baseUrl, groupLabel};
        const metricsData: Array<[NetworkRequestMetrics, number]> = [
            [NetworkRequestMetrics.AverageSpeed, averageSpeedMbps],
            [NetworkRequestMetrics.EffectiveLatency, effectiveLatency],
            [NetworkRequestMetrics.ElapsedTime, elapsedTimeInSeconds],
            [NetworkRequestMetrics.Latency, latency],
            [NetworkRequestMetrics.TotalCompressedSize, totalCompressedSize],
            [NetworkRequestMetrics.TotalRequests, urls.length],
            [NetworkRequestMetrics.TotalSequentialRequests, parallelGroups.length],
            [NetworkRequestMetrics.TotalSize, totalSize],
        ];

        metricsData.forEach(([metric, value]) => {
            collectNetworkRequestData(metric, value, commonArguments);
        });

        // Send metrics for each parallel group
        parallelGroups.forEach((group) => {
            collectNetworkRequestData(NetworkRequestMetrics.TotalParallelRequests, group.requests.length, commonArguments);
        });
    }

    buildRequestOptions(options: ClientOptions): RequestOptions {
        const requestOptions: RequestOptions = {
            body: options.body,
            headers: this.getRequestHeaders(options.method!.toLowerCase()),
        };
        if (options.noRetry) {
            requestOptions.retryPolicyConfiguration = {retryLimit: 0};
        }
        if (options.timeoutInterval) {
            requestOptions.timeoutInterval = options.timeoutInterval;
        }
        if (options.headers) {
            requestOptions.headers = {...requestOptions.headers, ...options.headers};
        }
        return requestOptions;
    }

    doFetchWithTracking = async (url: string, options: ClientOptions, returnDataOnly = true) => {
        let request;
        const {groupLabel} = options;
        const method = options.method?.toLowerCase();
        switch (method) {
            case 'get': request = this.apiClient!.get;
                break;
            case 'put': request = this.apiClient!.put;
                break;
            case 'post': request = this.apiClient!.post;
                break;
            case 'patch': request = this.apiClient!.patch;
                break;
            case 'delete': request = this.apiClient!.delete;
                break;
            default:
                return {error: new ClientError(this.apiClient.baseUrl, {
                    message: 'Invalid request method',
                    intl: {
                        id: t('mobile.request.invalid_request_method'),
                        defaultMessage: 'Invalid request method',
                    },
                    url,
                })};
        }

        if (groupLabel && CollectNetworkMetrics) {
            this.incrementRequestCount(groupLabel);
        }

        let response: ClientResponse;
        try {
            response = await request!(url, this.buildRequestOptions(options));
        } catch (error) {
            const status_code = isErrorWithStatusCode(error) ? error.status_code : undefined;
            throw new ClientError(this.apiClient.baseUrl, {
                message: 'Received invalid response from the server.',
                intl: {
                    id: t('mobile.request.invalid_response'),
                    defaultMessage: 'Received invalid response from the server.',
                },
                url,
                details: error,
                status_code,
            });
        } finally {
            if (groupLabel && CollectNetworkMetrics) {
                this.decrementRequestCount(groupLabel);
            }
        }
        const headers: ClientHeaders = response.headers || {};
        if (groupLabel && CollectNetworkMetrics) {
            this.trackRequest(groupLabel, url, response.metrics);
        }
        const serverVersion = semverFromServerVersion(
            headers[ClientConstants.HEADER_X_VERSION_ID] || headers[ClientConstants.HEADER_X_VERSION_ID.toLowerCase()],
        );
        const hasCacheControl = Boolean(
            headers[ClientConstants.HEADER_CACHE_CONTROL] || headers[ClientConstants.HEADER_CACHE_CONTROL.toLowerCase()],
        );
        if (serverVersion && !hasCacheControl && this.serverVersion !== serverVersion) {
            this.serverVersion = serverVersion;
            DeviceEventEmitter.emit(Events.SERVER_VERSION_CHANGED, {serverUrl: this.apiClient.baseUrl, serverVersion});
        }

        const bearerToken = headers[ClientConstants.HEADER_TOKEN] || headers[ClientConstants.HEADER_TOKEN.toLowerCase()];
        if (bearerToken) {
            this.setBearerToken(bearerToken);
        }

        if (response.ok) {
            return returnDataOnly ? (response.data || {}) : response;
        }

        throw new ClientError(this.apiClient.baseUrl, {
            message: response.data?.message as string || `Response with status code ${response.code}`,
            server_error_id: response.data?.id as string,
            status_code: response.code,
            url,
        });
    };
}
