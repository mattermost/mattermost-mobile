// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {ViewTypes} from 'app/constants';

import {UserTypes, ChannelTypes} from 'mattermost-redux/action_types';
import {
    fetchMyChannelsAndMembers,
    getChannelByNameAndTeamName,
    markChannelAsRead,
    markChannelAsViewed,
    leaveChannel as serviceLeaveChannel,
    selectChannel,
    getChannelStats,
} from 'mattermost-redux/actions/channels';
import {
    getPosts,
    getPostsBefore,
    getPostsSince,
    getPostThread,
} from 'mattermost-redux/actions/posts';
import {getFilesForPost} from 'mattermost-redux/actions/files';
import {savePreferences} from 'mattermost-redux/actions/preferences';
import {getTeamMembersByIds, selectTeam} from 'mattermost-redux/actions/teams';
import {getProfilesInChannel} from 'mattermost-redux/actions/users';
import {Client4} from 'mattermost-redux/client';
import {General, Preferences} from 'mattermost-redux/constants';
import {getPostIdsInChannel} from 'mattermost-redux/selectors/entities/posts';
import {
    getChannel,
    getCurrentChannelId,
    getMyChannelMember,
    getRedirectChannelNameForTeam,
    getChannelsNameMapInTeam,
    isManuallyUnread,
} from 'mattermost-redux/selectors/entities/channels';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getMyPreferences} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId, getUserIdsInChannels, getUsers} from 'mattermost-redux/selectors/entities/users';
import {getCurrentTeamId, getTeamByName} from 'mattermost-redux/selectors/entities/teams';

import {getChannelReachable} from 'app/selectors/channel';

import telemetry from 'app/telemetry';

import {
    getChannelByName,
    getDirectChannelName,
    getUserIdFromChannelName,
    isDirectChannel,
    isGroupChannel,
    getChannelByName as getChannelByNameSelector,
} from 'mattermost-redux/utils/channel_utils';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {getLastCreateAt} from 'mattermost-redux/utils/post_utils';
import {getPreferencesByCategory} from 'mattermost-redux/utils/preference_utils';

import {INSERT_TO_COMMENT, INSERT_TO_DRAFT} from 'app/constants/post_textbox';
import {isDirectChannelVisible, isGroupChannelVisible, isDirectMessageVisible, isGroupMessageVisible, isDirectChannelAutoClosed} from 'app/utils/channels';
import {buildPreference} from 'app/utils/preferences';

import {forceLogoutIfNecessary} from './user';

const MAX_RETRIES = 3;

export function loadChannelsIfNecessary(teamId) {
    return async (dispatch) => {
        await dispatch(fetchMyChannelsAndMembers(teamId));
    };
}

export function loadChannelsByTeamName(teamName, errorHandler) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentTeamId} = state.entities.teams;
        const team = getTeamByName(state, teamName);

        if (!team && errorHandler) {
            errorHandler();
        }

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
            if (isDirectChannel(channel) && !isDirectChannelVisible(currentUserId, myPreferences, channel) && member && member.mention_count > 0) {
                const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
                let pref = dmPrefs.get(teammateId);
                if (pref) {
                    pref = {...pref, value: 'true'};
                } else {
                    pref = buildPref(teammateId);
                }
                dmPrefs.set(teammateId, pref);
                prefs.push(pref);
            } else if (isGroupChannel(channel) && !isGroupChannelVisible(myPreferences, channel) && member && (member.mention_count > 0 || member.msg_count < channel.total_msg_count)) {
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

            if (received?.order) {
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
            const lastConnectAt = state.websocket?.lastConnectAt || 0;
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

            if (received?.order) {
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

export async function retryGetPostsAction(action, dispatch, getState, maxTries = MAX_RETRIES) {
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

        const channelsInTeam = getChannelsNameMapInTeam(state, teamId);
        const channel = getChannelByNameSelector(channelsInTeam, getRedirectChannelNameForTeam(state, teamId));
        let channelId;
        if (channel) {
            channelId = channel.id;
        } else {
            // Handle case when the default channel cannot be found
            // so we need to get the first available channel of the team
            const channels = Object.values(channelsInTeam);
            const firstChannel = channels.length ? channels[0].id : '';
            channelId = firstChannel;
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

        let previousChannelId;
        if (!fromPushNotification && !sameChannel) {
            previousChannelId = currentChannelId;
        }

        const actions = [
            selectChannel(channelId),
            getChannelStats(channelId),
            setChannelDisplayName(channel.display_name),
            setInitialPostVisibility(channelId),
            setChannelLoading(false),
            setLastChannelForTeam(currentTeamId, channelId),
            selectChannelWithMember(channelId, channel, member),
        ];

        dispatch(batchActions(actions));
        dispatch(markChannelViewedAndRead(channelId, previousChannelId));
    };
}

export function handleSelectChannelByName(channelName, teamName, errorHandler) {
    return async (dispatch, getState) => {
        const state = getState();
        const {teams: currentTeams, currentTeamId} = state.entities.teams;
        const currentTeam = currentTeams[currentTeamId];
        const currentTeamName = currentTeam?.name;
        const response = await dispatch(getChannelByNameAndTeamName(teamName || currentTeamName, channelName));
        const {error, data: channel} = response;
        const currentChannelId = getCurrentChannelId(state);
        const reachable = getChannelReachable(state, channelName, teamName);

        if (!reachable && errorHandler) {
            errorHandler();
        }

        // Fallback to API response error, if any.
        if (error) {
            return {error};
        }

        if (teamName && teamName !== currentTeamName) {
            const team = getTeamByName(state, teamName);
            dispatch(selectTeam(team));
        }

        if (channel && currentChannelId !== channel.id) {
            dispatch(handleSelectChannel(channel.id));
        }

        return null;
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

export function markChannelViewedAndReadOnReconnect(channelId) {
    return (dispatch, getState) => {
        if (isManuallyUnread(getState(), channelId)) {
            return;
        }

        dispatch(markChannelAsRead(channelId));
        dispatch(markChannelAsViewed(channelId));
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
        if (result?.order) {
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

export function increasePostVisibilityByOne(channelId) {
    return (dispatch) => {
        dispatch({
            type: ViewTypes.INCREASE_POST_VISIBILITY,
            data: channelId,
            amount: 1,
        });
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

function setInitialPostVisibility(channelId) {
    return {
        type: ViewTypes.SET_INITIAL_POST_VISIBILITY,
        data: channelId,
    };
}

function setLastChannelForTeam(teamId, channelId) {
    return {
        type: ViewTypes.SET_LAST_CHANNEL_FOR_TEAM,
        teamId,
        channelId,
    };
}

function selectChannelWithMember(channelId, channel, member) {
    return {
        type: ViewTypes.SELECT_CHANNEL_WITH_MEMBER,
        data: channelId,
        channel,
        member,
    };
}

export function loadChannelsForTeam(teamId) {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);

        if (currentUserId) {
            const data = {sync: true, teamId};
            for (let i = 0; i < MAX_RETRIES; i++) {
                try {
                    console.log('Fetching channels attempt', (i + 1)); //eslint-disable-line no-console
                    const [channels, channelMembers] = await Promise.all([ //eslint-disable-line no-await-in-loop
                        Client4.getMyChannels(teamId),
                        Client4.getMyChannelMembers(teamId),
                    ]);

                    data.channels = channels;
                    data.channelMembers = channelMembers;
                    break;
                } catch (error) {
                    const result = await dispatch(forceLogoutIfNecessary(error)); //eslint-disable-line no-await-in-loop
                    if (result || i === MAX_RETRIES) {
                        return {error};
                    }
                }
            }

            // Load Roles

            // Fetch needed profiles from channel creators and direct channels
            dispatch(loadSidebarDirectMessagesProfiles(data));

            dispatch({
                type: ChannelTypes.RECEIVED_MY_CHANNELS_WITH_MEMBERS,
                data,
            });

            return {data};
        }

        return {error: 'Cannot fetch channels without a current user'};
    };
}

export function loadSidebarDirectMessagesProfiles(data) {
    return async (dispatch, getState) => {
        const state = getState();
        const {channels, channelMembers} = data;
        const config = getConfig(state);
        const currentChannelId = getCurrentChannelId(state);
        const currentUserId = getCurrentUserId(state);
        const preferences = getMyPreferences(state);
        const usersInChannel = getUserIdsInChannels(state);
        const users = getUsers(state);
        const directChannels = Object.values(channels).filter((c) => c.type === General.DM_CHANNEL || c.type === General.GM_CHANNEL);
        const prefs = [];
        let promises = []; //only fetch profiles that we don't have and the Direct channel should be visible

        // Prepare preferences and start fetching profiles to batch them
        directChannels.forEach((c) => {
            const members = Array.from(usersInChannel[c.id] || []).filter((u) => u.id !== currentUserId);
            switch (c.type) {
            case General.DM_CHANNEL: {
                const otherUserId = getUserIdFromChannelName(currentUserId, c.name);
                const otherUser = users[otherUserId];
                const dmVisible = isDirectMessageVisible(preferences, c.id);
                const dmAutoClosed = isDirectChannelAutoClosed(config, preferences, c.id, c.last_post_at, otherUser?.delete_at, currentChannelId); //eslint-disable-line camelcase
                const dmIsUnread = channelMembers[c.id]?.mention_count > 0; //eslint-disable-line camelcase
                const dmFetchProfile = dmIsUnread || (dmVisible && !dmAutoClosed);

                // when then DM is hidden but has new messages
                if ((!dmVisible || dmAutoClosed) && dmIsUnread) {
                    prefs.push(buildPreference(Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, currentUserId, otherUserId));
                    prefs.push(buildPreference(Preferences.CATEGORY_CHANNEL_OPEN_TIME, currentUserId, c.id, Date.now().toString()));
                }

                if (dmFetchProfile && !members.includes(otherUserId) && otherUserId !== currentUserId) {
                    promises.push(dispatch(getUsersInChannel(c.id)));
                }
                break;
            }
            case General.GM_CHANNEL: {
                const gmVisible = isGroupMessageVisible(preferences, c.id);
                const gmAutoClosed = isDirectChannelAutoClosed(config, preferences, c.id, c.last_post_at);
                const channelMember = channelMembers[c.id];
                const gmIsUnread = channelMember?.mention_count > 0 || channelMember?.msg_count < c.total_msg_count; //eslint-disable-line camelcase
                const gmFetchProfile = gmIsUnread || (gmVisible && !gmAutoClosed);

                // when then GM is hidden but has new messages
                if ((!gmVisible || gmAutoClosed) && gmIsUnread) {
                    prefs.push(buildPreference(Preferences.CATEGORY_GROUP_CHANNEL_SHOW, currentUserId, c.id));
                    prefs.push(buildPreference(Preferences.CATEGORY_CHANNEL_OPEN_TIME, currentUserId, c.id, Date.now().toString()));
                }

                if (gmFetchProfile && !members.length) {
                    promises.push(dispatch(getUsersInChannel(c.id)));
                }
                break;
            }
            }
        });

        // Save preferences if there are any changes
        if (prefs.length) {
            dispatch(savePreferences(currentUserId, prefs));
        }

        // Get the profiles returned by the promises and retry those that failed
        for (let i = 0; i < MAX_RETRIES; i++) {
            if (!promises.length) {
                break;
            }

            const result = await Promise.all(promises); //eslint-disable-line no-await-in-loop
            const failed = [];

            result.forEach((p, index) => {
                if (p.error) {
                    failed.push(directChannels[index].id);
                }
            });

            dispatch({
                type: UserTypes.RECEIVED_BATCHED_PROFILES_IN_CHANNEL,
                data: result,
            });

            if (failed.length) {
                promises = failed.map((id) => dispatch(getUsersInChannel(id))); //eslint-disable-line no-loop-func
                continue;
            }

            break;
        }
    };
}

export function getUsersInChannel(channelId) {
    return async (dispatch, getState) => {
        try {
            const state = getState();
            const currentUserId = getCurrentUserId(state);
            const profiles = await Client4.getProfilesInChannel(channelId);

            // When fetching profiles in channels we exclude our own user
            const users = profiles.filter((p) => p.id !== currentUserId);
            const data = {
                channelId,
                users,
            };

            return {data};
        } catch (error) {
            return {error};
        }
    };
}