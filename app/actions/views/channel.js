// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {ViewTypes} from 'app/constants';

import {UserTypes} from 'mattermost-redux/action_types';
import {
    fetchMyChannelsAndMembers,
    getChannelByNameAndTeamName,
    markChannelAsRead,
    leaveChannel as serviceLeaveChannel, markChannelAsViewed,
    selectChannel,
} from 'mattermost-redux/actions/channels';
import {
    getPosts,
    getPostsBefore,
    getPostsSince,
    getPostThread,
} from 'mattermost-redux/actions/posts';
import {getFilesForPost} from 'mattermost-redux/actions/files';
import {savePreferences} from 'mattermost-redux/actions/preferences';
import {getTeamMembersByIds} from 'mattermost-redux/actions/teams';
import {getProfilesInChannel} from 'mattermost-redux/actions/users';
import {General, Preferences} from 'mattermost-redux/constants';
import {getPostIdsInChannel} from 'mattermost-redux/selectors/entities/posts';
import {
    getChannel,
    getCurrentChannelId,
    getMyChannelMember,
    getRedirectChannelNameForTeam,
    getChannelByName as getChannelByNameSelector,
} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId, getTeamByName} from 'mattermost-redux/selectors/entities/teams';

import telemetry from 'app/telemetry';

import {
    getChannelByName,
    getDirectChannelName,
    getUserIdFromChannelName,
    isDirectChannel,
    isGroupChannel,
} from 'mattermost-redux/utils/channel_utils';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {getLastCreateAt} from 'mattermost-redux/utils/post_utils';
import {getPreferencesByCategory} from 'mattermost-redux/utils/preference_utils';

import {INSERT_TO_COMMENT, INSERT_TO_DRAFT} from 'app/constants/post_textbox';
import {isDirectChannelVisible, isGroupChannelVisible} from 'app/utils/channels';

const MAX_POST_TRIES = 3;

export function loadChannelsIfNecessary(teamId) {
    return async (dispatch, getState) => {
        await fetchMyChannelsAndMembers(teamId)(dispatch, getState);
    };
}

export function loadChannelsByTeamName(teamName) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentTeamId} = state.entities.teams;
        const team = getTeamByName(state, teamName);

        if (team && team.id !== currentTeamId) {
            await dispatch(fetchMyChannelsAndMembers(team.id));
        }
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
                value: 'true',
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
                    data: {id: channel.id, user_id: members[i]},
                });
            }
        }

        if (actions.length) {
            dispatch(batchActions(actions), getState);
        }
    };
}

export function loadPostsIfNecessaryWithRetry(channelId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {posts} = state.entities.posts;
        const postsIds = getPostIdsInChannel(state, channelId);
        const actions = [];

        const time = Date.now();

        let loadMorePostsVisible = true;
        let received;
        if (!postsIds || postsIds.length < ViewTypes.POST_VISIBILITY_CHUNK_SIZE) {
            // Get the first page of posts if it appears we haven't gotten it yet, like the webapp
            received = await retryGetPostsAction(getPosts(channelId), dispatch, getState);

            if (received) {
                const count = received.order.length;
                loadMorePostsVisible = count >= ViewTypes.POST_VISIBILITY_CHUNK_SIZE;
                actions.push({
                    type: ViewTypes.SET_INITIAL_POST_COUNT,
                    data: {
                        channelId,
                        count,
                    },
                });
            }
        } else {
            const {lastConnectAt} = state.device.websocket;
            const lastGetPosts = state.views.channel.lastGetPosts[channelId];

            let since;
            if (lastGetPosts && lastGetPosts < lastConnectAt) {
                // Since the websocket disconnected, we may have missed some posts since then
                since = lastGetPosts;
            } else {
                // Trust that we've received all posts since the last time the websocket disconnected
                // so just get any that have changed since the latest one we've received
                const postsForChannel = postsIds.map((id) => posts[id]);
                since = getLastCreateAt(postsForChannel);
            }

            received = await retryGetPostsAction(getPostsSince(channelId, since), dispatch, getState);

            if (received) {
                const count = received.order.length;
                loadMorePostsVisible = postsIds.length + count >= ViewTypes.POST_VISIBILITY_CHUNK_SIZE;
                actions.push({
                    type: ViewTypes.SET_INITIAL_POST_COUNT,
                    data: {
                        channelId,
                        count: postsIds.length + count,
                    },
                });
            }
        }

        if (received) {
            actions.push({
                type: ViewTypes.RECEIVED_POSTS_FOR_CHANNEL_AT_TIME,
                channelId,
                time,
            });
        }

        actions.push(setLoadMorePostsVisible(loadMorePostsVisible));
        dispatch(batchActions(actions));
    };
}

export async function retryGetPostsAction(action, dispatch, getState, maxTries = MAX_POST_TRIES) {
    for (let i = 0; i < maxTries; i++) {
        const {data} = await dispatch(action); // eslint-disable-line no-await-in-loop

        if (data) {
            dispatch(setChannelRetryFailed(false));
            return data;
        }
    }

    dispatch(setChannelRetryFailed(true));
    return null;
}

export function loadFilesForPostIfNecessary(postId) {
    return async (dispatch, getState) => {
        const {files} = getState().entities;
        const fileIdsForPost = files.fileIdsByPostId[postId];

        if (!fileIdsForPost?.length) {
            await dispatch(getFilesForPost(postId));
        }
    };
}

export function loadThreadIfNecessary(rootId) {
    return (dispatch, getState) => {
        const state = getState();
        const {posts, postsInThread} = state.entities.posts;
        const threadPosts = postsInThread[rootId];

        if (!posts[rootId] || !threadPosts) {
            dispatch(getPostThread(rootId));
        }
    };
}

export function selectInitialChannel(teamId) {
    return (dispatch, getState) => {
        const state = getState();
        const {channels, myMembers} = state.entities.channels;
        const {currentUserId} = state.entities.users;
        const {myPreferences} = state.entities.preferences;
        const lastChannelForTeam = state.views.team.lastChannelForTeam[teamId];
        const lastChannelId = lastChannelForTeam && lastChannelForTeam.length ? lastChannelForTeam[0] : '';
        const lastChannel = channels[lastChannelId];

        const isDMVisible = lastChannel && lastChannel.type === General.DM_CHANNEL &&
            isDirectChannelVisible(currentUserId, myPreferences, lastChannel);

        const isGMVisible = lastChannel && lastChannel.type === General.GM_CHANNEL &&
            isGroupChannelVisible(myPreferences, lastChannel);

        if (
            myMembers[lastChannelId] &&
            lastChannel &&
            (lastChannel.team_id === teamId || isDMVisible || isGMVisible)
        ) {
            dispatch(handleSelectChannel(lastChannelId));
            return;
        }

        dispatch(selectDefaultChannel(teamId));
    };
}

export function selectPenultimateChannel(teamId) {
    return (dispatch, getState) => {
        const state = getState();
        const {channels, myMembers} = state.entities.channels;
        const {currentUserId} = state.entities.users;
        const {myPreferences} = state.entities.preferences;
        const lastChannelForTeam = state.views.team.lastChannelForTeam[teamId];
        const lastChannelId = lastChannelForTeam && lastChannelForTeam.length > 1 ? lastChannelForTeam[1] : '';
        const lastChannel = channels[lastChannelId];

        const isDMVisible = lastChannel && lastChannel.type === General.DM_CHANNEL &&
            isDirectChannelVisible(currentUserId, myPreferences, lastChannel);

        const isGMVisible = lastChannel && lastChannel.type === General.GM_CHANNEL &&
            isGroupChannelVisible(myPreferences, lastChannel);

        if (
            myMembers[lastChannelId] &&
            lastChannel &&
            lastChannel.delete_at === 0 &&
            (lastChannel.team_id === teamId || isDMVisible || isGMVisible)
        ) {
            dispatch(setChannelLoading(true));
            dispatch(handleSelectChannel(lastChannelId));
            return;
        }

        dispatch(selectDefaultChannel(teamId));
    };
}

export function selectDefaultChannel(teamId) {
    return (dispatch, getState) => {
        const state = getState();

        const channel = getChannelByNameSelector(state, getRedirectChannelNameForTeam(state, teamId));
        let channelId;
        if (channel) {
            channelId = channel.id;
        } else {
            // Handle case when the default channel cannot be found
            // so we need to get the first available channel of the team
            const channelsInTeam = Object.values(state.entities.channels).filter((c) => c.team_id === teamId);
            const firstChannel = channelsInTeam.length ? channelsInTeam[0].id : {id: ''};

            channelId = firstChannel.id;
        }

        if (channelId) {
            dispatch(handleSelectChannel(channelId));
        }
    };
}

export function handleSelectChannel(channelId, fromPushNotification = false) {
    return async (dispatch, getState) => {
        const state = getState();
        const channel = getChannel(state, channelId);
        const currentTeamId = getCurrentTeamId(state);
        const currentChannelId = getCurrentChannelId(state);
        const sameChannel = channelId === currentChannelId;
        const member = getMyChannelMember(state, channelId);

        dispatch(setLoadMorePostsVisible(true));

        // If the app is open from push notification, we already fetched the posts.
        if (!fromPushNotification) {
            dispatch(loadPostsIfNecessaryWithRetry(channelId));
        }

        dispatch(batchActions([
            selectChannel(channelId),
            setChannelDisplayName(channel.display_name),
            {
                type: ViewTypes.SET_INITIAL_POST_VISIBILITY,
                data: channelId,
            },
            setChannelLoading(false),
            {
                type: ViewTypes.SET_LAST_CHANNEL_FOR_TEAM,
                teamId: currentTeamId,
                channelId,
            },
            {
                type: ViewTypes.SELECT_CHANNEL_WITH_MEMBER,
                data: channelId,
                member,
            },
        ]));

        let markPreviousChannelId;
        if (!fromPushNotification && !sameChannel) {
            markPreviousChannelId = currentChannelId;
        }

        dispatch(markChannelViewedAndRead(channelId, markPreviousChannelId));
    };
}

export function handleSelectChannelByName(channelName, teamName) {
    return async (dispatch, getState) => {
        const state = getState();
        const {teams: currentTeams, currentTeamId} = state.entities.teams;
        const currentTeamName = currentTeams[currentTeamId]?.name;
        const {data: channel} = await dispatch(getChannelByNameAndTeamName(teamName || currentTeamName, channelName));
        const currentChannelId = getCurrentChannelId(state);
        if (channel && currentChannelId !== channel.id) {
            dispatch(handleSelectChannel(channel.id));
        }
    };
}

export function handlePostDraftChanged(channelId, draft) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.POST_DRAFT_CHANGED,
            channelId,
            draft,
        }, getState);
    };
}

export function insertToDraft(value) {
    return (dispatch, getState) => {
        const state = getState();
        const threadId = state.entities.posts.selectedPostId;

        const insertEvent = threadId ? INSERT_TO_COMMENT : INSERT_TO_DRAFT;

        EventEmitter.emit(insertEvent, value);
    };
}

export function markChannelViewedAndRead(channelId, previousChannelId, markOnServer = true) {
    return (dispatch) => {
        dispatch(markChannelAsRead(channelId, previousChannelId, markOnServer));
        dispatch(markChannelAsViewed(channelId, previousChannelId));
    };
}

export function toggleDMChannel(otherUserId, visible, channelId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentUserId} = state.entities.users;

        const dm = [{
            user_id: currentUserId,
            category: Preferences.CATEGORY_DIRECT_CHANNEL_SHOW,
            name: otherUserId,
            value: visible,
        }, {
            user_id: currentUserId,
            category: Preferences.CATEGORY_CHANNEL_OPEN_TIME,
            name: channelId,
            value: Date.now().toString(),
        }];

        dispatch(savePreferences(currentUserId, dm));
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
            value: visible,
        }];

        dispatch(savePreferences(currentUserId, gm));
    };
}

export function closeDMChannel(channel) {
    return async (dispatch, getState) => {
        const state = getState();
        const currentChannelId = getCurrentChannelId(state);

        dispatch(toggleDMChannel(channel.teammate_id, 'false'));
        if (channel.id === currentChannelId) {
            dispatch(selectInitialChannel(state.entities.teams.currentTeamId));
        }
    };
}

export function closeGMChannel(channel) {
    return async (dispatch, getState) => {
        const state = getState();
        const currentChannelId = getCurrentChannelId(state);

        toggleGMChannel(channel.id, 'false')(dispatch, getState);
        if (channel.id === currentChannelId) {
            selectInitialChannel(state.entities.teams.currentTeamId)(dispatch, getState);
        }
    };
}

export function refreshChannelWithRetry(channelId) {
    return async (dispatch, getState) => {
        dispatch(setChannelRefreshing(true));
        const posts = await retryGetPostsAction(getPosts(channelId), dispatch, getState);
        dispatch(setChannelRefreshing(false));
        return posts;
    };
}

export function leaveChannel(channel, reset = false) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentChannelId} = state.entities.channels;
        const {currentTeamId} = state.entities.teams;

        dispatch({
            type: ViewTypes.REMOVE_LAST_CHANNEL_FOR_TEAM,
            data: {
                teamId: currentTeamId,
                channelId: channel.id,
            },
        });

        if (channel.id === currentChannelId || reset) {
            await dispatch(selectDefaultChannel(currentTeamId));
        }

        await dispatch(serviceLeaveChannel(channel.id));
    };
}

export function setChannelLoading(loading = true) {
    if (loading) {
        telemetry.start(['channel:loading']);
    } else {
        telemetry.end(['channel:loading']);
    }

    return {
        type: ViewTypes.SET_CHANNEL_LOADER,
        loading,
    };
}

export function setChannelRefreshing(loading = true) {
    return {
        type: ViewTypes.SET_CHANNEL_REFRESHING,
        loading,
    };
}

export function setChannelRetryFailed(failed = true) {
    return {
        type: ViewTypes.SET_CHANNEL_RETRY_FAILED,
        failed,
    };
}

export function setChannelDisplayName(displayName) {
    return {
        type: ViewTypes.SET_CHANNEL_DISPLAY_NAME,
        displayName,
    };
}

// Returns true if there are more posts to load
export function increasePostVisibility(channelId, postId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {loadingPosts, postVisibility} = state.views.channel;
        const currentPostVisibility = postVisibility[channelId] || 0;

        if (loadingPosts[channelId]) {
            return true;
        }

        if (!postId) {
            // No posts are visible, so the channel is empty
            return true;
        }

        // Check if we already have the posts that we want to show
        const loadedPostCount = state.views.channel.postCountInChannel[channelId] || 0;
        const desiredPostVisibility = currentPostVisibility + ViewTypes.POST_VISIBILITY_CHUNK_SIZE;

        if (loadedPostCount >= desiredPostVisibility) {
            // We already have the posts, so we just need to show them
            dispatch(batchActions([
                doIncreasePostVisibility(channelId),
                setLoadMorePostsVisible(true),
            ]));

            return true;
        }

        telemetry.reset();
        telemetry.start(['posts:loading']);

        dispatch({
            type: ViewTypes.LOADING_POSTS,
            data: true,
            channelId,
        });

        const pageSize = ViewTypes.POST_VISIBILITY_CHUNK_SIZE;

        const result = await retryGetPostsAction(getPostsBefore(channelId, postId, 0, pageSize), dispatch, getState);

        const actions = [{
            type: ViewTypes.LOADING_POSTS,
            data: false,
            channelId,
        }];

        let hasMorePost = false;
        if (result) {
            const count = result.order.length;
            hasMorePost = count >= pageSize;

            actions.push({
                type: ViewTypes.INCREASE_POST_COUNT,
                data: {
                    channelId,
                    count,
                },
            });

            // make sure to increment the posts visibility
            // only if we got results
            actions.push(doIncreasePostVisibility(channelId));

            actions.push(setLoadMorePostsVisible(hasMorePost));
        }

        dispatch(batchActions(actions));
        telemetry.end(['posts:loading']);
        telemetry.save();

        return hasMorePost;
    };
}

function doIncreasePostVisibility(channelId) {
    return {
        type: ViewTypes.INCREASE_POST_VISIBILITY,
        data: channelId,
        amount: ViewTypes.POST_VISIBILITY_CHUNK_SIZE,
    };
}

function setLoadMorePostsVisible(visible) {
    return {
        type: ViewTypes.SET_LOAD_MORE_POSTS_VISIBLE,
        data: visible,
    };
}
