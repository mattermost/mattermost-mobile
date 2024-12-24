// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, Platform} from 'react-native';

import {CollectNetworkMetrics} from '@assets/config.json';
import {Events} from '@constants';
import {t} from '@i18n';
import {setServerCredentials} from '@init/credentials';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {NetworkRequestMetrics} from '@managers/performance_metrics_manager/constant';
import {getFormattedFileSize} from '@utils/file';
import {logDebug, logInfo} from '@utils/log';
import {semverFromServerVersion} from '@utils/server';

import * as ClientConstants from './constants';
import ClientError from './error';

import type {APIClientInterface, ClientHeaders, ClientResponseMetrics, RequestOptions} from '@mattermost/react-native-network-client';

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

type CategorizedRequests = {
    parallel: ClientResponseMetrics[];
    sequential: ClientResponseMetrics[];
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

    categorizeRequests(groupLabel: RequestGroupLabel): CategorizedRequests {
        const parallel: ClientResponseMetrics[] = [];
        const sequential: ClientResponseMetrics[] = [];
        const groupData = this.requestGroups.get(groupLabel);
        if (!groupData) {
            return {parallel, sequential};
        }

        // Sort requests by start time
        const requestsMetrics = Object.entries(groupData.urls).map((e) => e[1].metrics).filter((m) => m != null);
        requestsMetrics.sort((a, b) => a.startTime - b.startTime);

        let lastEndTime = 0;

        for (const metrics of requestsMetrics) {
            if (metrics.startTime < lastEndTime) {
                // Overlapping request -> Parallel
                parallel.push(metrics);
            } else {
                // Non-overlapping request -> Sequential
                sequential.push(metrics);
            }

            // Update the last end time
            lastEndTime = Math.max(lastEndTime, metrics.endTime);
        }

        return {parallel, sequential};
    }

    calculateAverageSpeedWithCategories = (
        categorizedRequests: CategorizedRequests,
        elapsedTimeInSeconds: number, // Observed total elapsed time in seconds
    ): { averageSpeedMbps: number; effectiveLatency: number } => {
        const {parallel, sequential} = categorizedRequests;

        // Step 1: Calculate total data size in bits
        const totalDataBits = [...parallel, ...sequential].reduce((sum, req) => sum + (req.compressedSize * 8), 0);

        // Step 2: Calculate effective latency
        const parallelLatencies = parallel.map((req) => req.latency);
        const sequentialLatencies = sequential.map((req) => req.latency);

        const effectiveParallelLatency = Math.max(...parallelLatencies, 0);
        const effectiveSequentialLatency = sequentialLatencies.reduce((sum, latency) => sum + latency, 0);

        const effectiveLatency = effectiveParallelLatency + effectiveSequentialLatency;

        // Step 3: Calculate data transfer time
        const dataTransferTime = elapsedTimeInSeconds - (effectiveLatency / 1000);

        // Handle edge case: if data transfer time is zero or negative
        if (dataTransferTime <= 0) {
            return {averageSpeedMbps: 0, effectiveLatency: 0};
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
        const categorizedRequests = this.categorizeRequests(groupLabel);
        const elapsedTimeInSeconds = duration / 1000;
        const {averageSpeedMbps, effectiveLatency} = this.calculateAverageSpeedWithCategories(categorizedRequests, elapsedTimeInSeconds);
        const {parallel, sequential} = categorizedRequests;

        logInfo(`Telemetry event on ${Platform.OS} for server ${this.apiClient.baseUrl}
            Group "${groupLabel}"
            total requests ${urls.length} urls
            parallel requests: ${categorizedRequests.parallel.length} urls
            sequential requests: ${categorizedRequests.sequential.length} urls
            total Compressed size of: ${getFormattedFileSize(totalCompressedSize)}
            total size of: ${getFormattedFileSize(totalSize)}
            elapsed time: ${elapsedTimeInSeconds} seconds
            average request latency: ${latency} ms
            Effective Latency: ${effectiveLatency} ms,
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
            [NetworkRequestMetrics.TotalParallelRequests, parallel.length],
            [NetworkRequestMetrics.TotalRequests, urls.length],
            [NetworkRequestMetrics.TotalSequentialRequests, sequential.length],
            [NetworkRequestMetrics.TotalSize, totalSize],
        ];

        metricsData.forEach(([metric, value]) => {
            collectNetworkRequestData(metric, value, commonArguments);
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

        try {
            const response = await request!(url, this.buildRequestOptions(options));
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
        } catch (error) {
            throw new ClientError(this.apiClient.baseUrl, {
                message: 'Received invalid response from the server.',
                intl: {
                    id: t('mobile.request.invalid_response'),
                    defaultMessage: 'Received invalid response from the server.',
                },
                url,
                details: error,
            });
        } finally {
            if (groupLabel && CollectNetworkMetrics) {
                this.decrementRequestCount(groupLabel);
            }
        }
    };
}
