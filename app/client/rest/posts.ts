// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';

export interface ClientPostsMix {
    createPost: (post: Post) => Promise<Post>;
    updatePost: (post: Post) => Promise<Post>;
    getPost: (postId: string) => Promise<Post>;
    patchPost: (postPatch: Partial<Post> & {id: string}) => Promise<Post>;
    deletePost: (postId: string) => Promise<any>;
    getPostThread: (postId: string, options: FetchPaginatedThreadOptions) => Promise<PostResponse>;
    getPosts: (channelId: string, page?: number, perPage?: number, collapsedThreads?: boolean, collapsedThreadsExtended?: boolean) => Promise<PostResponse>;
    getPostsSince: (channelId: string, since: number, collapsedThreads?: boolean, collapsedThreadsExtended?: boolean) => Promise<PostResponse>;
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
}

const ClientPosts = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    createPost = async (post: Post) => {
        this.analytics?.trackAPI('api_posts_create', {channel_id: post.channel_id});

        if (post.root_id != null && post.root_id !== '') {
            this.analytics?.trackAPI('api_posts_replied', {channel_id: post.channel_id});
        }

        return this.doFetch(
            `${this.getPostsRoute()}`,
            {method: 'post', body: post, noRetry: true},
        );
    };

    updatePost = async (post: Post) => {
        this.analytics?.trackAPI('api_posts_update', {channel_id: post.channel_id});

        return this.doFetch(
            `${this.getPostRoute(post.id)}`,
            {method: 'put', body: post},
        );
    };

    getPost = async (postId: string) => {
        return this.doFetch(
            `${this.getPostRoute(postId)}`,
            {method: 'get'},
        );
    };

    patchPost = async (postPatch: Partial<Post> & {id: string}) => {
        this.analytics?.trackAPI('api_posts_patch', {channel_id: postPatch.channel_id});

        return this.doFetch(
            `${this.getPostRoute(postPatch.id)}/patch`,
            {method: 'put', body: postPatch},
        );
    };

    deletePost = async (postId: string) => {
        this.analytics?.trackAPI('api_posts_delete');

        return this.doFetch(
            `${this.getPostRoute(postId)}`,
            {method: 'delete'},
        );
    };

    getPostThread = (postId: string, options: FetchPaginatedThreadOptions) => {
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
            {method: 'get'},
        );
    };

    getPosts = async (channelId: string, page = 0, perPage = PER_PAGE_DEFAULT, collapsedThreads = false, collapsedThreadsExtended = false) => {
        return this.doFetch(
            `${this.getChannelRoute(channelId)}/posts${buildQueryString({page, per_page: perPage, collapsedThreads, collapsedThreadsExtended})}`,
            {method: 'get'},
        );
    };

    getPostsSince = async (channelId: string, since: number, collapsedThreads = false, collapsedThreadsExtended = false) => {
        return this.doFetch(
            `${this.getChannelRoute(channelId)}/posts${buildQueryString({since, collapsedThreads, collapsedThreadsExtended})}`,
            {method: 'get'},
        );
    };

    getPostsBefore = async (channelId: string, postId = '', page = 0, perPage = PER_PAGE_DEFAULT, collapsedThreads = false, collapsedThreadsExtended = false) => {
        this.analytics?.trackAPI('api_posts_get_before', {channel_id: channelId});

        return this.doFetch(
            `${this.getChannelRoute(channelId)}/posts${buildQueryString({before: postId, page, per_page: perPage, collapsedThreads, collapsedThreadsExtended})}`,
            {method: 'get'},
        );
    };

    getPostsAfter = async (channelId: string, postId: string, page = 0, perPage = PER_PAGE_DEFAULT, collapsedThreads = false, collapsedThreadsExtended = false) => {
        this.analytics?.trackAPI('api_posts_get_after', {channel_id: channelId});

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
        this.analytics?.trackAPI('api_posts_get_flagged', {team_id: teamId});

        return this.doFetch(
            `${this.getUserRoute(userId)}/posts/flagged${buildQueryString({channel_id: channelId, team_id: teamId, page, per_page: perPage})}`,
            {method: 'get'},
        );
    };

    getPinnedPosts = async (channelId: string) => {
        this.analytics?.trackAPI('api_posts_get_pinned', {channel_id: channelId});
        return this.doFetch(
            `${this.getChannelRoute(channelId)}/pinned`,
            {method: 'get'},
        );
    };

    markPostAsUnread = async (userId: string, postId: string) => {
        this.analytics?.trackAPI('api_post_set_unread_post');

        // collapsed_threads_supported is not based on user preferences but to know if "CLIENT" supports CRT
        const body = JSON.stringify({collapsed_threads_supported: true});

        return this.doFetch(
            `${this.getUserRoute(userId)}/posts/${postId}/set_unread`,
            {method: 'post', body},
        );
    };

    pinPost = async (postId: string) => {
        this.analytics?.trackAPI('api_posts_pin');

        return this.doFetch(
            `${this.getPostRoute(postId)}/pin`,
            {method: 'post'},
        );
    };

    unpinPost = async (postId: string) => {
        this.analytics?.trackAPI('api_posts_unpin');

        return this.doFetch(
            `${this.getPostRoute(postId)}/unpin`,
            {method: 'post'},
        );
    };

    addReaction = async (userId: string, postId: string, emojiName: string) => {
        this.analytics?.trackAPI('api_reactions_save', {post_id: postId});

        return this.doFetch(
            `${this.getReactionsRoute()}`,
            {method: 'post', body: {user_id: userId, post_id: postId, emoji_name: emojiName}},
        );
    };

    removeReaction = async (userId: string, postId: string, emojiName: string) => {
        this.analytics?.trackAPI('api_reactions_delete', {post_id: postId});

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
        this.analytics?.trackAPI('api_posts_search');
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
        if (selectedOption) {
            this.analytics?.trackAPI('api_interactive_messages_menu_selected');
        } else {
            this.analytics?.trackAPI('api_interactive_messages_button_clicked');
        }

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
};

export default ClientPosts;
