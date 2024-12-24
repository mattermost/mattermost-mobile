// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';

export interface ClientPostsMix {
    createPost: (post: Post) => Promise<Post>;
    updatePost: (post: Post) => Promise<Post>;
    getPost: (postId: string, groupLabel?: RequestGroupLabel) => Promise<Post>;
    patchPost: (postPatch: Partial<Post> & {id: string}) => Promise<Post>;
    deletePost: (postId: string) => Promise<any>;
    getPostThread: (postId: string, options: FetchPaginatedThreadOptions, groupLabel?: RequestGroupLabel) => Promise<PostResponse>;
    getPosts: (channelId: string, page?: number, perPage?: number, collapsedThreads?: boolean, collapsedThreadsExtended?: boolean, groupLabel?: RequestGroupLabel) => Promise<PostResponse>;
    getPostsSince: (channelId: string, since: number, collapsedThreads?: boolean, collapsedThreadsExtended?: boolean, groupLabel?: RequestGroupLabel) => Promise<PostResponse>;
    getPostsBefore: (channelId: string, postId?: string, page?: number, perPage?: number, collapsedThreads?: boolean, collapsedThreadsExtended?: boolean) => Promise<PostResponse>;
    getPostsAfter: (channelId: string, postId: string, page?: number, perPage?: number, collapsedThreads?: boolean, collapsedThreadsExtended?: boolean) => Promise<PostResponse>;
    getFileInfosForPost: (postId: string) => Promise<FileInfo[]>;
    getSavedPosts: (userId: string, channelId?: string, teamId?: string, page?: number, perPage?: number) => Promise<PostResponse>;
    getPinnedPosts: (channelId: string) => Promise<PostResponse>;
    markPostAsUnread: (userId: string, postId: string) => Promise<any>;
    pinPost: (postId: string) => Promise<any>;
    unpinPost: (postId: string) => Promise<any>;
    addReaction: (userId: string, postId: string, emojiName: string) => Promise<Reaction>;
    removeReaction: (userId: string, postId: string, emojiName: string) => Promise<any>;
    getReactionsForPost: (postId: string) => Promise<any>;
    searchPostsWithParams: (teamId: string, params: PostSearchParams) => Promise<SearchPostResponse>;
    searchPosts: (teamId: string, terms: string, isOrSearch: boolean) => Promise<SearchPostResponse>;
    doPostAction: (postId: string, actionId: string, selectedOption?: string) => Promise<any>;
    doPostActionWithCookie: (postId: string, actionId: string, actionCookie: string, selectedOption?: string) => Promise<any>;
    acknowledgePost: (postId: string, userId: string) => Promise<PostAcknowledgement>;
    unacknowledgePost: (postId: string, userId: string) => Promise<any>;
    sendTestNotification: () => Promise<{status: 'OK'}>;
}

const ClientPosts = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    createPost = async (post: Post) => {
        return this.doFetch(
            `${this.getPostsRoute()}`,
            {method: 'post', body: post, noRetry: true},
        );
    };

    updatePost = async (post: Post) => {
        return this.doFetch(
            `${this.getPostRoute(post.id)}`,
            {method: 'put', body: post},
        );
    };

    getPost = async (postId: string, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getPostRoute(postId)}`,
            {method: 'get', groupLabel},
        );
    };

    patchPost = async (postPatch: Partial<Post> & {id: string}) => {
        return this.doFetch(
            `${this.getPostRoute(postPatch.id)}/patch`,
            {method: 'put', body: postPatch},
        );
    };

    deletePost = async (postId: string) => {
        return this.doFetch(
            `${this.getPostRoute(postId)}`,
            {method: 'delete'},
        );
    };

    getPostThread = (postId: string, options: FetchPaginatedThreadOptions, groupLabel?: RequestGroupLabel) => {
        const {
            fetchThreads = true,
            collapsedThreads = false,
            collapsedThreadsExtended = false,
            direction = 'up',
            fetchAll = false,
            perPage = fetchAll ? undefined : PER_PAGE_DEFAULT,
            ...rest
        } = options;
        return this.doFetch(
            `${this.getPostRoute(postId)}/thread${buildQueryString({skipFetchThreads: !fetchThreads, collapsedThreads, collapsedThreadsExtended, direction, perPage, ...rest})}`,
            {method: 'get', groupLabel},
        );
    };

    getPosts = async (channelId: string, page = 0, perPage = PER_PAGE_DEFAULT, collapsedThreads = false, collapsedThreadsExtended = false, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getChannelRoute(channelId)}/posts${buildQueryString({page, per_page: perPage, collapsedThreads, collapsedThreadsExtended})}`,
            {method: 'get', groupLabel},
        );
    };

    getPostsSince = async (channelId: string, since: number, collapsedThreads = false, collapsedThreadsExtended = false, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getChannelRoute(channelId)}/posts${buildQueryString({since, collapsedThreads, collapsedThreadsExtended})}`,
            {method: 'get', groupLabel},
        );
    };

    getPostsBefore = async (channelId: string, postId = '', page = 0, perPage = PER_PAGE_DEFAULT, collapsedThreads = false, collapsedThreadsExtended = false) => {
        return this.doFetch(
            `${this.getChannelRoute(channelId)}/posts${buildQueryString({before: postId, page, per_page: perPage, collapsedThreads, collapsedThreadsExtended})}`,
            {method: 'get'},
        );
    };

    getPostsAfter = async (channelId: string, postId: string, page = 0, perPage = PER_PAGE_DEFAULT, collapsedThreads = false, collapsedThreadsExtended = false) => {
        return this.doFetch(
            `${this.getChannelRoute(channelId)}/posts${buildQueryString({after: postId, page, per_page: perPage, collapsedThreads, collapsedThreadsExtended})}`,
            {method: 'get'},
        );
    };

    getFileInfosForPost = async (postId: string) => {
        return this.doFetch(
            `${this.getPostRoute(postId)}/files/info`,
            {method: 'get'},
        );
    };

    getSavedPosts = async (userId: string, channelId = '', teamId = '', page = 0, perPage = PER_PAGE_DEFAULT) => {
        return this.doFetch(
            `${this.getUserRoute(userId)}/posts/flagged${buildQueryString({channel_id: channelId, team_id: teamId, page, per_page: perPage})}`,
            {method: 'get'},
        );
    };

    getPinnedPosts = async (channelId: string) => {
        return this.doFetch(
            `${this.getChannelRoute(channelId)}/pinned`,
            {method: 'get'},
        );
    };

    markPostAsUnread = async (userId: string, postId: string) => {
        // collapsed_threads_supported is not based on user preferences but to know if "CLIENT" supports CRT
        const body = JSON.stringify({collapsed_threads_supported: true});

        return this.doFetch(
            `${this.getUserRoute(userId)}/posts/${postId}/set_unread`,
            {method: 'post', body},
        );
    };

    pinPost = async (postId: string) => {
        return this.doFetch(
            `${this.getPostRoute(postId)}/pin`,
            {method: 'post'},
        );
    };

    unpinPost = async (postId: string) => {
        return this.doFetch(
            `${this.getPostRoute(postId)}/unpin`,
            {method: 'post'},
        );
    };

    addReaction = async (userId: string, postId: string, emojiName: string) => {
        return this.doFetch(
            `${this.getReactionsRoute()}`,
            {method: 'post', body: {user_id: userId, post_id: postId, emoji_name: emojiName}},
        );
    };

    removeReaction = async (userId: string, postId: string, emojiName: string) => {
        return this.doFetch(
            `${this.getUserRoute(userId)}/posts/${postId}/reactions/${emojiName}`,
            {method: 'delete'},
        );
    };

    getReactionsForPost = async (postId: string) => {
        return this.doFetch(
            `${this.getPostRoute(postId)}/reactions`,
            {method: 'get'},
        );
    };

    searchPostsWithParams = async (teamId: string, params: PostSearchParams) => {
        const endpoint = teamId ? `${this.getTeamRoute(teamId)}/posts/search` : `${this.getPostsRoute()}/search`;
        return this.doFetch(endpoint, {method: 'post', body: params});
    };

    searchPosts = async (teamId: string, terms: string, isOrSearch: boolean) => {
        return this.searchPostsWithParams(teamId, {terms, is_or_search: isOrSearch});
    };

    doPostAction = async (postId: string, actionId: string, selectedOption = '') => {
        return this.doPostActionWithCookie(postId, actionId, '', selectedOption);
    };

    doPostActionWithCookie = async (postId: string, actionId: string, actionCookie: string, selectedOption = '') => {
        const msg: any = {
            selected_option: selectedOption,
        };
        if (actionCookie !== '') {
            msg.cookie = actionCookie;
        }
        return this.doFetch(
            `${this.getPostRoute(postId)}/actions/${encodeURIComponent(actionId)}`,
            {method: 'post', body: msg},
        );
    };

    acknowledgePost = async (postId: string, userId: string) => {
        return this.doFetch(
            `${this.getUserRoute(userId)}/posts/${postId}/ack`,
            {method: 'post'},
        );
    };

    unacknowledgePost = async (postId: string, userId: string) => {
        return this.doFetch(
            `${this.getUserRoute(userId)}/posts/${postId}/ack`,
            {method: 'delete'},
        );
    };

    sendTestNotification = async () => {
        return this.doFetch(
            `${this.urlVersion}/notifications/test`,
            {method: 'post'},
        );
    };
};

export default ClientPosts;
