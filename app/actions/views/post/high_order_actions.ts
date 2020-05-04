// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@mm-redux/client';
import {ActionFunc, DispatchFunc, GetStateFunc, batchActions, SuccessResult} from '@mm-redux/types/actions';
import {Channel, ChannelMembership} from '@mm-redux/types/channels';
import {Post} from '@mm-redux/types/posts';

import {getPostIdsInChannel} from '@mm-redux/selectors/entities/posts';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';

import {
    getPosts,
    getPostsSince,
    getPostsAdditionalDataBatch,
} from '@actions/views/post';
import {
    setLoadMorePostsVisible,
    setChannelRetryFailed,
    setLastGetPostsForChannel,
} from '@actions/views/channels';
import {dispatchWithRetry} from '@actions/helpers/general';
import {
    receivedPosts,
    receivedPostsSince,
    receivedPostsInChannel,
} from '@mm-redux/actions/posts';

import {ViewTypes} from '@constants';
import {getChannelSinceValue} from '@utils/channels';
import {isUnreadChannel, isArchivedChannel} from '@mm-redux/utils/channel_utils';

export function loadPostsIfNecessaryWithRetry(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const postIds = getPostIdsInChannel(state, channelId);
        const actions = [];

        const time = Date.now();

        let postAction;
        if (!postIds || postIds.length < ViewTypes.POST_VISIBILITY_CHUNK_SIZE) {
            // Get the first page of posts if it appears we haven't gotten it yet, like the webapp
            postAction = getPosts(channelId);
        } else {
            const since = getChannelSinceValue(state, channelId, postIds);
            postAction = getPostsSince(channelId, since);
        }

        const result = await dispatch(dispatchWithRetry(postAction));
        const {data} = <SuccessResult>result;

        let loadMorePostsVisible = true;
        if (data) {
            actions.push(
                setLastGetPostsForChannel(channelId, time),
                setChannelRetryFailed(false),
            );

            if (data.order) {
                const count = data.order.length;
                loadMorePostsVisible = count >= ViewTypes.POST_VISIBILITY_CHUNK_SIZE;
            }
        } else {
            actions.push(setChannelRetryFailed(true));
        }

        actions.push(setLoadMorePostsVisible(loadMorePostsVisible));

        dispatch(batchActions(actions, 'BATCH_LOAD_POSTS_IN_CHANNEL'));

        return {data: true};
    };
}

export function loadUnreadChannelPosts(channels: Channel[], channelMembers: ChannelMembership[]): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentChannelId = getCurrentChannelId(state);

        const promises: any[] = [];
        const promiseTrace: any[] = [];

        const channelMembersByChannel: any = {};
        channelMembers.forEach((member) => {
            channelMembersByChannel[member.channel_id] = member;
        });

        channels.forEach((channel) => {
            if (channel.id === currentChannelId || isArchivedChannel(channel)) {
                return;
            }

            const isUnread = isUnreadChannel(channelMembersByChannel, channel);
            if (!isUnread) {
                return;
            }

            const postIds = getPostIdsInChannel(state, channel.id);

            let promise;
            const trace = {
                channelId: channel.id,
                since: false,
            };
            if (!postIds || !postIds.length) {
                // Get the first page of posts if it appears we haven't gotten it yet, like the webapp
                promise = Client4.getPosts(channel.id);
            } else {
                const since = getChannelSinceValue(state, channel.id, postIds);
                promise = Client4.getPostsSince(channel.id, since);
                trace.since = since;
            }

            promises.push(promise);
            promiseTrace.push(trace);
        });

        let posts: Post[] = [];
        const actions = [];
        if (promises.length) {
            const results = await Promise.all(promises);
            results.forEach((data, index) => {
                const channelPosts: Post[] = Object.values(data.posts);
                if (channelPosts.length) {
                    posts = posts.concat(channelPosts);

                    const trace = promiseTrace[index];
                    if (trace.since) {
                        actions.push(receivedPostsSince(data, trace.channelId));
                    } else {
                        actions.push(receivedPostsInChannel(data, trace.channelId, true, data.prev_post_id === ''));
                    }

                    actions.push(setLastGetPostsForChannel(trace.channelId, Date.now()));
                }
            });
        }

        console.log(`Fetched ${posts.length} posts from ${promises.length} unread channels`); //eslint-disable-line no-console
        if (posts.length) {
            const combinedPostList = {
                posts,
                order: [],
                next_post_id: '',
                prev_post_id: '',
            }
            actions.push(receivedPosts(combinedPostList));
            const additional = await dispatch(getPostsAdditionalDataBatch(posts));
            const {data} = <SuccessResult>additional;
            if (data.length) {
                actions.push(...data);
            }

            dispatch(batchActions(actions));
        }

        return {data: true};
    };
}