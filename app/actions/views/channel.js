// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {ViewTypes} from 'app/constants';

import {ChannelTypes, RoleTypes, UserTypes} from 'mattermost-redux/action_types';
import {
    fetchMyChannelsAndMembers,
    getChannelByNameAndTeamName,
    leaveChannel as serviceLeaveChannel,
} from 'mattermost-redux/actions/channels';
import {getFilesForPost} from 'mattermost-redux/actions/files';
import {savePreferences} from 'mattermost-redux/actions/preferences';
import {getTeamMembersByIds, selectTeam} from 'mattermost-redux/actions/teams';
import {getProfilesInChannel} from 'mattermost-redux/actions/users';
import {Client4} from 'mattermost-redux/client';
import {General, Preferences} from 'mattermost-redux/constants';
import {getPostIdsInChannel} from 'mattermost-redux/selectors/entities/posts';
import {
    getCurrentChannelId,
    getRedirectChannelNameForTeam,
    getChannelsNameMapInTeam,
    isManuallyUnread,
} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getTeamByName} from 'mattermost-redux/selectors/entities/teams';

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

import {loadSidebarDirectMessagesProfiles} from '@actions/helpers/channels';
import {getPosts, getPostsBefore, getPostsSince, getPostThread} from '@actions/views/post';
import {INSERT_TO_COMMENT, INSERT_TO_DRAFT} from '@constants/post_textbox';
import {getChannelReachable} from '@selectors/channel';
import telemetry from '@telemetry';
import {isDirectChannelVisible, isGroupChannelVisible} from '@utils/channels';

const MAX_RETRIES = 3;

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
            dispatch(batchActions(actions));
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
        let postAction;
        if (!postsIds || postsIds.length < ViewTypes.POST_VISIBILITY_CHUNK_SIZE) {
            // Get the first page of posts if it appears we haven't gotten it yet, like the webapp
            postAction = getPosts(channelId);
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

            postAction = getPostsSince(channelId, since);
        }

        const received = await retryGetPostsAction(postAction, dispatch, getState);

        if (received) {
            actions.push({
                type: ViewTypes.RECEIVED_POSTS_FOR_CHANNEL_AT_TIME,
                channelId,
                time,
            },
            setChannelRetryFailed(false));

            if (received?.order) {
                const count = received.order.length;
                loadMorePostsVisible = count >= ViewTypes.POST_VISIBILITY_CHUNK_SIZE;
            }
        }

        actions.push(setLoadMorePostsVisible(loadMorePostsVisible));
        dispatch(batchActions(actions));
    };
}

export async function retryGetPostsAction(action, dispatch, getState, maxTries = MAX_RETRIES) {
    for (let i = 0; i <= maxTries; i++) {
        const {data} = await dispatch(action); // eslint-disable-line no-await-in-loop

        if (data) {
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

export function handleSelectChannel(channelId) {
    return async (dispatch, getState) => {
        const dt = Date.now();
        const state = getState();
        const {channels, currentChannelId, myMembers} = state.entities.channels;
        const {currentTeamId} = state.entities.teams;
        const channel = channels[channelId];
        const member = myMembers[channelId];

        dispatch(loadPostsIfNecessaryWithRetry(channelId));

        if (channel && currentChannelId !== channelId) {
            const actions = markAsViewedAndReadBatch(state, channelId, currentChannelId);
            actions.push({
                type: ChannelTypes.SELECT_CHANNEL,
                data: channelId,
                extra: {
                    channel,
                    member,
                    teamId: channel.team_id || currentTeamId,
                },
            });
            dispatch(batchActions(actions));
        }

        console.log('channel switch to', channel?.display_name, channelId, (Date.now() - dt), 'ms'); //eslint-disable-line
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
    return (dispatch, getState) => {
        const state = getState();

        if (state.views.channel.drafts[channelId]?.draft !== draft) {
            dispatch({
                type: ViewTypes.POST_DRAFT_CHANGED,
                channelId,
                draft,
            });
        }
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
    return (dispatch, getState) => {
        const state = getState();
        const actions = markAsViewedAndReadBatch(state, channelId, previousChannelId, markOnServer);

        dispatch(batchActions(actions));
    };
}

export function markAsViewedAndReadBatch(state, channelId, prevChannelId = '', markOnServer = true) {
    const actions = [];
    const {channels, myMembers} = state.entities.channels;
    const channel = channels[channelId];
    const member = myMembers[channelId];
    const prevMember = myMembers[prevChannelId];
    const prevChanManuallyUnread = isManuallyUnread(state, prevChannelId);
    const prevChannel = (!prevChanManuallyUnread && prevChannelId) ? channels[prevChannelId] : null; // May be null since prevChannelId is optional

    if (markOnServer) {
        Client4.viewMyChannel(channelId, prevChanManuallyUnread ? '' : prevChannelId);
    }

    if (member) {
        actions.push({
            type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER,
            data: {...member, last_viewed_at: Date.now()},
        });

        if (isManuallyUnread(state, channelId)) {
            actions.push({
                type: ChannelTypes.REMOVE_MANUALLY_UNREAD,
                data: {channelId},
            });
        }

        if (channel) {
            actions.push({
                type: ChannelTypes.DECREMENT_UNREAD_MSG_COUNT,
                data: {
                    teamId: channel.team_id,
                    channelId,
                    amount: channel.total_msg_count - member.msg_count,
                },
            }, {
                type: ChannelTypes.DECREMENT_UNREAD_MENTION_COUNT,
                data: {
                    teamId: channel.team_id,
                    channelId,
                    amount: member.mention_count,
                },
            });
        }
    }

    if (prevMember) {
        if (!prevChanManuallyUnread) {
            actions.push({
                type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER,
                data: {...prevMember, last_viewed_at: Date.now()},
            });
        }

        if (prevChannel) {
            actions.push({
                type: ChannelTypes.DECREMENT_UNREAD_MSG_COUNT,
                data: {
                    teamId: prevChannel.team_id,
                    channelId: prevChannelId,
                    amount: prevChannel.total_msg_count - prevMember.msg_count,
                },
            }, {
                type: ChannelTypes.DECREMENT_UNREAD_MENTION_COUNT,
                data: {
                    teamId: prevChannel.team_id,
                    channelId: prevChannelId,
                    amount: prevMember.mention_count,
                },
            });
        }
    }

    return actions;
}

export function markChannelViewedAndReadOnReconnect(channelId) {
    return (dispatch, getState) => {
        if (isManuallyUnread(getState(), channelId)) {
            return;
        }

        dispatch(markChannelViewedAndRead(channelId));
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
        const actions = [setChannelRefreshing(false)];

        if (posts) {
            actions.push(setChannelRetryFailed(false));
        }

        dispatch(batchActions(actions));
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
        const {loadingPosts} = state.views.channel;

        if (loadingPosts[channelId]) {
            return true;
        }

        if (!postId) {
            // No posts are visible, so the channel is empty
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

        if (result) {
            actions.push(setChannelRetryFailed(false));
        }

        let hasMorePost = false;
        if (result?.order) {
            const count = result.order.length;
            hasMorePost = count >= pageSize;

            actions.push(setLoadMorePostsVisible(hasMorePost));
        }

        dispatch(batchActions(actions));
        telemetry.end(['posts:loading']);
        telemetry.save();

        return hasMorePost;
    };
}

function setLoadMorePostsVisible(visible) {
    return {
        type: ViewTypes.SET_LOAD_MORE_POSTS_VISIBLE,
        data: visible,
    };
}

export function loadChannelsForTeam(teamId, skipDispatch = false) {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const data = {sync: true, teamId};
        const actions = [];

        if (currentUserId) {
            for (let i = 0; i <= MAX_RETRIES; i++) {
                try {
                    console.log('Fetching channels attempt', teamId, (i + 1)); //eslint-disable-line no-console
                    const [channels, channelMembers] = await Promise.all([ //eslint-disable-line no-await-in-loop
                        Client4.getMyChannels(teamId, true),
                        Client4.getMyChannelMembers(teamId),
                    ]);

                    data.channels = channels;
                    data.channelMembers = channelMembers;
                    break;
                } catch (err) {
                    if (i === MAX_RETRIES) {
                        const hasChannelsLoaded = state.entities.channels.channelsInTeam[teamId]?.size > 0;
                        return {error: hasChannelsLoaded ? null : err};
                    }
                }
            }

            if (data.channels) {
                actions.push({
                    type: ChannelTypes.RECEIVED_MY_CHANNELS_WITH_MEMBERS,
                    data,
                });

                if (!skipDispatch) {
                    const rolesToLoad = new Set();
                    const members = data.channelMembers;
                    for (const member of members) {
                        for (const role of member.roles.split(' ')) {
                            rolesToLoad.add(role);
                        }
                    }

                    if (rolesToLoad.size > 0) {
                        data.roles = await Client4.getRolesByNames(Array.from(rolesToLoad));
                        if (data.roles.length) {
                            actions.push({
                                type: RoleTypes.RECEIVED_ROLES,
                                data: data.roles,
                            });
                        }
                    }

                    dispatch(batchActions(actions));
                }

                // Fetch needed profiles from channel creators and direct channels
                dispatch(loadSidebar(data));
            }
        }

        return {data};
    };
}

function loadSidebar(data) {
    return async (dispatch, getState) => {
        const state = getState();
        const {channels, channelMembers} = data;

        const sidebarActions = await loadSidebarDirectMessagesProfiles(state, channels, channelMembers);
        if (sidebarActions.length) {
            dispatch(batchActions(sidebarActions));
        }
    };
}