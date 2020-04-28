// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {ViewTypes, NavigationTypes} from 'app/constants';

import {TeamTypes, ChannelTypes, RoleTypes} from '@mm-redux/action_types';
import {
    fetchMyChannelsAndMembers,
    getChannelByNameAndTeamName,
    leaveChannel as serviceLeaveChannel,
} from '@mm-redux/actions/channels';
import {getFilesForPost} from '@mm-redux/actions/files';
import {savePreferences} from '@mm-redux/actions/preferences';
import {selectTeam} from '@mm-redux/actions/teams';
import {Client4} from '@mm-redux/client';
import {General, Preferences} from '@mm-redux/constants';
import {getPostIdsInChannel} from '@mm-redux/selectors/entities/posts';
import {
    getCurrentChannelId,
    getRedirectChannelNameForTeam,
    getChannelsNameMapInTeam,
    getDefaultChannelForTeams,
    getMyFirstChannelForTeams,
    isManuallyUnread,
} from '@mm-redux/selectors/entities/channels';
import {getCurrentUser, getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getTeamByName} from '@mm-redux/selectors/entities/teams';

import {getChannelByName as selectChannelByName} from '@mm-redux/utils/channel_utils';
import EventEmitter from '@mm-redux/utils/event_emitter';

import {loadSidebarDirectMessagesProfiles} from '@actions/helpers/channels';
import {getPosts, getPostsBefore, getPostsSince, getPostThread, loadUnreadChannelPosts} from '@actions/views/post';
import {INSERT_TO_COMMENT, INSERT_TO_DRAFT} from '@constants/post_textbox';
import {getChannelReachable} from '@selectors/channel';
import telemetry from '@telemetry';
import {isDirectChannelVisible, isGroupChannelVisible, getChannelSinceValue} from '@utils/channels';
import {isPendingPost} from '@utils/general';
import {isGuest} from '@utils/users';

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

export function loadPostsIfNecessaryWithRetry(channelId) {
    return async (dispatch, getState) => {
        const state = getState();
        const postIds = getPostIdsInChannel(state, channelId);
        const actions = [];

        const time = Date.now();

        let loadMorePostsVisible = true;
        let postAction;
        if (!postIds || postIds.length < ViewTypes.POST_VISIBILITY_CHUNK_SIZE) {
            // Get the first page of posts if it appears we haven't gotten it yet, like the webapp
            postAction = getPosts(channelId);
        } else {
            const since = getChannelSinceValue(state, channelId, postIds);
            postAction = getPostsSince(channelId, since);
        }

        const received = await dispatch(fetchPostActionWithRetry(postAction));

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
        dispatch(batchActions(actions, 'BATCH_LOAD_POSTS_IN_CHANNEL'));
    };
}

export function fetchPostActionWithRetry(action, maxTries = MAX_RETRIES) {
    return async (dispatch) => {
        for (let i = 0; i <= maxTries; i++) {
            const {data} = await dispatch(action); // eslint-disable-line no-await-in-loop

            if (data) {
                return data;
            }
        }

        dispatch(setChannelRetryFailed(true));

        return null;
    };
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
        const channel = selectChannelByName(channelsInTeam, getRedirectChannelNameForTeam(state, teamId));
        let channelId;
        if (channel) {
            dispatch(handleSelectChannel(channel.id));
            return;
        }

        // Handle case when the default channel cannot be found
        // so we need to get the first available channel of the team
        const channels = Object.values(channelsInTeam);
        const firstChannel = channels.length ? channels[0].id : '';
        channelId = firstChannel;

        if (channelId) {
            dispatch(handleSelectChannel(channelId));
            return;
        }

        // Handle case when no channel found in the current team
        // so we need to get the first available default channel of all teams
        const teamsDefaultChannels = getDefaultChannelForTeams(state);
        for (const ch in Object.values(teamsDefaultChannels)) {
            if (ch) {
                channelId = ch.id;
                break;
            }
        }

        if (channelId) {
            dispatch(handleSelectChannel(channelId));
            return;
        }

        // Handle case when no default channel found in any team
        // so we need to get the first available channel of all teams
        const teamsMyFirstChannels = getMyFirstChannelForTeams(state);
        for (const ch in Object.values(teamsMyFirstChannels)) {
            if (ch) {
                channelId = ch.id;
                break;
            }
        }

        if (channelId) {
            dispatch(handleSelectChannel(channelId));
            return;
        }

        // If there is no possible channel to redirect, redirect to no teams
        // page.
        const currentUser = getCurrentUser(state);
        EventEmitter.emit(NavigationTypes.NAVIGATION_NO_TEAMS, isGuest(currentUser));
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
            if (channel.team_id && channel.team_id !== currentTeamId) {
                actions.push({
                    type: TeamTypes.SELECT_TEAM,
                    data: channel.team_id,
                });
            }
            actions.push({
                type: ChannelTypes.SELECT_CHANNEL,
                data: channelId,
                extra: {
                    channel,
                    member,
                    teamId: channel.team_id || currentTeamId,
                },
            });
            dispatch(batchActions(actions, 'BATCH_SWITCH_CHANNEL'));
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

        dispatch(batchActions(actions, 'BATCH_MARK_CHANNEL_VIEWED_AND_READ'));
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
    return async (dispatch) => {
        dispatch(setChannelRefreshing(true));
        const posts = await dispatch(fetchPostActionWithRetry(getPosts(channelId)));
        const actions = [setChannelRefreshing(false)];

        if (posts) {
            actions.push(setChannelRetryFailed(false));
        }

        dispatch(batchActions(actions, 'BATCH_REEFRESH_CHANNEL'));
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
        const currentUserId = getCurrentUserId(state);

        if (loadingPosts[channelId]) {
            return true;
        }

        if (!postId) {
            // No posts are visible, so the channel is empty
            return true;
        }

        if (isPendingPost(postId, currentUserId)) {
            // This is the first created post in the channel
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

        const postAction = getPostsBefore(channelId, postId, 0, pageSize);
        const result = await dispatch(fetchPostActionWithRetry(postAction));

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

        dispatch(batchActions(actions, 'BATCH_LOAD_MORE_POSTS'));
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

                    dispatch(batchActions(actions, 'BATCH_LOAD_CHANNELS_FOR_TEAM'));
                }

                // Fetch needed profiles from channel creators and direct channels
                dispatch(loadSidebar(data));

                dispatch(loadUnreadChannelPosts(data.channels, data.channelMembers));
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
            dispatch(batchActions(sidebarActions, 'BATCH_LOAD_SIDEBAR'));
        }
    };
}
