// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

import {General} from 'app/constants';
import {PostTypes, UserTypes} from 'app/realm/action_types';
import {getNeededAtMentionedUsernames} from 'app/realm/utils/post';
import EphemeralStore from 'app/store/ephemeral_store';

import {getCustomEmojisForPosts} from './emoji';
import {forceLogoutIfNecessary} from './helpers';

const MAX_POST_TRIES = 3;

export function loadPostsWithRetry(channelId) {
    return async (dispatch, getState) => {
        const realm = getState();
        const PostsTimesInChannel = realm.objects('PostsTimesInChannel').filtered('channelId=$0', channelId).sorted('end', true);

        let received = {data: []};
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
            const lastGetPosts = EphemeralStore.postsForChannelSince[channelId];

            let since;
            if (lastGetPosts && lastGetPosts < lastConnectAt) {
                // Since the websocket disconnected, we may have missed some posts since then
                since = lastGetPosts;
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

        return {data: posts};
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

        return {data: posts};
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

            return data;
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }
    };
}

