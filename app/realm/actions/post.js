// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

import {General} from 'app/constants';
import {PostTypes, UserTypes} from 'app/realm/action_types';
import {getNeededAtMentionedUsernames} from 'app/realm/utils/post';
import EphemeralStore from 'app/store/ephemeral_store';

import {getCustomEmojisForPosts} from './emoji';
import {forceLogoutIfNecessary} from './helpers';

import telemetry from 'app/telemetry';

const MAX_POST_TRIES = 3;

// TODO: Remove redux compatibility
import {batchActions} from 'redux-batched-actions';
import {reduxStore} from 'app/store';
import {increasePostVisibility, loadThreadIfNecessary} from 'app/actions/views/channel';
import {receivedPosts, receivedPostsBefore} from 'mattermost-redux/actions/posts';

export function loadPostsWithRetry(channelId) {
    return async (dispatch, getState) => {
        const realm = getState();
        const PostsTimesInChannel = realm.objects('PostsTimesInChannel').filtered('channelId=$0', channelId).sorted('end', true);

        EphemeralStore.loadingPosts = true;
        let received = {data: {posts: [], order: []}};
        let hasMorePosts = true;
        if (PostsTimesInChannel.isEmpty()) {
            for (let i = 0; i < MAX_POST_TRIES; i++) {
                const result = await dispatch(loadPosts(channelId)); // eslint-disable-line no-await-in-loop
                if (result.data) {
                    received = result;
                    break;
                }
            }
        } else {
            const {lastConnectAt} = 0; // state.websocket; last time the WS connected
            const lastGetPostsTime = EphemeralStore.postsForChannelSince[channelId];

            let since;
            if (lastGetPostsTime && lastGetPostsTime < lastConnectAt) {
                // Since the websocket disconnected, we may have missed some posts since then
                since = lastGetPostsTime;
            } else {
                // Trust that we've received all posts since the last time the websocket disconnected
                // so just get any that have changed since the latest one we've received
                since = PostsTimesInChannel[0].end;
            }

            // load posts since
            for (let i = 0; i < MAX_POST_TRIES; i++) {
                const result = await dispatch(loadPostsSince(channelId, since)); // eslint-disable-line no-await-in-loop
                if (result.data) {
                    received = result;
                    break;
                }
            }
        }

        if (received.data?.order) {
            const count = received.data.order.length;
            hasMorePosts = count >= General.POST_CHUNK_SIZE;
        }

        EphemeralStore.setLoadingPosts(hasMorePosts);
        return received;
    };
}

export function loadPosts(channelId, page = 0, perPage = General.POST_CHUNK_SIZE) {
    return async (dispatch) => {
        let posts = [];
        let order = [];

        try {
            const result = await Client4.getPosts(channelId, page, perPage);
            posts = Object.values(result.posts);
            order = result.order;

            // Load missing users and statuses
            await dispatch(getProfilesAndStatusesForPosts(posts));

            // Load missing custom emojis for backwards compatibility on servers without metadata
            dispatch(getCustomEmojisForPosts(posts));
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }

        EphemeralStore.postsForChannelSince[channelId] = Date.now();

        if (posts.length) {
            dispatch({
                type: PostTypes.RECEIVED_POSTS_IN_CHANNEL,
                data: {
                    channelId,
                    posts,
                    order,
                },
            });
        }

        return {
            data: {
                posts,
                order,
            },
        };
    };
}

export function loadPostsSince(channelId, since) {
    return async (dispatch) => {
        let posts = [];
        let order = [];

        try {
            const result = await Client4.getPostsSince(channelId, since);
            posts = Object.values(result.posts);
            order = result.order;

            // Load missing users and statuses
            await dispatch(getProfilesAndStatusesForPosts(posts));

            // Load missing custom emojis for backwards compatibility on servers without metadata
            dispatch(getCustomEmojisForPosts(posts));
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }

        EphemeralStore.postsForChannelSince[channelId] = Date.now();

        if (posts.length) {
            dispatch({
                type: PostTypes.RECEIVED_POSTS_IN_CHANNEL_SINCE,
                data: {
                    channelId,
                    posts,
                    order,
                },
            });
        }

        return {
            data: {
                posts,
                order,
            },
        };
    };
}

export function loadPostsBefore(channelId, beforePostId, page, perPage) {
    return async (dispatch) => {
        let posts = [];
        let order = [];

        try {
            const result = await Client4.getPostsBefore(channelId, beforePostId, page, perPage);
            posts = Object.values(result.posts);
            order = result.order;

            // Load missing users and statuses
            await dispatch(getProfilesAndStatusesForPosts(posts));

            // Load missing custom emojis for backwards compatibility on servers without metadata
            dispatch(getCustomEmojisForPosts(posts));

            // redux
            reduxStore.dispatch(batchActions([
                receivedPosts(result),
                receivedPostsBefore(result, channelId, beforePostId),
            ]));
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }

        if (posts.length) {
            dispatch({
                type: PostTypes.RECEIVED_POSTS_BEFORE,
                data: {
                    beforePostId,
                    channelId,
                    posts,
                    order,
                },
            });
        }

        return {
            data: {
                posts,
                order,
            },
        };
    };
}

// Returns true if there are more posts to load
export function loadMorePostsAbove(channelId, postId) {
    return async (dispatch) => {
        reduxStore.dispatch(increasePostVisibility(channelId, postId));
        const pageSize = General.POST_CHUNK_SIZE;

        if (!postId) {
            // No posts are visible, so the channel is empty
            return false;
        }

        EphemeralStore.loadingPosts = true;

        telemetry.reset();
        telemetry.start(['posts:loading']);

        let received = {data: {posts: [], order: []}};
        for (let i = 0; i < MAX_POST_TRIES; i++) {
            const result = await dispatch(loadPostsBefore(channelId, postId, 0, pageSize)); // eslint-disable-line no-await-in-loop
            if (result.data) {
                received = result;
                break;
            }
        }

        let hasMorePost = false;
        if (received.data?.order) {
            const count = received.data.order.length;
            hasMorePost = count >= pageSize;
        }

        EphemeralStore.loadingPosts = false;

        telemetry.end(['posts:loading']);
        telemetry.save();

        return hasMorePost;
    };
}

export function loadThread(rootId) {
    return async (dispatch) => {
        let posts = [];
        let order = [];

        try {
            const result = await Client4.getPostThread(rootId);
            posts = Object.values(result.posts);
            order = result.order;

            // Load missing users and statuses
            await dispatch(getProfilesAndStatusesForPosts(posts));

            // Load missing custom emojis for backwards compatibility on servers without metadata
            dispatch(getCustomEmojisForPosts(posts));
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }

        if (posts.length) {
            dispatch({
                type: PostTypes.RECEIVED_POSTS_IN_THREAD,
                data: {
                    posts,
                },
            });
        }

        return {
            data: {
                posts,
                order,
            },
        };
    };
}

export function loadThreadIfNeeded(rootId) {
    return async (dispatch, getState) => {
        reduxStore.dispatch(loadThreadIfNecessary(rootId));
        const realm = getState();
        const rootPost = realm.objectForPrimaryKey('Post', rootId);

        let received = {data: {posts: [], order: []}};
        if (!rootPost) {
            for (let i = 0; i < MAX_POST_TRIES; i++) {
                const result = await dispatch(loadThread(rootId)); // eslint-disable-line no-await-in-loop

                received = result;
                if (result.data) {
                    break;
                }
            }
        }

        return received;
    };
}

export function refreshChannelWithRetry(channelId) {
    return async (dispatch) => {
        let received = {data: {posts: [], order: []}};
        let hasMorePosts = true;

        for (let i = 0; i < MAX_POST_TRIES; i++) {
            const result = await dispatch(loadPosts(channelId)); // eslint-disable-line no-await-in-loop
            if (result.data) {
                received = result;
                break;
            }
        }

        if (received.data?.order) {
            const count = received.data.order.length;
            hasMorePosts = count >= General.POST_CHUNK_SIZE;
        }

        EphemeralStore.loadingPosts = hasMorePosts;
        return received;
    };
}

export function getProfilesAndStatusesForPosts(posts) {
    return async (dispatch, getState) => {
        const realm = getState();
        const userIds = new Set();
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const allUsers = realm.objects('User');

        posts.forEach((post) => {
            if (post.user_id !== general.currentUserId) {
                const existingUser = allUsers.filtered('id=$0', post.user_id)[0];
                if (!existingUser) {
                    userIds.add(post.user_id);
                }
            }
        });

        const usernames = Array.from(getNeededAtMentionedUsernames(allUsers, posts));
        const userIdsArray = Array.from(userIds);

        try {
            const [users, usersByUsername, statuses] = await Promise.all([
                userIdsArray.length ? Client4.getProfilesByIds(userIdsArray) : Promise.resolve([]),
                usernames.length ? Client4.getProfilesByUsernames(usernames) : Promise.resolve([]),
                userIdsArray.length ? Client4.getStatusesByIds(userIdsArray) : Promise.resolve([]),
            ]);

            const data = {
                users: users.concat(usersByUsername),
                statuses,
            };

            dispatch({
                type: UserTypes.RECEIVED_PROFILES,
                data,
            });

            // TODO: Remove redux
            reduxStore.dispatch({
                type: 'RECEIVED_PROFILES_LIST',
                data: users.concat(usersByUsername),
            });

            return data;
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }
    };
}

