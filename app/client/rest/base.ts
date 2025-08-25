// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Calls} from '@constants';

import * as ClientConstants from './constants';
import ClientTracking from './tracking';

import type {APIClientInterface} from '@mattermost/react-native-network-client';

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
        return this.doFetchWithTracking(url, options, returnDataOnly);
    };
}
