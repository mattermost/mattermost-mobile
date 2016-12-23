// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {fetchMyChannelsAndMembers, selectChannel} from 'service/actions/channels';
import {getPosts} from 'service/actions/posts';
import {getProfilesByIds} from 'service/actions/users';
import {Constants} from 'service/constants';

export function loadChannelsIfNecessary(teamId) {
    return async (dispatch, getState) => {
        const channels = getState().entities.channels.channels;

        let hasChannelsForTeam = false;
        for (const channel of Object.values(channels)) {
            if (channel.team_id === teamId) {
                // If we have one channel, assume we have all of them
                hasChannelsForTeam = true;
                break;
            }
        }

        if (!hasChannelsForTeam) {
            await fetchMyChannelsAndMembers(teamId)(dispatch, getState);
        }
    };
}

export function loadPostsIfNecessary(channel) {
    return async (dispatch, getState) => {
        const postsInChannel = getState().entities.posts.postsByChannel[channel.id];

        if (!postsInChannel) {
            const posts = await getPosts(channel.team_id, channel.id)(dispatch, getState);

            const userIds = new Set();

            const state = getState();
            for (const post of Object.values(posts.posts)) {
                if (!state.entities.users.profiles[post.user_id]) {
                    userIds.add(post.user_id);
                }
            }

            await getProfilesByIds(Array.from(userIds))(dispatch, getState);
        }
    };
}

export function selectInitialChannel(teamId) {
    return async (dispatch, getState) => {
        const channels = getState().entities.channels.channels;

        for (const channel of Object.values(channels)) {
            // TODO figure out how to handle when we can't find the town square
            if (channel.team_id === teamId && channel.name === Constants.DEFAULT_CHANNEL) {
                await selectChannel(channel.id)(dispatch, getState);
                break;
            }
        }
    };
}

export default {
    loadChannelsIfNecessary,
    selectInitialChannel
};
