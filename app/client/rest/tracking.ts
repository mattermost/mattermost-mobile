// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, Platform} from 'react-native';

import {Events} from '@constants';
import {t} from '@i18n';
import {setServerCredentials} from '@init/credentials';
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

    initTrackGroup(groupLabel: string) {
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

    trackRequest(groupLabel: string, url: string, metrics?: ClientResponseMetrics) {
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

    incrementRequestCount(groupLabel: string) {
        this.initTrackGroup(groupLabel);

        const group = this.requestGroups.get(groupLabel)!;
        group.activeCount += 1;
    }

    decrementRequestCount(groupLabel: string) {
        const group = this.requestGroups.get(groupLabel);
        if (group) {
            group.activeCount -= 1;

            if (group.activeCount <= 0 && !group.completionFlag) {
                this.clearCompletionTimer(groupLabel);
                group.completionTimer = setTimeout(() => {
                    if (this.allRequestsCompleted(groupLabel)) {
                        group.completionFlag = true;
                        this.handleRequestCompletion(groupLabel);
                        this.clearCompletionTimer(groupLabel);
                    }
                }, 100); // Adjust delay as needed (e.g., 100ms) should we set this based on latency or something?
            }
        }
    }

    clearCompletionTimer(groupLabel: string) {
        const group = this.requestGroups.get(groupLabel);
        if (group?.completionTimer) {
            clearTimeout(group.completionTimer);
            group.completionTimer = undefined;
        }
    }

    handleRequestCompletion(groupLabel: string) {
        const group = this.requestGroups.get(groupLabel);
        if (group) {
            const duration = Date.now() - group.startTime;

            logDebug(`Group "${groupLabel}" completed.`);
            this.sendTelemetryEvent(groupLabel, group, duration);

            this.requestGroups.delete(groupLabel);
        }
    }

    allRequestsCompleted(groupLabel: string): boolean {
        const group = this.requestGroups.get(groupLabel);
        return group ? group.activeCount <= 0 : true;
    }

    sendTelemetryEvent(groupLabel: string, groupData: GroupData, duration: number) {
        const urls = Object.keys(groupData.urls);
        const urlData = Object.entries(groupData.urls);
        const dupe = urlData.filter((u) => u[1].count > 1);
        const urlCount = urlData.reduce((result, url) => (result + url[1].count), 0);
        const sumLatency = urlData.reduce((result, url) => (result + (url[1].metrics?.latency ?? 0)), 0);
        const latency = sumLatency / urlCount;
        logInfo(`Telemetry event on ${Platform.OS} for server ${this.apiClient.baseUrl}
            Group "${groupLabel}"
            requesting ${urls.length} urls 
            total Compressed size of: ${getFormattedFileSize(groupData.totalCompressedSize)}
            total size of: ${getFormattedFileSize(groupData.totalSize)}
            elapsed time: ${duration / 1000} seconds
            average latency: ${latency} ms`);

        if (dupe.length) {
            logDebug('Duplicate URLs:\n', dupe.map((d) => `${d[0]} ${JSON.stringify(d[1])}`).join('\n'));
        }

        // Integrate with telemetry framework here
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

        if (groupLabel) {
            this.incrementRequestCount(groupLabel);
        }

        try {
            const response = await request!(url, this.buildRequestOptions(options));
            const headers: ClientHeaders = response.headers || {};
            if (groupLabel) {
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
            if (groupLabel) {
                this.decrementRequestCount(groupLabel);
            }
        }
    };
}
