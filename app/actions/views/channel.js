// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {ViewTypes} from 'app/constants';
import {updateStorage} from 'app/actions/storage';
import {closeDrawers} from 'app/actions/navigation';

import {
    fetchMyChannelsAndMembers,
    getChannelStats,
    getMyChannelMembers,
    selectChannel,
    leaveChannel as serviceLeaveChannel
} from 'service/actions/channels';
import {getPosts, getPostsSince} from 'service/actions/posts';
import {getFilesForPost} from 'service/actions/files';
import {savePreferences, deletePreferences} from 'service/actions/preferences';
import {getTeamMembersByIds} from 'service/actions/teams';
import {Constants, UsersTypes} from 'service/constants';
import {getChannelByName, getDirectChannelName, isDirectChannelVisible} from 'service/utils/channel_utils';
import {getPreferencesByCategory} from 'service/utils/preference_utils';

export function loadChannelsIfNecessary(teamId) {
    return async (dispatch, getState) => {
        const {channels} = getState().entities.channels;

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
        const state = getState();
        const postsInChannel = state.entities.posts.postsByChannel[channel.id];

        // Make sure we include a team id for DM channels
        const teamId = channel.team_id || state.entities.teams.currentId;

        // Get the first page of posts if it appears we haven't gotten it yet, like the webapp
        if (!postsInChannel || postsInChannel.length < Constants.POST_CHUNK_SIZE) {
            return getPosts(teamId, channel.id)(dispatch, getState);
        }

        const latestPostInChannel = state.entities.posts.posts[postsInChannel[0]];

        return getPostsSince(teamId, channel.id, latestPostInChannel.create_at)(dispatch, getState);
    };
}

export function loadFilesForPostIfNecessary(post) {
    return async (dispatch, getState) => {
        const {files, teams} = getState().entities;
        const fileIdsForPost = files.fileIdsByPostId[post.id];

        if (!fileIdsForPost) {
            const teamId = teams.currentId;
            await getFilesForPost(teamId, post.channel_id, post.id)(dispatch, getState);
        }
    };
}

export function selectInitialChannel(teamId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {channels, myMembers} = state.entities.channels;
        const currentChannelId = state.entities.channels.currentId;
        const currentUserId = state.entities.users.currentId;
        const currentChannel = channels[currentChannelId];
        const {myPreferences} = state.entities.preferences;

        if (currentChannel && myMembers[currentChannelId] &&
            (currentChannel.team_id === teamId || (currentChannel.type === Constants.DM_CHANNEL &&
            isDirectChannelVisible(currentUserId, myPreferences, currentChannel)))) {
            await handleSelectChannel(currentChannelId)(dispatch, getState);
            return;
        }

        const channel = Object.values(channels).find((c) => c.team_id === teamId && c.name === Constants.DEFAULT_CHANNEL);
        if (channel) {
            await handleSelectChannel(channel.id)(dispatch, getState);
        } else {
            // Handle case when the default channel cannot be found
            // so we need to get the first available channel of the team
            const channelsInTeam = Object.values(channels).filter((c) => c.team_id === teamId);
            const firstChannel = channelsInTeam[0].id;
            await handleSelectChannel(firstChannel.id)(dispatch, getState);
        }
    };
}

export function handleSelectChannel(channelId) {
    return async (dispatch, getState) => {
        const currentTeamId = getState().entities.teams.currentId;

        await updateStorage(currentTeamId, {currentChannelId: channelId});
        await selectChannel(channelId)(dispatch, getState);
        await getChannelStats(currentTeamId, channelId)(dispatch, getState);

        setTimeout(async () => {
            await closeDrawers()(dispatch, getState); // trying to smooth out channel switch transitions
        }, 200);
    };
}

export function handlePostDraftChanged(channelId, postDraft) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.POST_DRAFT_CHANGED,
            channelId,
            postDraft
        }, getState);
    };
}

export function toggleDMChannel(otherUserId, visible) {
    return async (dispatch, getState) => {
        const state = getState();
        const userId = state.entities.users.currentId;

        const dm = [{
            user_id: userId,
            category: Constants.CATEGORY_DIRECT_CHANNEL_SHOW,
            name: otherUserId,
            value: visible
        }];

        return savePreferences(dm)(dispatch, getState);
    };
}

export function closeDMChannel(channel) {
    return async(dispatch, getState) => {
        const state = getState();

        if (channel.isFavorite) {
            unmarkFavorite(channel.id)(dispatch, getState);
        }

        toggleDMChannel(channel.teammate_id, 'false')(dispatch, getState).then(() => {
            if (channel.isCurrent) {
                selectInitialChannel(state.entities.teams.currentId)(dispatch, getState);
            }
        });
    };
}

export function markFavorite(channelId) {
    return async (dispatch, getState) => {
        const userId = getState().entities.users.currentId;
        const fav = [{
            user_id: userId,
            category: Constants.CATEGORY_FAVORITE_CHANNEL,
            name: channelId,
            value: 'true'
        }];
        savePreferences(fav)(dispatch, getState);
    };
}

export function unmarkFavorite(channelId) {
    return async (dispatch, getState) => {
        const userId = getState().entities.users.currentId;
        const fav = [{
            user_id: userId,
            category: Constants.CATEGORY_FAVORITE_CHANNEL,
            name: channelId
        }];
        deletePreferences(fav)(dispatch, getState);
    };
}

export function leaveChannel(channel, reset = false) {
    return async (dispatch, getState) => {
        const {currentId: teamId} = getState().entities.teams;
        await serviceLeaveChannel(teamId, channel.id)(dispatch, getState);
        if (channel.isCurrent || reset) {
            await selectInitialChannel(teamId)(dispatch, getState);
        }
    };
}
