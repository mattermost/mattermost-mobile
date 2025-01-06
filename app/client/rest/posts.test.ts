// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';
import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';
import type {ClientPostsMix} from './posts';

describe('ClientPosts', () => {
    let client: ClientPostsMix & ClientBase;

    beforeEach(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('createPost', async () => {
        const post = {id: 'post_id', message: 'message'} as Post;
        await client.createPost(post);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getPostsRoute(),
            {method: 'post', body: post, noRetry: true},
        );
    });

    test('updatePost', async () => {
        const post = {id: 'post_id', message: 'updated message'} as Post;
        await client.updatePost(post);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getPostRoute(post.id),
            {method: 'put', body: post},
        );
    });

    test('getPost', async () => {
        const postId = 'post_id';
        await client.getPost(postId);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getPostRoute(postId),
            {method: 'get', groupLabel: undefined},
        );
    });

    test('patchPost', async () => {
        const postPatch = {id: 'post_id', message: 'patched message'};
        await client.patchPost(postPatch);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getPostRoute(postPatch.id)}/patch`,
            {method: 'put', body: postPatch},
        );
    });

    test('deletePost', async () => {
        const postId = 'post_id';
        await client.deletePost(postId);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getPostRoute(postId),
            {method: 'delete'},
        );
    });

    test('getPostThread', async () => {
        const postId = 'post_id';
        const options = {fetchThreads: true, collapsedThreads: false, collapsedThreadsExtended: false, direction: 'up'} as FetchPaginatedThreadOptions;
        await client.getPostThread(postId, options);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getPostRoute(postId)}/thread${buildQueryString({skipFetchThreads: !options.fetchThreads, collapsedThreads: options.collapsedThreads, collapsedThreadsExtended: options.collapsedThreadsExtended, direction: options.direction, perPage: PER_PAGE_DEFAULT})}`,
            {method: 'get', groupLabel: undefined},
        );

        // Test with default options
        await client.getPostThread(postId, {fetchAll: true});
        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getPostRoute(postId)}/thread${buildQueryString({skipFetchThreads: false, collapsedThreads: false, collapsedThreadsExtended: false, direction: 'up', perPage: PER_PAGE_DEFAULT})}`,
            {method: 'get', groupLabel: undefined},
        );
    });

    test('getPosts', async () => {
        const channelId = 'channel_id';
        await client.getPosts(channelId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getChannelRoute(channelId)}/posts${buildQueryString({page: 0, per_page: PER_PAGE_DEFAULT, collapsedThreads: false, collapsedThreadsExtended: false})}`,
            {method: 'get', groupLabel: undefined},
        );
    });

    test('getPostsSince', async () => {
        const channelId = 'channel_id';
        const since = 123456789;
        await client.getPostsSince(channelId, since);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getChannelRoute(channelId)}/posts${buildQueryString({since, collapsedThreads: false, collapsedThreadsExtended: false})}`,
            {method: 'get', groupLabel: undefined},
        );
    });

    test('getPostsBefore', async () => {
        const channelId = 'channel_id';
        const postId = 'post_id';
        await client.getPostsBefore(channelId, postId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getChannelRoute(channelId)}/posts${buildQueryString({before: postId, page: 0, per_page: PER_PAGE_DEFAULT, collapsedThreads: false, collapsedThreadsExtended: false})}`,
            {method: 'get'},
        );
    });

    test('getPostsAfter', async () => {
        const channelId = 'channel_id';
        const postId = 'post_id';
        await client.getPostsAfter(channelId, postId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getChannelRoute(channelId)}/posts${buildQueryString({after: postId, page: 0, per_page: PER_PAGE_DEFAULT, collapsedThreads: false, collapsedThreadsExtended: false})}`,
            {method: 'get'},
        );
    });

    test('getFileInfosForPost', async () => {
        const postId = 'post_id';
        await client.getFileInfosForPost(postId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getPostRoute(postId)}/files/info`,
            {method: 'get'},
        );
    });

    test('getSavedPosts', async () => {
        const userId = 'user_id';
        await client.getSavedPosts(userId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getUserRoute(userId)}/posts/flagged${buildQueryString({channel_id: '', team_id: '', page: 0, per_page: PER_PAGE_DEFAULT})}`,
            {method: 'get'},
        );
    });

    test('getPinnedPosts', async () => {
        const channelId = 'channel_id';
        await client.getPinnedPosts(channelId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getChannelRoute(channelId)}/pinned`,
            {method: 'get'},
        );
    });

    test('markPostAsUnread', async () => {
        const userId = 'user_id';
        const postId = 'post_id';
        await client.markPostAsUnread(userId, postId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getUserRoute(userId)}/posts/${postId}/set_unread`,
            {method: 'post', body: JSON.stringify({collapsed_threads_supported: true})},
        );
    });

    test('pinPost', async () => {
        const postId = 'post_id';
        await client.pinPost(postId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getPostRoute(postId)}/pin`,
            {method: 'post'},
        );
    });

    test('unpinPost', async () => {
        const postId = 'post_id';
        await client.unpinPost(postId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getPostRoute(postId)}/unpin`,
            {method: 'post'},
        );
    });

    test('addReaction', async () => {
        const userId = 'user_id';
        const postId = 'post_id';
        const emojiName = 'emoji_name';
        await client.addReaction(userId, postId, emojiName);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getReactionsRoute(),
            {method: 'post', body: {user_id: userId, post_id: postId, emoji_name: emojiName}},
        );
    });

    test('removeReaction', async () => {
        const userId = 'user_id';
        const postId = 'post_id';
        const emojiName = 'emoji_name';
        await client.removeReaction(userId, postId, emojiName);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getUserRoute(userId)}/posts/${postId}/reactions/${emojiName}`,
            {method: 'delete'},
        );
    });

    test('getReactionsForPost', async () => {
        const postId = 'post_id';
        await client.getReactionsForPost(postId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getPostRoute(postId)}/reactions`,
            {method: 'get'},
        );
    });

    test('searchPostsWithParams', async () => {
        const teamId = 'team_id';
        const params = {terms: 'search terms', is_or_search: false};

        // Test with teamId
        await client.searchPostsWithParams(teamId, params);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getTeamRoute(teamId)}/posts/search`,
            {method: 'post', body: params},
        );

        // Test without teamId
        await client.searchPostsWithParams('', params);
        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getPostsRoute()}/search`,
            {method: 'post', body: params},
        );
    });

    test('searchPosts', async () => {
        const teamId = 'team_id';
        const terms = 'search terms';
        const isOrSearch = false;
        const spy = jest.spyOn(client, 'searchPostsWithParams').mockResolvedValue({} as SearchPostResponse);

        await client.searchPosts(teamId, terms, isOrSearch);

        expect(spy).toHaveBeenCalledWith(teamId, {terms, is_or_search: isOrSearch});
    });

    test('doPostAction', async () => {
        const postId = 'post_id';
        const actionId = 'action_id';
        const selectedOption = 'selected_option';
        const spy = jest.spyOn(client, 'doPostActionWithCookie').mockResolvedValue({});

        await client.doPostAction(postId, actionId, selectedOption);

        expect(spy).toHaveBeenCalledWith(postId, actionId, '', selectedOption);
    });

    test('doPostActionWithCookie', async () => {
        const postId = 'post_id';
        const actionId = 'action_id';
        const actionCookie = 'action_cookie';
        const selectedOption = 'selected_option';
        await client.doPostActionWithCookie(postId, actionId, actionCookie, selectedOption);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getPostRoute(postId)}/actions/${encodeURIComponent(actionId)}`,
            {method: 'post', body: {selected_option: selectedOption, cookie: actionCookie}},
        );
    });

    test('acknowledgePost', async () => {
        const postId = 'post_id';
        const userId = 'user_id';
        await client.acknowledgePost(postId, userId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getUserRoute(userId)}/posts/${postId}/ack`,
            {method: 'post'},
        );
    });

    test('unacknowledgePost', async () => {
        const postId = 'post_id';
        const userId = 'user_id';
        await client.unacknowledgePost(postId, userId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getUserRoute(userId)}/posts/${postId}/ack`,
            {method: 'delete'},
        );
    });

    test('sendTestNotification', async () => {
        await client.sendTestNotification();

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.urlVersion}/notifications/test`,
            {method: 'post'},
        );
    });
});
