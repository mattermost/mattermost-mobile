// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';
import {ViewTypes} from 'app/constants';
import {updateStorage} from 'app/actions/storage';
import {closeDrawers} from 'app/actions/navigation';

import {
    fetchMyChannelsAndMembers,
    getMyChannelMembers,
    selectChannel,
    leaveChannel as serviceLeaveChannel} from 'service/actions/channels';
import {getPosts} from 'service/actions/posts';
import {savePreferences, deletePreferences} from 'service/actions/preferences';
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
        const state = getState();
        const {channels, myMembers} = state.entities.channels;
        const currentChannelId = state.entities.channels.currentId;
        const currentChannel = channels[currentChannelId];

        if (currentChannel && myMembers[currentChannelId] &&
            (currentChannel.team_id === teamId || currentChannel.type === Constants.DM_CHANNEL)) {
            await selectChannel(currentChannelId)(dispatch, getState);
            return;
        }

        const channel = Object.values(channels).find((c) => c.team_id === teamId && c.name === Constants.DEFAULT_CHANNEL);
        if (channel) {
            await selectChannel(channel.id)(dispatch, getState);
        } else {
            // Handle case when the default channel cannot be found
            // so we need to get the first available channel of the team
            const channelsInTeam = Object.values(channels).filter((c) => c.team_id === teamId);
            const firstChannel = channelsInTeam[0].id;
            await selectChannel(firstChannel.id)(dispatch, getState);
        }
    };
}

export function handleSelectChannel(channelId) {
    return async (dispatch, getState) => {
        const currentTeamId = getState().entities.teams.currentId;

        await updateStorage(currentTeamId, {currentChannelId: channelId});
        await selectChannel(channelId)(dispatch, getState);
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

export function closeDMChannel(channel) {
    return async(dispatch, getState) => {
        const state = getState();
        const userId = state.entities.users.currentId;

        const dm = [{
            user_id: userId,
            category: Constants.CATEGORY_DIRECT_CHANNEL_SHOW,
            name: channel.teammate_id,
            value: 'false'
        }];

        if (channel.isFavorite) {
            unmarkFavorite(channel.id)(dispatch, getState);
        }
        savePreferences(dm)(dispatch, getState).then(() => {
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
