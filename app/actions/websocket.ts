// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@mm-redux/client';
import websocketClient from '@websocket';

import {GeneralTypes, EmojiTypes, PostTypes, PreferenceTypes, TeamTypes, UserTypes, RoleTypes, IntegrationTypes} from '@mm-redux/action_types';
import {General, Preferences} from '@mm-redux/constants';
import {
    getAllChannels,
    getChannel,
    getCurrentChannelId,
    getMyChannelMember as selectMyChannelMember,
    getRedirectChannelForTeam,
    getCurrentChannelStats,
    getChannelMembersInChannels,
    isManuallyUnread,
    getKnownUsers,
} from '@mm-redux/selectors/entities/channels';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getAllPosts, getPost as selectPost} from '@mm-redux/selectors/entities/posts';
import {getCurrentTeamId, getTeams as getTeamsSelector} from '@mm-redux/selectors/entities/teams';
import {getCurrentUser, getCurrentUserId, getUsers, getUserStatuses} from '@mm-redux/selectors/entities/users';
import {getUserIdFromChannelName} from '@mm-redux/utils/channel_utils';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {isGuest, removeUserFromList} from '@mm-redux/utils/user_utils';
import {isFromWebhook, isSystemMessage, shouldIgnorePost} from '@mm-redux/utils/post_utils';

import {DispatchFunc, GenericAction, Action, GetStateFunc, batchActions} from '@mm-redux/types/actions';

import {getCustomEmojiForReaction, getUnreadPostData, postDeleted, receivedNewPost, receivedPost} from '@mm-redux/actions/posts';
import {getProfilesByIds, getStatusesByIds} from '@mm-redux/actions/users';
import {Channel, ChannelMembership, ChannelType, ChannelUnread} from '@mm-redux/types/channels';
import {PreferenceType} from '@mm-redux/types/preferences';
import {TeamMembership} from '@mm-redux/types/teams';
import {Dictionary} from '@mm-redux/types/utilities';

import {WebsocketEvents} from '@constants';
import {
    selectChannel,
    getChannel as fetchChannel,
    getMyChannelMember,
    markChannelAsRead,
    getMyChannelsAndMembersForTeam,
    receivedChannel,
    receivedChannelStats,
    receivedMyChannelMember,
    receivedMyChannelsWithMembers,
    receivedUnarchivedChannel,
    receivedDeletedChannel,
    leaveChannel,
    postUnreadSuccess,
} from '@actions/channels';
import {
    fetchChannelAndMyMember,
    getAddedDmUsersIfNecessaryActions,
    makeDirectChannelVisibleIfNecessaryAction,
    makeGroupMessageVisibleIfNecessaryActions,
    markChannelAsViewedAndReadActions,
    markChannelAsUnreadActions,
} from '@actions/helpers/channels';
import {getPost, getPosts, getPostsAdditionalDataBatch, getPostThread} from '@actions/views/post';
import {getMe, loadMe} from '@actions/views/user';
import {GlobalState} from '@mm-redux/types/store';

export type WebsocketBroadcast = {
    omit_users: Dictionary<boolean>;
    user_id: string;
    channel_id: string;
    team_id: string;
}

export type WebSocketMessage = {
    event: string;
    data: any;
    broadcast: WebsocketBroadcast;
    seq: number;
}

export function init(additionalOptions: any = {}) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const config = getConfig(getState());
        let connUrl = additionalOptions.websocketUrl || config.WebsocketURL || Client4.getUrl();
        const authToken = Client4.getToken();

        connUrl += `${Client4.getUrlVersion()}/websocket`;
        websocketClient.setFirstConnectCallback(() => dispatch(handleFirstConnect()));
        websocketClient.setEventCallback((evt: WebSocketMessage) => dispatch(handleEvent(evt)));
        websocketClient.setReconnectCallback(() => dispatch(handleReconnect()));
        websocketClient.setCloseCallback((connectFailCount: number) => dispatch(handleClose(connectFailCount)));

        const websocketOpts = {
            connectionUrl: connUrl,
            ...additionalOptions,
        };

        return websocketClient.initialize(authToken, websocketOpts);
    };
}

let reconnect = false;
export function close(shouldReconnect = false) {
    reconnect = shouldReconnect;
    websocketClient.close(true);

    return {
        type: GeneralTypes.WEBSOCKET_CLOSED,
        timestamp: Date.now(),
        data: null,
    };
}

export function doFirstConnect(now: number) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const {lastDisconnectAt} = state.websocket;
        const actions: Array<GenericAction> = [{
            type: GeneralTypes.WEBSOCKET_SUCCESS,
            timestamp: now,
            data: null,
        }];

        if (isMinimumServerVersion(Client4.getServerVersion(), 5, 14) && lastDisconnectAt) {
            const currentUserId = getCurrentUserId(state);
            const users = getUsers(state);
            const userIds = Object.keys(users);
            const userUpdates = await Client4.getProfilesByIds(userIds, {since: lastDisconnectAt});

            if (userUpdates.length) {
                removeUserFromList(currentUserId, userUpdates);
                actions.push({
                    type: UserTypes.RECEIVED_PROFILES_LIST,
                    data: userUpdates,
                });
            }
        }

        dispatch(batchActions(actions, 'BATCH_WS_CONNCET'));

        return {data: true};
    };
}

export function doReconnect(now: number) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentTeamId = getCurrentTeamId(state);
        const currentChannelId = getCurrentChannelId(state);
        const currentUserId = getCurrentUserId(state);
        const users = getUsers(state);
        const {lastDisconnectAt} = state.websocket;
        const actions: Array<GenericAction> = [];

        dispatch({
            type: GeneralTypes.WEBSOCKET_SUCCESS,
            timestamp: now,
            data: null,
        });

        try {
            const {data: me}: any = await dispatch(loadMe(null, null, true));

            if (!me.error) {
                const roles = [];

                if (me.roles?.length) {
                    roles.push(...me.roles);
                }

                actions.push({
                    type: PreferenceTypes.RECEIVED_ALL_PREFERENCES,
                    data: me.preferences,
                }, {
                    type: TeamTypes.RECEIVED_MY_TEAM_UNREADS,
                    data: me.teamUnreads,
                }, {
                    type: TeamTypes.RECEIVED_TEAMS_LIST,
                    data: me.teams,
                }, {
                    type: TeamTypes.RECEIVED_MY_TEAM_MEMBERS,
                    data: me.teamMembers,
                });

                const currentTeamMembership = me.teamMembers.find((tm: TeamMembership) => tm.team_id === currentTeamId && tm.delete_at === 0);

                if (currentTeamMembership) {
                    const {data: myData}: any = await dispatch(getMyChannelsAndMembersForTeam(currentTeamId, true));

                    if (myData?.channels && myData?.channelMembers) {
                        actions.push(receivedMyChannelsWithMembers(myData.channels, myData.channelMembers));

                        const stillMemberOfCurrentChannel = myData.channelMembers.find((cm: ChannelMembership) => cm.channel_id === currentChannelId);

                        const channelStillExists = myData.channels.find((c: Channel) => c.id === currentChannelId);
                        const config = me.config || getConfig(getState());
                        const viewArchivedChannels = config.ExperimentalViewArchivedChannels === 'true';
                        if (!stillMemberOfCurrentChannel || !channelStillExists || (!viewArchivedChannels && channelStillExists.delete_at !== 0)) {
                            EventEmitter.emit(General.SWITCH_TO_DEFAULT_CHANNEL, currentTeamId);
                        } else {
                            dispatch(getPosts(currentChannelId));
                        }
                    }

                    if (myData.roles?.length) {
                        roles.push(...myData.roles);
                    }
                } else {
                    // If the user is no longer a member of this team when reconnecting
                    const newMsg = {
                        data: {
                            user_id: currentUserId,
                            team_id: currentTeamId,
                        },
                    };
                    dispatch(handleLeaveTeamEvent(newMsg));
                }

                if (roles.length) {
                    actions.push({
                        type: RoleTypes.RECEIVED_ROLES,
                        data: roles,
                    });
                }

                if (isMinimumServerVersion(Client4.getServerVersion(), 5, 14) && lastDisconnectAt) {
                    const userIds = Object.keys(users);
                    const userUpdates = await Client4.getProfilesByIds(userIds, {since: lastDisconnectAt});

                    if (userUpdates.length) {
                        removeUserFromList(currentUserId, userUpdates);
                        actions.push({
                            type: UserTypes.RECEIVED_PROFILES_LIST,
                            data: userUpdates,
                        });
                    }
                }

                if (actions.length) {
                    dispatch(batchActions(actions, 'BATCH_WS_RECONNECT'));
                }
            }
        } catch (e) {
            // do nothing
        }

        return {data: true};
    };
}

function handleFirstConnect() {
    return (dispatch: DispatchFunc) => {
        const now = Date.now();

        if (reconnect) {
            reconnect = false;
            return dispatch(doReconnect(now));
        }
        return dispatch(doFirstConnect(now));
    };
}

function handleReconnect() {
    return (dispatch: DispatchFunc) => {
        return dispatch(doReconnect(Date.now()));
    };
}

function handleClose(connectFailCount: number) {
    return {
        type: GeneralTypes.WEBSOCKET_FAILURE,
        error: connectFailCount,
        data: null,
        timestamp: Date.now(),
    };
}

function handleEvent(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc) => {
        switch (msg.event) {
        case WebsocketEvents.POSTED:
        case WebsocketEvents.EPHEMERAL_MESSAGE:
            return dispatch(handleNewPostEvent(msg));
        case WebsocketEvents.POST_EDITED:
            return dispatch(handlePostEdited(msg));
        case WebsocketEvents.POST_DELETED:
            return dispatch(handlePostDeleted(msg));
        case WebsocketEvents.POST_UNREAD:
            return dispatch(handlePostUnread(msg));
        case WebsocketEvents.LEAVE_TEAM:
            return dispatch(handleLeaveTeamEvent(msg));
        case WebsocketEvents.UPDATE_TEAM:
            return dispatch(handleUpdateTeamEvent(msg));
        case WebsocketEvents.ADDED_TO_TEAM:
            return dispatch(handleTeamAddedEvent(msg));
        case WebsocketEvents.USER_ADDED:
            return dispatch(handleUserAddedEvent(msg));
        case WebsocketEvents.USER_REMOVED:
            return dispatch(handleUserRemovedEvent(msg));
        case WebsocketEvents.USER_UPDATED:
            return dispatch(handleUserUpdatedEvent(msg));
        case WebsocketEvents.ROLE_ADDED:
            return dispatch(handleRoleAddedEvent(msg));
        case WebsocketEvents.ROLE_REMOVED:
            return dispatch(handleRoleRemovedEvent(msg));
        case WebsocketEvents.ROLE_UPDATED:
            return dispatch(handleRoleUpdatedEvent(msg));
        case WebsocketEvents.USER_ROLE_UPDATED:
            return dispatch(handleUserRoleUpdated(msg));
        case WebsocketEvents.CHANNEL_CREATED:
            return dispatch(handleChannelCreatedEvent(msg));
        case WebsocketEvents.CHANNEL_DELETED:
            return dispatch(handleChannelDeletedEvent(msg));
        case WebsocketEvents.CHANNEL_UNARCHIVED:
            return dispatch(handleChannelUnarchiveEvent(msg));
        case WebsocketEvents.CHANNEL_UPDATED:
            return dispatch(handleChannelUpdatedEvent(msg));
        case WebsocketEvents.CHANNEL_CONVERTED:
            return dispatch(handleChannelConvertedEvent(msg));
        case WebsocketEvents.CHANNEL_VIEWED:
            return dispatch(handleChannelViewedEvent(msg));
        case WebsocketEvents.CHANNEL_MEMBER_UPDATED:
            return dispatch(handleChannelMemberUpdatedEvent(msg));
        case WebsocketEvents.CHANNEL_SCHEME_UPDATED:
            return dispatch(handleChannelSchemeUpdatedEvent(msg));
        case WebsocketEvents.DIRECT_ADDED:
            return dispatch(handleDirectAddedEvent(msg));
        case WebsocketEvents.PREFERENCE_CHANGED:
            return dispatch(handlePreferenceChangedEvent(msg));
        case WebsocketEvents.PREFERENCES_CHANGED:
            return dispatch(handlePreferencesChangedEvent(msg));
        case WebsocketEvents.PREFERENCES_DELETED:
            return dispatch(handlePreferencesDeletedEvent(msg));
        case WebsocketEvents.STATUS_CHANGED:
            return dispatch(handleStatusChangedEvent(msg));
        case WebsocketEvents.TYPING:
            return dispatch(handleUserTypingEvent(msg));
        case WebsocketEvents.HELLO:
            handleHelloEvent(msg);
            break;
        case WebsocketEvents.REACTION_ADDED:
            return dispatch(handleReactionAddedEvent(msg));
        case WebsocketEvents.REACTION_REMOVED:
            return dispatch(handleReactionRemovedEvent(msg));
        case WebsocketEvents.EMOJI_ADDED:
            return dispatch(handleAddEmoji(msg));
        case WebsocketEvents.LICENSE_CHANGED:
            return dispatch(handleLicenseChangedEvent(msg));
        case WebsocketEvents.CONFIG_CHANGED:
            return dispatch(handleConfigChangedEvent(msg));
        case WebsocketEvents.OPEN_DIALOG:
            return dispatch(handleOpenDialogEvent(msg));
        }

        return {data: true};
    };
}

function handleNewPostEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentChannelId = getCurrentChannelId(state);
        const post = JSON.parse(msg.data.post);
        const actions: Array<Action> = [];

        const exists = selectPost(state, post.pending_post_id);

        if (!exists) {
            if (getCurrentChannelId(state) === post.channel_id) {
                EventEmitter.emit(WebsocketEvents.INCREASE_POST_VISIBILITY_BY_ONE);
            }

            const myChannel = getChannel(state, post.channel_id);
            if (!myChannel) {
                actions.push(fetchChannel(post.channel_id));
            }

            const myChannelMember = selectMyChannelMember(state, post.channel_id);
            if (!myChannelMember) {
                actions.push(getMyChannelMember(post.channel_id))
            }

            actions.push(receivedNewPost(post));

            // If we don't have the thread for this post, fetch it from the server
            // and include the actions in the batch
            if (post.root_id) {
                const rootPost = selectPost(state, post.root_id);

                if (!rootPost) {
                    const thread: any = await dispatch(getPostThread(post.root_id, true));
                    if (thread.data?.length) {
                        actions.push(...thread.data);
                    }
                }
            }

            if (post.channel_id === currentChannelId) {
                const id = post.channel_id + post.root_id;
                const {typing} = state.entities;

                if (typing[id]) {
                    actions.push({
                        type: WebsocketEvents.STOP_TYPING,
                        data: {
                            id,
                            userId: post.user_id,
                            now: Date.now(),
                        },
                    });
                }
            }

            // Fetch and batch additional post data
            const additional: any = await dispatch(getPostsAdditionalDataBatch([post]));
            if (additional.data.length) {
                actions.push(...additional.data);
            }

            if (msg.data.channel_type === General.DM_CHANNEL) {
                const currentUserId = getCurrentUserId(state);
                const otherUserId = getUserIdFromChannelName(currentUserId, msg.data.channel_name);
                const dmAction = makeDirectChannelVisibleIfNecessaryAction(state, otherUserId);
                if (dmAction) {
                    actions.push(dmAction);
                }
            } else if (msg.data.channel_type === General.GM_CHANNEL) {
                const gmActions = await makeGroupMessageVisibleIfNecessaryActions(state, post.channel_id);
                if (gmActions.length) {
                    actions.push(...gmActions);
                }
            }

            if (!shouldIgnorePost(post)) {
                let markAsRead = false;
                let markAsReadOnServer = false;

                if (!isManuallyUnread(state, post.channel_id)) {
                    if (
                        post.user_id === getCurrentUserId(state) &&
                        !isSystemMessage(post) &&
                        !isFromWebhook(post)
                    ) {
                        markAsRead = true;
                        markAsReadOnServer = false;
                    } else if (post.channel_id === currentChannelId) {
                        markAsRead = true;
                        markAsReadOnServer = true;
                    }
                }

                if (markAsRead) {
                    const readActions = markChannelAsViewedAndReadActions(state, post.channel_id, undefined, markAsReadOnServer);
                    actions.push(...readActions);
                } else {
                    const unreadActions = markChannelAsUnreadActions(state, post.channel_id, msg.data.mentions);
                    actions.push(...unreadActions);
                }
            }

            dispatch(batchActions(actions, 'BATCH_WS_NEW_POST'));
        }

        return {data: true};
    };
}

function handlePostEdited(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc) => {
        const data = JSON.parse(msg.data.post);
        const actions = [receivedPost(data)];

        const additional: any = await dispatch(getPostsAdditionalDataBatch([data]));
        if (additional.data.length) {
            actions.push(...additional.data);
        }

        dispatch(batchActions(actions, 'BATCH_WS_POST_EDITED'));
        return {data: true};
    };
}

function handlePostDeleted(msg: WebSocketMessage) {
    const data = JSON.parse(msg.data.post);

    return postDeleted(data);
}

function handlePostUnread(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const manual = isManuallyUnread(state, msg.broadcast.channel_id);

        if (!manual) {
            const unreadChannel: ChannelUnread = {
                ...msg.data,
                channel_id: msg.broadcast.channel_id,
                user_id: msg.broadcast.user_id,
                team_id: msg.broadcast.team_id,
                msg_count: msg.data.msg_count,
            };
            const data = getUnreadPostData(unreadChannel, state);
            dispatch(postUnreadSuccess(data))
            return {data};
        }

        return {data: null};
    };
}

function handleLeaveTeamEvent(msg: Partial<WebSocketMessage>) {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const teams = getTeamsSelector(state);
        const currentTeamId = getCurrentTeamId(state);
        const currentUser = getCurrentUser(state);

        if (currentUser.id === msg.data.user_id) {
            const actions: Array<GenericAction> = [{type: TeamTypes.LEAVE_TEAM, data: teams[msg.data.team_id]}];
            if (isGuest(currentUser.roles)) {
                const notVisible = notVisibleUsersActions(state);
                if (notVisible.length) {
                    actions.push(...notVisible);
                }
            }
            dispatch(batchActions(actions, 'BATCH_WS_LEAVE_TEAM'));

            // if they are on the team being removed deselect the current team and channel
            if (currentTeamId === msg.data.team_id) {
                EventEmitter.emit('leave_team');
            }
        }
        return {data: true};
    };
}

function handleUpdateTeamEvent(msg: WebSocketMessage) {
    return {
        type: TeamTypes.UPDATED_TEAM,
        data: JSON.parse(msg.data.team),
    };
}

function handleTeamAddedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc) => {
        try {
            const [team, teamUnreads] = await Promise.all([
                Client4.getTeam(msg.data.team_id),
                Client4.getMyTeamUnreads(),
            ]);

            const actions = [{
                type: TeamTypes.RECEIVED_TEAM,
                data: team,
            }, {
                type: TeamTypes.RECEIVED_MY_TEAM_UNREADS,
                data: teamUnreads,
            }];

            dispatch(batchActions(actions, 'BATCH_WS_TEAM_ADDED'));
        } catch {
            // do nothing
        }

        return {data: true};
    };
}

function handleUserRoleUpdated(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc) => {
        try {
            const roles = msg.data.roles.split(' ');
            const data = await Client4.getRolesByNames(roles);

            dispatch({
                type: RoleTypes.RECEIVED_ROLES,
                data: data.roles,
            });
        } catch {
            // do nothing
        }

        return {data: true};
    };
}

function handleUserAddedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            const state = getState();
            const currentChannelId = getCurrentChannelId(state);
            const currentTeamId = getCurrentTeamId(state);
            const currentUserId = getCurrentUserId(state);
            const teamId = msg.data.team_id;
            const actions: Array<Action> = [{
                type: UserTypes.RECEIVED_PROFILE_IN_CHANNEL,
                data: {
                    id: msg.broadcast.channel_id,
                    user_id: msg.data.user_id,
                }
            }];

            if (msg.broadcast.channel_id === currentChannelId) {
                const stats = await Client4.getChannelStats(currentChannelId);
                actions.push(receivedChannelStats(stats));
            }

            if (teamId === currentTeamId && msg.data.user_id === currentUserId) {
                const channelActions = await fetchChannelAndMyMember(msg.broadcast.channel_id);

                if (channelActions.length) {
                    actions.push(...channelActions);
                }
            }

            dispatch(batchActions(actions, 'BATCH_WS_USER_ADDED'));
        } catch (error) {
            //do nothing
        }
        return {data: true};
    };
}

function handleUserRemovedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            const state = getState();
            const channels = getAllChannels(state);
            const currentChannelId = getCurrentChannelId(state);
            const currentTeamId = getCurrentTeamId(state);
            const currentUser = getCurrentUser(state);
            const actions: Array<Action> = [{
                type: UserTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL,
                data: {
                    id: msg.broadcast.channel_id,
                    user_id: msg.data.user_id,
                },
            }];

            const channel = channels[currentChannelId];

            if (msg.data.user_id !== currentUser.id) {
                const members = getChannelMembersInChannels(state);
                const isMember = Object.values(members).some((member) => member[msg.data.user_id]);
                if (channel && isGuest(currentUser.roles) && !isMember) {
                    actions.push({
                        type: UserTypes.PROFILE_NO_LONGER_VISIBLE,
                        data: {user_id: msg.data.user_id},
                    }, {
                        type: TeamTypes.REMOVE_MEMBER_FROM_TEAM,
                        data: {team_id: channel.team_id, user_id: msg.data.user_id},
                    });
                }
            }

            if (msg.broadcast.user_id === currentUser.id && currentTeamId) {
                const {data: myData}: any = await dispatch(getMyChannelsAndMembersForTeam(currentTeamId, true));

                if (myData?.channels && myData?.channelMembers) {
                    actions.push(receivedMyChannelsWithMembers(myData.channels, myData.channelMembers));
                }

                if (channel) {
                    actions.push(leaveChannel(channel, currentUser.id));
                }

                if (msg.data.channel_id === currentChannelId) {
                    // emit the event so the client can change his own state
                    EventEmitter.emit(General.SWITCH_TO_DEFAULT_CHANNEL, currentTeamId);
                }
                if (isGuest(currentUser.roles)) {
                    const notVisible = notVisibleUsersActions(state);
                    if (notVisible.length) {
                        actions.push(...notVisible);
                    }
                }
            } else if (msg.data.channel_id === currentChannelId) {
                const stats = await Client4.getChannelStats(currentChannelId);
                actions.push(receivedChannelStats(stats));
            }

            dispatch(batchActions(actions, 'BATCH_WS_USER_REMOVED'));
        } catch {
            // do nothing
        }

        return {data: true};
    };
}

function handleUserUpdatedEvent(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const currentUser = getCurrentUser(getState());
        const user = msg.data.user;

        if (user.id === currentUser.id) {
            if (user.update_at > currentUser.update_at) {
                // Need to request me to make sure we don't override with sanitized fields from the
                // websocket event
                dispatch(getMe());
            }
        } else {
            dispatch({
                type: UserTypes.RECEIVED_PROFILES,
                data: {
                    [user.id]: user,
                },
            });
        }
        return {data: true};
    };
}

function handleRoleAddedEvent(msg: WebSocketMessage) {
    const role = JSON.parse(msg.data.role);

    return {
        type: RoleTypes.RECEIVED_ROLE,
        data: role,
    };
}

function handleRoleRemovedEvent(msg: WebSocketMessage) {
    const role = JSON.parse(msg.data.role);

    return {
        type: RoleTypes.ROLE_DELETED,
        data: role,
    };
}

function handleRoleUpdatedEvent(msg: WebSocketMessage) {
    const role = JSON.parse(msg.data.role);

    return {
        type: RoleTypes.RECEIVED_ROLE,
        data: role,
    };
}

function handleChannelCreatedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {channel_id: channelId, team_id: teamId} = msg.data;
        const state = getState();
        const channels = getAllChannels(state);
        const currentTeamId = getCurrentTeamId(state);

        if (teamId === currentTeamId && !channels[channelId]) {
            const channelActions = await fetchChannelAndMyMember(msg.broadcast.channel_id);
            if (channelActions.length) {
                dispatch(batchActions(channelActions, 'BATCH_WS_CHANNEL_CREATED'));
            }
        }
        return {data: true};
    };
}

function handleChannelDeletedEvent(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentChannelId = getCurrentChannelId(state);
        const currentTeamId = getCurrentTeamId(state);
        const config = getConfig(state);
        const viewArchivedChannels = config.ExperimentalViewArchivedChannels === 'true';
        const actions: Array<Action> = [
            receivedDeletedChannel(msg.data.channel_id, msg.data.delete_at, viewArchivedChannels),
        ];

        if (msg.broadcast.team_id === currentTeamId) {
            if (msg.data.channel_id === currentChannelId && !viewArchivedChannels) {
                const channel = getRedirectChannelForTeam(state, currentTeamId);
                if (channel?.id) {
                    actions.push(selectChannel(channel.id));
                }
            }
        }

        dispatch(batchActions(actions, 'BATCH_WS_CHANNEL_ARCHIVED'));

        return {data: true};
    };
}

function handleChannelUnarchiveEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentTeamId = getCurrentTeamId(state);
        const config = getConfig(state);
        const canViewArchivedChannels = config.ExperimentalViewArchivedChannels === 'true';

        if (msg.broadcast.team_id === currentTeamId && canViewArchivedChannels) {
            const actions: Array<Action> = [
                receivedUnarchivedChannel(msg.data.channel_id),
            ];

            const {data: myData}: any = await dispatch(getMyChannelsAndMembersForTeam(currentTeamId, true));
            if (myData?.channels && myData?.channelMembers) {
                actions.push(receivedMyChannelsWithMembers(myData.channels, myData.channelMembers));
            }

            dispatch(batchActions(actions, 'BATCH_WS_CHANNEL_UNARCHIVED'));
        }
        return {data: true};
    };
}

function handleChannelUpdatedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let channel;
        try {
            channel = msg.data ? JSON.parse(msg.data.channel) : null;
        } catch (err) {
            return {error: err};
        }

        const currentChannelId = getCurrentChannelId(getState());
        if (channel) {
            dispatch(receivedChannel(channel));

            if (currentChannelId === channel.id) {
                // Emit an event with the channel received as we need to handle
                // the changes without listening to the store
                EventEmitter.emit(WebsocketEvents.CHANNEL_UPDATED, channel);
            }
        }
        return {data: true};
    };
}

// handleChannelConvertedEvent handles updating of channel which is converted from public to private

function handleChannelConvertedEvent(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const channelId = msg.data.channel_id;
        if (channelId) {
            let channel = getChannel(getState(), channelId);
            if (channel) {
                channel = {
                    ...channel,
                    type: <ChannelType>General.PRIVATE_CHANNEL,
                };
                dispatch(receivedChannel(channel));
            }
        }
        return {data: true};
    };
}

function handleChannelViewedEvent(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const {channel_id: channelId} = msg.data;
        const currentChannelId = getCurrentChannelId(state);
        const currentUserId = getCurrentUserId(state);

        if (channelId !== currentChannelId && currentUserId === msg.broadcast.user_id) {
            dispatch(markChannelAsRead(channelId, undefined, false));
        }
        return {data: true};
    };
}

function handleChannelMemberUpdatedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc) => {
        try {
            const channelMember = JSON.parse(msg.data.channelMember);
            const rolesToLoad = channelMember.roles.split(' ');
            const actions: Array<Action> = [
                receivedMyChannelMember(channelMember),
            ];

            const roles = await Client4.getRolesByNames(rolesToLoad);
            if (roles.length) {
                actions.push({
                    type: RoleTypes.RECEIVED_ROLES,
                    data: roles,
                });
            }

            dispatch(batchActions(actions, 'BATCH_WS_CHANNEL_MEMBER_UPDATE'));
        } catch {
            //do nothing
        }
        return {data: true};
    };
}

function handleChannelSchemeUpdatedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc) => {
        const channelActions = await fetchChannelAndMyMember(msg.broadcast.channel_id);
        if (channelActions.length) {
            dispatch(batchActions(channelActions, 'BATCH_WS_SCHEME_UPDATE'));
        }
        return {data: true};
    };
}

function handleDirectAddedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc) => {
        const channelActions = await fetchChannelAndMyMember(msg.broadcast.channel_id);
        if (channelActions.length) {
            dispatch(batchActions(channelActions, 'BATCH_WS_DM_ADDED'));
        }
        return {data: true};
    };
}

function handlePreferenceChangedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const preference = JSON.parse(msg.data.preference);
        const actions: Array<GenericAction> = [{
            type: PreferenceTypes.RECEIVED_PREFERENCES,
            data: [preference],
        }];

        const dmActions = await getAddedDmUsersIfNecessaryActions(getState(), [preference]);
        if (dmActions.length) {
            actions.push(...dmActions);
        }

        dispatch(batchActions(actions, 'BATCH_WS_PREFERENCE_CHANGED'));
        return {data: true};
    };
}

function handlePreferencesChangedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const preferences: PreferenceType[] = JSON.parse(msg.data.preferences);
        const posts = getAllPosts(getState());
        const actions: Array<GenericAction> = [{
            type: PreferenceTypes.RECEIVED_PREFERENCES,
            data: preferences,
        }];

        preferences.forEach((pref) => {
            if (pref.category === Preferences.CATEGORY_FLAGGED_POST && !posts[pref.name]) {
                dispatch(getPost(pref.name));
            }
        });

        const dmActions = await getAddedDmUsersIfNecessaryActions(getState(), preferences);
        if (dmActions.length) {
            actions.push(...dmActions);
        }

        dispatch(batchActions(actions, 'BATCH_WS_PREFERENCES_CHANGED'));
        return {data: true};
    };
}

function handlePreferencesDeletedEvent(msg: WebSocketMessage) {
    const preferences = JSON.parse(msg.data.preferences);

    return {type: PreferenceTypes.DELETED_PREFERENCES, data: preferences};
}

function handleStatusChangedEvent(msg: WebSocketMessage) {
    return {
        type: UserTypes.RECEIVED_STATUSES,
        data: [{user_id: msg.data.user_id, status: msg.data.status}],
    };
}

function handleHelloEvent(msg: WebSocketMessage) {
    const serverVersion = msg.data.server_version;
    if (serverVersion && Client4.serverVersion !== serverVersion) {
        Client4.serverVersion = serverVersion;
        EventEmitter.emit(General.SERVER_VERSION_CHANGED, serverVersion);
    }
}

export function handleUserTypingEvent(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentChannelId = getCurrentChannelId(state);

        if (currentChannelId === msg.broadcast.channel_id) {
            const profiles = getUsers(state);
            const statuses = getUserStatuses(state);
            const currentUserId = getCurrentUserId(state);
            const config = getConfig(state);
            const userId = msg.data.user_id;

            const data = {
                id: msg.broadcast.channel_id + msg.data.parent_id,
                userId,
                now: Date.now(),
            };

            dispatch({
                type: WebsocketEvents.TYPING,
                data,
            });

            setTimeout(() => {
                const newState = getState();
                const {typing} = newState.entities;

                if (typing && typing[data.id]) {
                    dispatch({
                        type: WebsocketEvents.STOP_TYPING,
                        data,
                    });
                }
            }, parseInt(config.TimeBetweenUserTypingUpdatesMilliseconds!, 10));

            if (!profiles[userId] && userId !== currentUserId) {
                dispatch(getProfilesByIds([userId]));
            }

            const status = statuses[userId];
            if (status !== General.ONLINE) {
                dispatch(getStatusesByIds([userId]));
            }
        }

        return {data: true};
    };
}

function handleReactionAddedEvent(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc) => {
        const {data} = msg;
        const reaction = JSON.parse(data.reaction);

        dispatch(getCustomEmojiForReaction(reaction.emoji_name));

        dispatch({
            type: PostTypes.RECEIVED_REACTION,
            data: reaction,
        });
        return {data: true};
    };
}

function handleReactionRemovedEvent(msg: WebSocketMessage) {
    const {data} = msg;
    const reaction = JSON.parse(data.reaction);

    return {
        type: PostTypes.REACTION_DELETED,
        data: reaction,
    };
}

function handleAddEmoji(msg: WebSocketMessage) {
    const data = JSON.parse(msg.data.emoji);

    return {
        type: EmojiTypes.RECEIVED_CUSTOM_EMOJI,
        data,
    };
}

function handleLicenseChangedEvent(msg: WebSocketMessage) {
    const data = msg.data.license;

    return {
        type: GeneralTypes.CLIENT_LICENSE_RECEIVED,
        data,
    };
}

function handleConfigChangedEvent(msg: WebSocketMessage) {
    const data = msg.data.config;

    EventEmitter.emit(General.CONFIG_CHANGED, data);
    return {
        type: GeneralTypes.CLIENT_CONFIG_RECEIVED,
        data,
    };
}

function handleOpenDialogEvent(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc) => {
        const data = (msg.data && msg.data.dialog) || {};
        dispatch({type: IntegrationTypes.RECEIVED_DIALOG, data: JSON.parse(data)});
        return {data: true};
    };
}

// Helpers
export function notVisibleUsersActions(state: GlobalState): Array<GenericAction> {
    const knownUsers = getKnownUsers(state);
    const allUsers = Object.keys(getUsers(state));
    const usersToRemove = new Set(allUsers.filter((x) => !knownUsers.has(x)));

    const actions = [];
    for (const userToRemove of usersToRemove.values()) {
        actions.push({type: UserTypes.PROFILE_NO_LONGER_VISIBLE, data: {user_id: userToRemove}});
    }

    return actions;
}

let lastTimeTypingSent = 0;
export function userTyping(state: GlobalState, channelId: string, parentPostId: string) {
    const config = getConfig(state);
    const t = Date.now();
    const stats = getCurrentChannelStats(state);
    const membersInChannel = stats ? stats.member_count : 0;

    if (((t - lastTimeTypingSent) > parseInt(config.TimeBetweenUserTypingUpdatesMilliseconds!, 10)) &&
        (membersInChannel < parseInt(config.MaxNotificationsPerChannel!, 10)) && (config.EnableUserTypingMessages === 'true')) {
        websocketClient.userTyping(channelId, parentPostId);
        lastTimeTypingSent = t;
    }
}