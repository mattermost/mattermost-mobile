// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Calls} from '@constants';
import {getFullErrorMessage} from '@utils/errors';

import * as ClientConstants from './constants';
import ClientTracking from './tracking';

import type {APIClientInterface} from '@mattermost/react-native-network-client';

// Cloud load balancers close idle keep-alive sockets (~40s), so the next request sent down a
// pooled connection fails with NSURLError -1005 "network connection was lost" before it ever
// reaches the server (response_status=-1, 0 response bytes). Reproduced against the PR cloud
// servers: the custom-status PUT failed 2/2 that way, and one retry — which establishes a
// fresh connection — made it pass 4/4.
//
// The native client is *supposed* to cover this already: getSessionInterceptor attaches a
// RuntimeRetrier, which delegates to `request.request?.retryPolicy ?? session.retryPolicy`,
// and the session policy we configure in NetworkManager (EXPONENTIAL_RETRY, retryLimit 3)
// inherits Alamofire's defaultRetryableURLErrorCodes — which includes .networkConnectionLost.
// Why that path does not fire in practice is unresolved, so treat this as a mitigation rather
// than the root-cause fix, and keep it cheap: ONE extra attempt, which is all a dead pooled
// socket needs. Anything more would stack on top of the native retryLimit.
//
// Restricted to idempotent methods, and callers that must not retry already pass `noRetry`.
// Match on the message text only — never on the raw codes: "-1005"/"-1001" appear as
// substrings in our own hostnames (mobile-pr-10050…, mobile-pr-10010…), which would retry
// permanent 4xx/5xx errors.
const RETRYABLE_METHODS = new Set(['get', 'put', 'patch', 'delete']);
const isTransientTransportError = (error: unknown) =>
    /network connection was lost|the request timed out/i.test(getFullErrorMessage(error));
const TRANSIENT_RETRY_ATTEMPTS = 2;

export default class ClientBase extends ClientTracking {
    constructor(apiClient: APIClientInterface, serverUrl: string, bearerToken?: string, csrfToken?: string, preauthSecret?: string) {
        super(apiClient);

        if (bearerToken || preauthSecret) {
            this.setClientCredentials(bearerToken || '', preauthSecret || '');
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

    getAPIRoute() {
        return `${this.getBaseRoute()}${this.urlVersion}`;
    }

    getAbsoluteUrl(baseUrl?: string) {
        if (typeof baseUrl !== 'string' || !baseUrl.startsWith('/')) {
            return baseUrl;
        }
        return this.apiClient.baseUrl + baseUrl;
    }

    getWebSocketUrl = () => {
        return `${this.urlVersion}/websocket`;
    };

    setAcceptLanguage(locale: string) {
        this.requestHeaders[ClientConstants.HEADER_ACCEPT_LANGUAGE] = locale;
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

    getChannelBookmarksRoute(channelId: string) {
        return `${this.getChannelRoute(channelId)}/bookmarks`;
    }

    getChannelBookmarkRoute(channelId: string, bookmarkId: string) {
        return `${this.getChannelBookmarksRoute(channelId)}/${bookmarkId}`;
    }

    getSharedChannelsRoute() {
        return `${this.urlVersion}/sharedchannels`;
    }

    getRemoteClustersRoute() {
        return `${this.urlVersion}/remotecluster`;
    }

    getChannelRemotesRoute(channelId: string) {
        return `${this.getSharedChannelsRoute()}/${channelId}/remotes`;
    }

    getRemoteClusterChannelRoute(remoteId: string, channelId: string) {
        return `${this.getRemoteClustersRoute()}/${remoteId}/channels/${channelId}`;
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

    getTeamAndDirectChannelScheduledPostsRoute() {
        return `${this.getPostsRoute()}/scheduled`;
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

    getCustomProfileAttributesRoute() {
        return `${this.urlVersion}/custom_profile_attributes`;
    }

    getScheduledPostRoute() {
        return `${this.getPostsRoute()}/schedule`;
    }

    getUserCustomProfileAttributesRoute(userId: string) {
        return `${this.getUsersRoute()}/${userId}/custom_profile_attributes`;
    }

    doFetch = async (url: string, options: ClientOptions, returnDataOnly = true) => {
        const method = options.method?.toLowerCase();
        if (options.noRetry || method == null) {
            return this.doFetchWithTracking(url, options, returnDataOnly);
        }

        // Retry idempotent methods, plus read-only POSTs that opt in via retryOnTransient
        // (e.g. posts/search): a dead pooled socket fails with NSURLError -1005 before the
        // request reaches the server, and one retry on a fresh connection recovers it.
        if (!RETRYABLE_METHODS.has(method) && options.retryOnTransient !== true) {
            return this.doFetchWithTracking(url, options, returnDataOnly);
        }
        let lastError: unknown;
        for (let attempt = 0; attempt < TRANSIENT_RETRY_ATTEMPTS; attempt++) {
            try {
                // Sequential by design: each attempt only runs if the previous one failed with a
                // transient transport error, so the awaits cannot be parallelised.
                // eslint-disable-next-line no-await-in-loop
                return await this.doFetchWithTracking(url, options, returnDataOnly);
            } catch (error) {
                lastError = error;
                if (!isTransientTransportError(error) || attempt === TRANSIENT_RETRY_ATTEMPTS - 1) {
                    throw error;
                }
                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt)));
            }
        }
        throw lastError;
    };
}
