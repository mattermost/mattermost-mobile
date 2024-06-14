// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {Events, Calls} from '@constants';
import {t} from '@i18n';
import {setServerCredentials} from '@init/credentials';
import {Analytics, create} from '@managers/analytics';
import {semverFromServerVersion} from '@utils/server';

import * as ClientConstants from './constants';
import ClientError from './error';

import type {
    APIClientInterface,
    ClientHeaders,
    ClientResponse,
    RequestOptions,
} from '@mattermost/react-native-network-client';

export default class ClientBase {
    analytics: Analytics|undefined;
    apiClient: APIClientInterface;
    csrfToken = '';
    requestHeaders: {[x: string]: string} = {};
    serverVersion = '';
    urlVersion = '/api/v4';
    enableLogging = false;

    constructor(apiClient: APIClientInterface, serverUrl: string, bearerToken?: string, csrfToken?: string) {
        this.apiClient = apiClient;
        this.analytics = create(serverUrl);

        if (bearerToken) {
            this.setBearerToken(bearerToken);
        }
        if (csrfToken) {
            this.setCSRFToken(csrfToken);
        }
    }

    invalidate() {
        if (this.apiClient) {
            this.apiClient.invalidate();
        }
    }

    getBaseRoute() {
        return this.apiClient.baseUrl || '';
    }

    getAbsoluteUrl(baseUrl?: string) {
        if (typeof baseUrl !== 'string' || !baseUrl.startsWith('/')) {
            return baseUrl;
        }
        return this.apiClient.baseUrl + baseUrl;
    }

    getRequestHeaders(requestMethod: string) {
        const headers = {...this.requestHeaders};

        if (this.csrfToken && requestMethod.toLowerCase() !== 'get') {
            headers[ClientConstants.HEADER_X_CSRF_TOKEN] = this.csrfToken;
        }

        return headers;
    }

    getWebSocketUrl = () => {
        return `${this.urlVersion}/websocket`;
    };

    setAcceptLanguage(locale: string) {
        this.requestHeaders[ClientConstants.HEADER_ACCEPT_LANGUAGE] = locale;
    }

    setBearerToken(bearerToken: string) {
        this.requestHeaders[ClientConstants.HEADER_AUTH] = `${ClientConstants.HEADER_BEARER} ${bearerToken}`;
        setServerCredentials(this.apiClient.baseUrl, bearerToken);
    }

    setCSRFToken(csrfToken: string) {
        this.csrfToken = csrfToken;
    }

    // Routes

    getUsersRoute() {
        return `${this.urlVersion}/users`;
    }

    getUserRoute(userId: string) {
        return `${this.getUsersRoute()}/${userId}`;
    }

    getTeamsRoute() {
        return `${this.urlVersion}/teams`;
    }

    getTeamRoute(teamId: string) {
        return `${this.getTeamsRoute()}/${teamId}`;
    }

    getTeamNameRoute(teamName: string) {
        return `${this.getTeamsRoute()}/name/${teamName}`;
    }

    getTeamMembersRoute(teamId: string) {
        return `${this.getTeamRoute(teamId)}/members`;
    }

    getTeamMemberRoute(teamId: string, userId: string) {
        return `${this.getTeamMembersRoute(teamId)}/${userId}`;
    }

    getCategoriesRoute(userId: string, teamId: string) {
        return `${this.getUserRoute(userId)}/teams/${teamId}/channels/categories`;
    }

    getCategoriesOrderRoute(userId: string, teamId: string) {
        return `${this.getCategoriesRoute(userId, teamId)}/order`;
    }

    getCategoryRoute(userId: string, teamId: string, categoryId: string) {
        return `${this.getCategoriesRoute(userId, teamId)}/${categoryId}`;
    }

    getChannelsRoute() {
        return `${this.urlVersion}/channels`;
    }

    getChannelRoute(channelId: string) {
        return `${this.getChannelsRoute()}/${channelId}`;
    }

    getSharedChannelsRoute() {
        return `${this.urlVersion}/sharedchannels`;
    }

    getChannelMembersRoute(channelId: string) {
        return `${this.getChannelRoute(channelId)}/members`;
    }

    getChannelMemberRoute(channelId: string, userId: string) {
        return `${this.getChannelMembersRoute(channelId)}/${userId}`;
    }

    getPostsRoute() {
        return `${this.urlVersion}/posts`;
    }

    getPostRoute(postId: string) {
        return `${this.getPostsRoute()}/${postId}`;
    }

    getReactionsRoute() {
        return `${this.urlVersion}/reactions`;
    }

    getCommandsRoute() {
        return `${this.urlVersion}/commands`;
    }

    getFilesRoute() {
        return `${this.urlVersion}/files`;
    }

    getFileRoute(fileId: string) {
        return `${this.getFilesRoute()}/${fileId}`;
    }

    getPreferencesRoute(userId: string) {
        return `${this.getUserRoute(userId)}/preferences`;
    }

    getEmojisRoute() {
        return `${this.urlVersion}/emoji`;
    }

    getEmojiRoute(emojiId: string) {
        return `${this.getEmojisRoute()}/${emojiId}`;
    }

    getGlobalDataRetentionRoute() {
        return `${this.urlVersion}/data_retention`;
    }

    getGranularDataRetentionRoute(userId: string) {
        return `${this.getUserRoute(userId)}/data_retention`;
    }

    getRolesRoute() {
        return `${this.urlVersion}/roles`;
    }

    getTimezonesRoute() {
        return `${this.urlVersion}/system/timezones`;
    }

    getRedirectLocationRoute() {
        return `${this.urlVersion}/redirect_location`;
    }

    getThreadsRoute(userId: string, teamId: string): string {
        return `${this.getUserRoute(userId)}/teams/${teamId}/threads`;
    }

    getThreadRoute(userId: string, teamId: string, threadId: string): string {
        return `${this.getThreadsRoute(userId, teamId)}/${threadId}`;
    }

    getPluginsRoute() {
        return `${this.urlVersion}/plugins`;
    }

    getPluginRoute(id: string) {
        return `/plugins/${id}`;
    }

    getAppsProxyRoute() {
        return this.getPluginRoute('com.mattermost.apps');
    }

    getCallsRoute() {
        return this.getPluginRoute(Calls.PluginId);
    }

    getPerformanceRoute() {
        return `${this.urlVersion}/client_perf`;
    }

    doFetch = async (url: string, options: ClientOptions, returnDataOnly = true) => {
        let request;
        const method = options.method?.toLowerCase();
        switch (method) {
            case 'get':
                request = this.apiClient!.get;
                break;
            case 'put':
                request = this.apiClient!.put;
                break;
            case 'post':
                request = this.apiClient!.post;
                break;
            case 'patch':
                request = this.apiClient!.patch;
                break;
            case 'delete':
                request = this.apiClient!.delete;
                break;
            default:
                throw new ClientError(this.apiClient.baseUrl, {
                    message: 'Invalid request method',
                    intl: {
                        id: t('mobile.request.invalid_request_method'),
                        defaultMessage: 'Invalid request method',
                    },
                    url,
                });
        }

        const requestOptions: RequestOptions = {
            body: options.body,
            headers: this.getRequestHeaders(method),
        };
        if (options.noRetry) {
            requestOptions.retryPolicyConfiguration = {
                retryLimit: 0,
            };
        }
        if (options.timeoutInterval) {
            requestOptions.timeoutInterval = options.timeoutInterval;
        }

        if (options.headers) {
            if (requestOptions.headers) {
                requestOptions.headers = {
                    ...requestOptions.headers,
                    ...options.headers,
                };
            } else {
                requestOptions.headers = options.headers;
            }
        }

        let response: ClientResponse;
        try {
            response = await request!(url, requestOptions);
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
        }

        const headers: ClientHeaders = response.headers || {};
        const serverVersion = semverFromServerVersion(headers[ClientConstants.HEADER_X_VERSION_ID] || headers[ClientConstants.HEADER_X_VERSION_ID.toLowerCase()]);
        const hasCacheControl = Boolean(headers[ClientConstants.HEADER_CACHE_CONTROL] || headers[ClientConstants.HEADER_CACHE_CONTROL.toLowerCase()]);
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
