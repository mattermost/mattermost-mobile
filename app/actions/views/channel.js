// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {ViewTypes} from 'app/constants';

import {fetchMyChannelsAndMembers, getMyChannelMembers, selectChannel} from 'service/actions/channels';
import {getPosts} from 'service/actions/posts';
import {getTeamMembersByIds} from 'service/actions/teams';
import {Constants, UsersTypes} from 'service/constants';
import {getChannelByName, getDirectChannelName} from 'service/utils/channel_utils';
import {getPreferencesByCategory} from 'service/utils/preference_utils';

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

        if (hasChannelsForTeam) {
            await getMyChannelMembers(teamId)(dispatch, getState);
        } else {
            await fetchMyChannelsAndMembers(teamId)(dispatch, getState);
        }
    };
}

export function loadProfilesAndTeamMembersForDMSidebar(teamId) {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = state.entities.users.currentId;
        const {channels} = state.entities.channels;
        const {myPreferences} = state.entities.preferences;
        const {membersInTeam} = state.entities.teams;
        const dmPrefs = getPreferencesByCategory(myPreferences, Constants.CATEGORY_DIRECT_CHANNEL_SHOW);
        const members = [];

        for (const [key, pref] of dmPrefs) {
            if (pref.value === 'true') {
                members.push(key);
            }
        }

        let membersToLoad = members;
        if (membersInTeam[teamId]) {
            membersToLoad = members.filter((m) => !membersInTeam[teamId].has(m));
        }

        if (membersToLoad.length) {
            await getTeamMembersByIds(teamId, membersToLoad)(dispatch, getState);
        }

        const actions = [];
        for (let i = 0; i < members.length; i++) {
            const channelName = getDirectChannelName(currentUserId, members[i]);
            const channel = getChannelByName(channels, channelName);
            if (channel) {
                actions.push({
                    type: UsersTypes.RECEIVED_PROFILE_IN_CHANNEL,
                    data: {user_id: members[i]},
                    id: channel.id
                });
            }
        }

        if (actions.length) {
            dispatch(batchActions(actions), getState);
        }
    };
}

export function loadPostsIfNecessary(channel) {
    return async (dispatch, getState) => {
        const postsInChannel = getState().entities.posts.postsByChannel[channel.id];

        if (!postsInChannel) {
            let teamId = channel.team_id;
            if (!teamId) {
                teamId = getState().entities.teams.currentId;
            }
            await getPosts(teamId, channel.id)(dispatch, getState);
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

export function handlePostDraftChanged(postDraft) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.POST_DRAFT_CHANGED,
            postDraft
        }, getState);
    };
}
