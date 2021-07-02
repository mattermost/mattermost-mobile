// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {General} from '@constants';
import {t} from '@i18n';
import {Analytics, create} from '@init/analytics';
import {setServerCredentials} from '@init/credentials';

import type {
    APIClientInterface,
    ClientHeaders,
    ClientResponse,
    RequestOptions,
} from '@mattermost/react-native-network-client';

import type {ClientOptions} from '@typings/api/client';

import * as ClientConstants from './constants';
import ClientError from './error';

export default class ClientBase {
    analytics: Analytics|undefined;
    apiClient: APIClientInterface;
    csrfToken = '';
    requestHeaders: {[x: string]: string} = {};
    serverVersion = '';
    urlVersion = '/api/v4';

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

    getRequestHeaders(requestMethod: string) {
        const headers = {...this.requestHeaders};

        if (this.csrfToken && requestMethod.toLowerCase() !== 'get') {
            headers[ClientConstants.HEADER_X_CSRF_TOKEN] = this.csrfToken;
        }

        return headers;
    }

    getWebSocketUrl = () => {
        return `${this.urlVersion}/websocket`;
    }

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

    getChannelsRoute() {
        return `${this.urlVersion}/channels`;
    }

    getChannelRoute(channelId: string) {
        return `${this.getChannelsRoute()}/${channelId}`;
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

    getDataRetentionRoute() {
        return `${this.urlVersion}/data_retention`;
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

    getAppsProxyRoute() {
        return '/plugins/com.mattermost.apps';
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
            });
        }

        const headers: ClientHeaders = response.headers || {};
        const serverVersion = headers[ClientConstants.HEADER_X_VERSION_ID] || headers[ClientConstants.HEADER_X_VERSION_ID.toLowerCase()];
        const hasCacheControl = Boolean(headers[ClientConstants.HEADER_CACHE_CONTROL] || headers[ClientConstants.HEADER_CACHE_CONTROL.toLowerCase()]);
        if (serverVersion && !hasCacheControl && this.serverVersion !== serverVersion) {
            this.serverVersion = serverVersion;
            DeviceEventEmitter.emit(General.SERVER_VERSION_CHANGED, {serverUrl: this.apiClient.baseUrl, serverVersion});
        }

        const bearerToken = headers[ClientConstants.HEADER_TOKEN] || headers[ClientConstants.HEADER_TOKEN.toLowerCase()];
        if (bearerToken) {
            this.setBearerToken(bearerToken);
        }

        if (response.ok) {
            return returnDataOnly ? response.data : response;
        }

        throw new ClientError(this.apiClient.baseUrl, {
            message: response.data?.message || '',
            server_error_id: response.data?.id,
            status_code: response.code,
            url,
        });
    };
}
