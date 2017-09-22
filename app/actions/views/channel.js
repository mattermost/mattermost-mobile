// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {ViewTypes} from 'app/constants';

import {UserTypes} from 'mattermost-redux/action_types';
import {
    fetchMyChannelsAndMembers,
    getChannelStats,
    selectChannel,
    leaveChannel as serviceLeaveChannel,
    unfavoriteChannel
} from 'mattermost-redux/actions/channels';
import {getPosts, getPostsWithRetry, getPostsBefore, getPostsSinceWithRetry, getPostThread} from 'mattermost-redux/actions/posts';
import {getFilesForPost} from 'mattermost-redux/actions/files';
import {savePreferences} from 'mattermost-redux/actions/preferences';
import {getTeamMembersByIds} from 'mattermost-redux/actions/teams';
import {getProfilesInChannel} from 'mattermost-redux/actions/users';
import {General, Preferences} from 'mattermost-redux/constants';
import {
    getChannelByName,
    getDirectChannelName,
    getUserIdFromChannelName,
    isDirectChannelVisible,
    isGroupChannelVisible,
    isDirectChannel,
    isGroupChannel
} from 'mattermost-redux/utils/channel_utils';
import {getLastCreateAt} from 'mattermost-redux/utils/post_utils';
import {getPreferencesByCategory} from 'mattermost-redux/utils/preference_utils';

export function loadChannelsIfNecessary(teamId) {
    return async (dispatch, getState) => {
        await fetchMyChannelsAndMembers(teamId)(dispatch, getState);
    };
}

export function loadProfilesAndTeamMembersForDMSidebar(teamId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentUserId, profilesInChannel} = state.entities.users;
        const {channels, myMembers} = state.entities.channels;
        const {myPreferences} = state.entities.preferences;
        const {membersInTeam} = state.entities.teams;
        const dmPrefs = getPreferencesByCategory(myPreferences, Preferences.CATEGORY_DIRECT_CHANNEL_SHOW);
        const gmPrefs = getPreferencesByCategory(myPreferences, Preferences.CATEGORY_GROUP_CHANNEL_SHOW);
        const members = [];
        const loadProfilesForChannels = [];
        const prefs = [];

        function buildPref(name) {
            return {
                user_id: currentUserId,
                category: Preferences.CATEGORY_DIRECT_CHANNEL_SHOW,
                name,
                value: 'true'
            };
        }

        // Find DM's and GM's that need to be shown
        const directChannels = Object.values(channels).filter((c) => (isDirectChannel(c) || isGroupChannel(c)));
        directChannels.forEach((channel) => {
            const member = myMembers[channel.id];
            if (isDirectChannel(channel) && !isDirectChannelVisible(currentUserId, myPreferences, channel) && member.mention_count > 0) {
                const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
                let pref = dmPrefs.get(teammateId);
                if (pref) {
                    pref = {...pref, value: 'true'};
                } else {
                    pref = buildPref(teammateId);
                }
                dmPrefs.set(teammateId, pref);
                prefs.push(pref);
            } else if (isGroupChannel(channel) && !isGroupChannelVisible(myPreferences, channel) && (member.mention_count > 0 || member.msg_count < channel.total_msg_count)) {
                const id = channel.id;
                let pref = gmPrefs.get(id);
                if (pref) {
                    pref = {...pref, value: 'true'};
                } else {
                    pref = buildPref(id);
                }
                gmPrefs.set(id, pref);
                prefs.push(pref);
            }
        });

        if (prefs.length) {
            savePreferences(currentUserId, prefs)(dispatch, getState);
        }

        for (const [key, pref] of dmPrefs) {
            if (pref.value === 'true') {
                members.push(key);
            }
        }

        for (const [key, pref] of gmPrefs) {
            //only load the profiles in channels if we don't already have them
            if (pref.value === 'true' && !profilesInChannel[key]) {
                loadProfilesForChannels.push(key);
            }
        }

        if (loadProfilesForChannels.length) {
            for (let i = 0; i < loadProfilesForChannels.length; i++) {
                const channelId = loadProfilesForChannels[i];
                getProfilesInChannel(channelId, 0)(dispatch, getState);
            }
        }

        let membersToLoad = members;
        if (membersInTeam[teamId]) {
            membersToLoad = members.filter((m) => !membersInTeam[teamId].hasOwnProperty(m));
        }

        if (membersToLoad.length) {
            getTeamMembersByIds(teamId, membersToLoad)(dispatch, getState);
        }

        const actions = [];
        for (let i = 0; i < members.length; i++) {
            const channelName = getDirectChannelName(currentUserId, members[i]);
            const channel = getChannelByName(channels, channelName);
            if (channel) {
                actions.push({
                    type: UserTypes.RECEIVED_PROFILE_IN_CHANNEL,
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

export function loadPostsIfNecessaryWithRetry(channelId) {
    return (dispatch, getState) => {
        const state = getState();
        const {posts, postsInChannel} = state.entities.posts;

        const postsIds = postsInChannel[channelId];

        // Get the first page of posts if it appears we haven't gotten it yet, like the webapp
        if (!postsIds || postsIds.length < ViewTypes.POST_VISIBILITY_CHUNK_SIZE) {
            getPostsWithRetry(channelId)(dispatch, getState);
            return;
        }

        const postsForChannel = postsIds.map((id) => posts[id]);
        const latestPostTime = getLastCreateAt(postsForChannel);

        getPostsSinceWithRetry(channelId, latestPostTime)(dispatch, getState);
    };
}

export function loadFilesForPostIfNecessary(postId) {
    return async (dispatch, getState) => {
        const {files} = getState().entities;
        const fileIdsForPost = files.fileIdsByPostId[postId];

        if (!fileIdsForPost) {
            await getFilesForPost(postId)(dispatch, getState);
        }
    };
}

export function loadThreadIfNecessary(rootId, channelId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {posts, postsInChannel} = state.entities.posts;
        const channelPosts = postsInChannel[channelId];

        if (rootId && (!posts[rootId] || !channelPosts || !channelPosts[rootId])) {
            getPostThread(rootId, false)(dispatch, getState);
        }
    };
}

export function selectInitialChannel(teamId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {channels, currentChannelId, myMembers} = state.entities.channels;
        const {currentUserId} = state.entities.users;
        const currentChannel = channels[currentChannelId];
        const {myPreferences} = state.entities.preferences;

        const isDMVisible = currentChannel && currentChannel.type === General.DM_CHANNEL &&
            isDirectChannelVisible(currentUserId, myPreferences, currentChannel);

        const isGMVisible = currentChannel && currentChannel.type === General.GM_CHANNEL &&
            isGroupChannelVisible(myPreferences, currentChannel);

        if (currentChannel && myMembers[currentChannelId] &&
            (currentChannel.team_id === teamId || isDMVisible || isGMVisible)) {
            await handleSelectChannel(currentChannelId)(dispatch, getState);
            return;
        }

        const channel = Object.values(channels).find((c) => c.team_id === teamId && c.name === General.DEFAULT_CHANNEL);
        if (channel) {
            dispatch(setChannelDisplayName(''));
            await handleSelectChannel(channel.id)(dispatch, getState);
        } else {
            // Handle case when the default channel cannot be found
            // so we need to get the first available channel of the team
            const channelsInTeam = Object.values(channels).filter((c) => c.team_id === teamId);
            const firstChannel = channelsInTeam.length ? channelsInTeam[0].id : {id: ''};
            dispatch(setChannelDisplayName(''));
            await handleSelectChannel(firstChannel.id)(dispatch, getState);
        }
    };
}

export function handleSelectChannel(channelId) {
    return async (dispatch, getState) => {
        const {currentTeamId} = getState().entities.teams;

        dispatch({
            type: ViewTypes.SET_LAST_CHANNEL_FOR_TEAM,
            teamId: currentTeamId,
            channelId
        });
        getChannelStats(channelId)(dispatch, getState);
        selectChannel(channelId)(dispatch, getState);
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
        const {currentUserId} = state.entities.users;

        const dm = [{
            user_id: currentUserId,
            category: Preferences.CATEGORY_DIRECT_CHANNEL_SHOW,
            name: otherUserId,
            value: visible
        }];

        savePreferences(currentUserId, dm)(dispatch, getState);
    };
}

export function toggleGMChannel(channelId, visible) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentUserId} = state.entities.users;

        const gm = [{
            user_id: currentUserId,
            category: Preferences.CATEGORY_GROUP_CHANNEL_SHOW,
            name: channelId,
            value: visible
        }];

        savePreferences(currentUserId, gm)(dispatch, getState);
    };
}

export function closeDMChannel(channel) {
    return async (dispatch, getState) => {
        const state = getState();

        if (channel.isFavorite) {
            unfavoriteChannel(channel.id)(dispatch, getState);
        }

        toggleDMChannel(channel.teammate_id, 'false')(dispatch, getState);
        if (channel.isCurrent) {
            selectInitialChannel(state.entities.teams.currentTeamId)(dispatch, getState);
        }
    };
}

export function closeGMChannel(channel) {
    return async (dispatch, getState) => {
        const state = getState();

        if (channel.isFavorite) {
            unfavoriteChannel(channel.id)(dispatch, getState);
        }

        toggleGMChannel(channel.id, 'false')(dispatch, getState);
        if (channel.isCurrent) {
            selectInitialChannel(state.entities.teams.currentTeamId)(dispatch, getState);
        }
    };
}

export function refreshChannelWithRetry(channelId) {
    return (dispatch, getState) => {
        getPostsWithRetry(channelId)(dispatch, getState);
    };
}

export function leaveChannel(channel, reset = false) {
    return async (dispatch, getState) => {
        const {currentTeamId} = getState().entities.teams;
        await serviceLeaveChannel(channel.id)(dispatch, getState);
        if (channel.isCurrent || reset) {
            await selectInitialChannel(currentTeamId)(dispatch, getState);
        }
    };
}

export function setChannelLoading(loading = true) {
    return {
        type: ViewTypes.SET_CHANNEL_LOADER,
        loading
    };
}

export function setChannelRefreshing(loading = true) {
    return {
        type: ViewTypes.SET_CHANNEL_REFRESHING,
        loading
    };
}

export function setPostTooltipVisible(visible = true) {
    return {
        type: ViewTypes.POST_TOOLTIP_VISIBLE,
        visible
    };
}

export function setChannelDisplayName(displayName) {
    return {
        type: ViewTypes.SET_CHANNEL_DISPLAY_NAME,
        displayName
    };
}

// Returns true if there are more posts to load
export function increasePostVisibility(channelId, focusedPostId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {loadingPosts, postVisibility} = state.views.channel;
        const currentPostVisibility = postVisibility[channelId] || 0;

        if (loadingPosts[channelId]) {
            return true;
        }

        dispatch(batchActions([
            {
                type: ViewTypes.LOADING_POSTS,
                data: true,
                channelId
            }
        ]));

        const page = Math.floor(currentPostVisibility / ViewTypes.POST_VISIBILITY_CHUNK_SIZE);

        let posts;
        if (focusedPostId) {
            posts = await getPostsBefore(channelId, focusedPostId, page, ViewTypes.POST_VISIBILITY_CHUNK_SIZE)(dispatch, getState);
        } else {
            posts = await getPosts(channelId, page, ViewTypes.POST_VISIBILITY_CHUNK_SIZE)(dispatch, getState);
        }

        if (posts) {
            // make sure to increment the posts visibility
            // only if we got results
            dispatch({
                type: ViewTypes.INCREASE_POST_VISIBILITY,
                data: channelId,
                amount: ViewTypes.POST_VISIBILITY_CHUNK_SIZE
            });
        }

        dispatch({
            type: ViewTypes.LOADING_POSTS,
            data: false,
            channelId
        });

        return posts && posts.order.length >= ViewTypes.POST_VISIBILITY_CHUNK_SIZE;
    };
}
