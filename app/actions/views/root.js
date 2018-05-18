// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {GeneralTypes, PostTypes} from 'mattermost-redux/action_types';
import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';
import {markChannelAsRead} from 'mattermost-redux/actions/channels';
import {getClientConfig, getDataRetentionPolicy, getLicenseConfig} from 'mattermost-redux/actions/general';
import {getPosts} from 'mattermost-redux/actions/posts';
import {getMyTeams, getMyTeamMembers, selectTeam} from 'mattermost-redux/actions/teams';

import {ViewTypes} from 'app/constants';
import {recordTime} from 'app/utils/segment';

import {
    handleSelectChannel,
    setChannelDisplayName,
    retryGetPostsAction,
} from 'app/actions/views/channel';

export function startDataCleanup() {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.DATA_CLEANUP,
            payload: getState(),
        });
    };
}

export function loadConfigAndLicense() {
    return async (dispatch, getState) => {
        const {currentUserId} = getState().entities.users;
        const [configData, licenseData] = await Promise.all([
            getClientConfig()(dispatch, getState),
            getLicenseConfig()(dispatch, getState),
        ]);

        const config = configData.data || {};
        const license = licenseData.data || {};

        if (currentUserId) {
            if (config.DataRetentionEnableMessageDeletion && config.DataRetentionEnableMessageDeletion === 'true' &&
                license.IsLicensed === 'true' && license.DataRetention === 'true') {
                getDataRetentionPolicy()(dispatch, getState);
            } else {
                dispatch({type: GeneralTypes.RECEIVED_DATA_RETENTION_POLICY, data: {}});
            }
        }

        return {config, license};
    };
}

export function loadFromPushNotification(notification) {
    return async (dispatch, getState) => {
        const state = getState();
        const {data} = notification;
        const {currentTeamId, teams, myMembers: myTeamMembers} = state.entities.teams;
        const {currentChannelId} = state.entities.channels;
        const channelId = data.channel_id;

        // when the notification does not have a team id is because its from a DM or GM
        const teamId = data.team_id || currentTeamId;

        //verify that we have the team loaded
        if (teamId && (!teams[teamId] || !myTeamMembers[teamId])) {
            await Promise.all([
                getMyTeams()(dispatch, getState),
                getMyTeamMembers()(dispatch, getState),
            ]);
        }

        // when the notification is from a team other than the current team
        if (teamId !== currentTeamId) {
            selectTeam({id: teamId})(dispatch, getState);
        }

        // when the notification is from the same channel as the current channel
        // we should get the posts
        if (channelId === currentChannelId) {
            markChannelAsRead(channelId, null, false)(dispatch, getState);
            await retryGetPostsAction(getPosts(channelId), dispatch, getState);
        } else {
            // when the notification is from a channel other than the current channel
            markChannelAsRead(channelId, currentChannelId, false)(dispatch, getState);
            dispatch(setChannelDisplayName(''));
            handleSelectChannel(channelId)(dispatch, getState);
        }
    };
}

export function purgeOfflineStore() {
    return {type: General.OFFLINE_STORE_PURGE};
}

export function createPost(post) {
    return (dispatch, getState) => {
        const state = getState();
        const currentUserId = state.entities.users.currentUserId;

        const timestamp = Date.now();
        const pendingPostId = post.pending_post_id || `${currentUserId}:${timestamp}`;

        const newPost = {
            ...post,
            pending_post_id: pendingPostId,
            create_at: timestamp,
            update_at: timestamp,
        };

        return Client4.createPost({...newPost, create_at: 0}).then((payload) => {
            dispatch({
                type: PostTypes.RECEIVED_POSTS,
                data: {
                    order: [],
                    posts: {
                        [payload.id]: payload,
                    },
                },
                channelId: payload.channel_id,
            });
        });
    };
}

export function recordLoadTime(screenName, category) {
    return async (dispatch, getState) => {
        const {currentUserId} = getState().entities.users;

        recordTime(screenName, category, currentUserId);
    };
}

export default {
    loadConfigAndLicense,
    loadFromPushNotification,
    purgeOfflineStore,
};
