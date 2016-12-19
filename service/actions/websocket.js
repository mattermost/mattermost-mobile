// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'service/client';
import websocketClient from 'service/client/websocket';
import {batchActions} from 'redux-batched-actions';
import {
    Constants,
    ChannelTypes,
    GeneralTypes,
    PostsTypes,
    PreferencesTypes,
    TeamsTypes,
    UsersTypes,
    WebsocketEvents
} from 'service/constants';

export function init(siteUrl, token) {
    return async (dispatch, getState) => {
        dispatch({type: GeneralTypes.WEBSOCKET_REQUEST}, getState);
        const config = getState().entities.general.config;
        let connUrl = siteUrl || Client.getUrl();
        const authToken = token || Client.getToken();

        // replace the protocol with a websocket one
        if (connUrl.startsWith('https:')) {
            connUrl = connUrl.replace(/^https:/, 'wss:');
        } else {
            connUrl = connUrl.replace(/^http:/, 'ws:');
        }

        // append a port number if one isn't already specified
        if (!(/:\d+$/).test(connUrl)) {
            if (connUrl.startsWith('wss:')) {
                connUrl += ':' + (config.WebsocketSecurePort || 443);
            } else {
                connUrl += ':' + (config.WebsocketPort || 80);
            }
        }

        connUrl += `${Client.getUrlVersion()}/users/websocket`;
        websocketClient.setFirstConnectCallback(handleFirstConnect);
        websocketClient.setEventCallback(handleEvent);
        websocketClient.setReconnectCallback(handleReconnect);
        websocketClient.setCloseCallback(handleClose);
        websocketClient.initialize(connUrl, authToken, dispatch, getState);
    };
}

export function close() {
    return async (dispatch, getState) => {
        websocketClient.close();
        if (dispatch) {
            dispatch({type: GeneralTypes.WEBSOCKET_FAILURE, error: 'Closed'}, getState);
        }
    };
}

function handleFirstConnect(dispatch, getState) {
    dispatch({type: GeneralTypes.WEBSOCKET_SUCCESS}, getState);
}

function handleReconnect(dispatch, getState) {
    const entities = getState().entities;
    const currentTeamId = entities.teams.currentId;
    const currentChannelId = entities.channels.currentId;

    if (currentTeamId) {
        getChannelsAndMembersHelper(currentTeamId, dispatch, getState);

        if (currentChannelId) {
            loadPostsHelper(currentTeamId, currentChannelId, dispatch, getState);
        }
    }

    dispatch({type: GeneralTypes.WEBSOCKET_SUCCESS}, getState);
}

function handleClose(connectFailCount, dispatch, getState) {
    dispatch({type: GeneralTypes.WEBSOCKET_FAILURE, error: connectFailCount}, getState);
}

function handleEvent(msg, dispatch, getState) {
    switch (msg.event) {
    case WebsocketEvents.POSTED:
    case WebsocketEvents.EPHEMERAL_MESSAGE:
        handleNewPostEvent(msg, dispatch, getState);
        break;
    case WebsocketEvents.POST_EDITED:
        handlePostEdited(msg, dispatch, getState);
        break;
    case WebsocketEvents.POST_DELETED:
        handlePostDeleted(msg, dispatch, getState);
        break;
    case WebsocketEvents.LEAVE_TEAM:
        handleLeaveTeamEvent(msg, dispatch, getState);
        break;
    case WebsocketEvents.USER_ADDED:
        handleUserAddedEvent(msg, dispatch, getState);
        break;
    case WebsocketEvents.USER_REMOVED:
        handleUserRemovedEvent(msg, dispatch, getState);
        break;
    case WebsocketEvents.USER_UPDATED:
        handleUserUpdatedEvent(msg, dispatch, getState);
        break;
    case WebsocketEvents.CHANNEL_VIEWED:
        handleChannelViewedEvent(msg, dispatch, getState);
        break;
    case WebsocketEvents.CHANNEL_DELETED:
        handleChannelDeletedEvent(msg, dispatch, getState);
        break;
    case WebsocketEvents.DIRECT_ADDED:
        handleDirectAddedEvent(msg, dispatch, getState);
        break;
    case WebsocketEvents.PREFERENCE_CHANGED:
        handlePreferenceChangedEvent(msg, dispatch, getState);
        break;
    case WebsocketEvents.STATUS_CHANGED:
        handleStatusChangedEvent(msg, dispatch, getState);
        break;
    }
}

function handleNewPostEvent(msg, dispatch, getState) {
    const state = getState();
    const users = state.entities.users;
    const channels = state.entities.channels;
    const teams = state.entities.teams;
    const {posts} = state.entities.posts;
    const isActive = state.entities.general.appState;
    const post = JSON.parse(msg.data.post);
    const userId = post.user_id;
    const teamId = msg.data.team_id;
    const status = users.statuses[userId];

    if (!users.profiles[userId]) {
        getProfilesHelper([userId], dispatch, getState);
    }

    if (status !== Constants.ONLINE) {
        getStatusesHelper([userId], dispatch, getState);
    }

    if (post.channel_id === channels.currentId) {
        if (isActive) {
            updateLastViewedHelper(teamId, post.channel_id, dispatch, getState);
        } else {
            getChannelHelper(teamId, post.channel_id, dispatch, getState);
        }
    } else if (msg && (teamId === teams.currentId || msg.data.channel_type === Constants.DM_CHANNEL)) {
        getChannelHelper(teamId, post.channel_id, dispatch, getState);
    }

    if (post.root_id && !posts[post.root_id]) {
        Client.getPost(teamId, post.channel_id, post.root_id).then((data) => {
            const rootUserId = data.posts[post.root_id].user_id;
            const rootStatus = users.statuses[rootUserId];
            if (!users.profiles[rootUserId]) {
                getProfilesHelper([rootUserId], dispatch, getState);
            }

            if (rootStatus !== Constants.ONLINE) {
                getStatusesHelper([rootUserId], dispatch, getState);
            }

            dispatch({
                type: PostsTypes.RECEIVED_POSTS,
                data,
                channelId: post.channel_id
            }, getState);
        });
    }

    dispatch({
        type: PostsTypes.RECEIVED_POSTS,
        data: {
            order: [],
            posts: {
                [post.id]: post
            }
        },
        channelId: post.channel_id
    }, getState);
}

function handlePostEdited(msg, dispatch, getState) {
    const state = getState();
    const channels = state.entities.channels;
    const isActive = state.entities.general.appState;
    const data = JSON.parse(msg.data.post);
    dispatch({type: PostsTypes.RECEIVED_POST, data}, getState);

    if (msg.broadcast.channel_id === channels.currentId && isActive) {
        // FIXME: Update post should include team_id in the message
        // updateLastViewedHelper(msg.data.team_id, data.channel_id, dispatch, getState);
    }
}

function handlePostDeleted(msg, dispatch, getState) {
    const data = JSON.parse(msg.data.post);
    dispatch({type: PostsTypes.POST_DELETED, data}, getState);
}

function handleLeaveTeamEvent(msg, dispatch, getState) {
    const entities = getState().entities;
    const teams = entities.teams;
    const users = entities.users;

    if (users.currentId === msg.data.user_id) {
        dispatch({type: TeamsTypes.LEAVE_TEAM, data: teams.teams[msg.data.team_id]}, getState);

        // if they are on the team being removed deselect the current team and channel
        if (teams.currentId === msg.data.team_id) {
            dispatch(batchActions([
                {
                    type: TeamsTypes.SELECT_TEAM,
                    data: ''
                },
                {
                    type: ChannelTypes.SELECTED_CHANNEL,
                    data: ''
                }
            ]), getState);
        }
    }
}

function handleUserAddedEvent(msg, dispatch, getState) {
    const state = getState();
    const channels = state.entities.channels;
    const teams = state.entities.teams;
    const users = state.entities.users;
    const teamId = msg.data.team_id;

    if (msg.broadcast.channel_id === channels.currentId) {
        getChannelStatsHelper(teamId, channels.currentId, dispatch, getState);
    }

    if (teamId === teams.currentId && msg.data.user_id === users.currentId) {
        getChannelHelper(teamId, msg.broadcast.channel_id, dispatch, getState);
    }
}

function handleUserRemovedEvent(msg, dispatch, getState) {
    const state = getState();
    const channels = state.entities.channels;
    const teams = state.entities.teams;
    const users = state.entities.users;
    const teamId = teams.currentId;

    if (msg.broadcast.user_id === users.currentId && teamId) {
        getChannelsAndMembersHelper(teamId, dispatch, getState);
    } else if (msg.broadcast.channel_id === channels.currentId) {
        getChannelStatsHelper(teamId, channels.currentId, dispatch, getState);
    }
}

function handleUserUpdatedEvent(msg, dispatch, getState) {
    const entities = getState().entities;
    const users = entities.users;
    const user = msg.data.user;

    if (user.id !== users.currentId) {
        dispatch({
            type: UsersTypes.RECEIVED_PROFILES,
            data: {
                [user.id]: user
            }
        }, getState);
    }
}

function handleChannelViewedEvent(msg, dispatch, getState) {
    const state = getState();
    const channels = state.entities.channels;
    const teams = state.entities.teams;
    const users = state.entities.users;

    if (teams.currentId === msg.broadcast.team_id && channels.currentId !== msg.data.channel_id &&
        users.currentId === msg.broadcast.user_id) {
        getChannelHelper(teams.currentId, msg.data.channel_id, dispatch, getState);
    }
}

function handleChannelDeletedEvent(msg, dispatch, getState) {
    const state = getState();
    const channels = state.entities.channels;
    const teams = state.entities.teams;

    if (msg.data.channel_id === channels.currentId) {
        let channelId = '';
        const channel = Object.keys(channels.channels).filter((key) => channels.channels[key].name === Constants.DEFAULT_CHANNEL);

        if (channel.length) {
            channelId = channel[0];
        }

        dispatch({type: ChannelTypes.SELECTED_CHANNEL, data: channelId}, getState);
    }

    if (msg.broadcast.team_id === teams.currentId) {
        dispatch({type: ChannelTypes.RECEIVED_CHANNEL_DELETED, data: msg.data.channel_id}, getState);
        getChannelsAndMembersHelper(teams.currentId, dispatch, getState);
    }
}

function handleDirectAddedEvent(msg, dispatch, getState) {
    const state = getState();
    const teams = state.entities.teams;

    getChannelHelper(teams.currentId, msg.broadcast.channel_id, dispatch, getState);
}

function handlePreferenceChangedEvent(msg, dispatch, getState) {
    const preference = JSON.parse(msg.data.preference);
    dispatch({type: PreferencesTypes.RECEIVED_PREFERENCES, data: [preference]}, getState);

    if (preference.category === Constants.CATEGORY_DIRECT_CHANNEL_SHOW) {
        const state = getState();
        const users = state.entities.users;
        const userId = preference.name;
        const status = users.statuses[userId];

        if (!users.profiles[userId]) {
            getProfilesHelper([userId], dispatch, getState);
        }

        if (status !== Constants.ONLINE) {
            getStatusesHelper([userId], dispatch, getState);
        }
    }
}

function handleStatusChangedEvent(msg, dispatch, getState) {
    dispatch({
        type: UsersTypes.RECEIVED_STATUSES,
        data: {
            [msg.data.user_id]: msg.data.status
        }
    }, getState);
}

// Helpers

function getChannelsAndMembersHelper(teamId, dispatch, getState) {
    Client.getChannels(teamId).then((data) => {
        dispatch({type: ChannelTypes.RECEIVED_CHANNELS, data}, getState);
    });

    Client.getMyChannelMembers(teamId).then((data) => {
        dispatch({type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBERS, data}, getState);
    });
}

function getChannelHelper(teamId, channelId, dispatch, getState) {
    Client.getChannel(teamId, channelId).then((data) => {
        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_CHANNEL,
                data: data.channel
            },
            {
                type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER,
                data: data.member
            }
        ]), getState);
    });
}

function getProfilesHelper(userIds, dispatch, getState) {
    Client.getProfilesByIds(userIds).then((data) => {
        dispatch({type: UsersTypes.RECEIVED_PROFILES, data}, getState);
    });
}

function getStatusesHelper(userIds, dispatch, getState) {
    Client.getStatusesByIds(userIds).then((data) => {
        dispatch({type: UsersTypes.RECEIVED_STATUSES, data}, getState);
    });
}

function getChannelStatsHelper(teamId, channelId, dispatch, getState) {
    Client.getChannelStats(teamId, channelId).then((data) => {
        dispatch({type: ChannelTypes.RECEIVED_CHANNEL_STATS, data}, getState);
    });
}

function updateLastViewedHelper(teamId, channelId, dispatch, getState) {
    Client.updateLastViewedAt(teamId, channelId, false).then(() => {
        dispatch({
            type: ChannelTypes.RECEIVED_LAST_VIEWED,
            channel_id: channelId,
            last_viewed_at: new Date().getTime()
        }, getState);
    });
}

function loadPostsHelper(teamId, channelId, dispatch, getState) {
    const {posts, postsByChannel} = getState().entities.posts;
    const postsArray = postsByChannel[channelId];
    const latestPostId = postsArray[postsArray.length - 1];

    let latestPostTime = 0;
    if (latestPostId) {
        latestPostTime = posts[latestPostId].create_at || 0;
    }

    if (Object.keys(posts).length === 0 || postsArray.length < Constants.POST_CHUNK_SIZE || latestPostTime === 0) {
        Client.getPosts(teamId, channelId, 0, Constants.POST_CHUNK_SIZE).then((data) => {
            getProfilesAndStatusesForPostsHelper(data, dispatch, getState);
            dispatch({
                type: PostsTypes.RECEIVED_POSTS,
                data,
                channelId
            }, getState);
        });
    } else {
        Client.getPostsSince(teamId, channelId, latestPostTime).then((data) => {
            getProfilesAndStatusesForPostsHelper(data, dispatch, getState);
            dispatch({
                type: PostsTypes.RECEIVED_POSTS,
                data,
                channelId
            }, getState);
        });
    }
}

function getProfilesAndStatusesForPostsHelper(list, dispatch, getState) {
    const {profiles, statuses} = getState().entities.users;
    const posts = list.posts;
    const profilesToLoad = [];
    const statusesToLoad = [];

    Object.keys(posts).forEach((key) => {
        const post = posts[key];
        const userId = post.user_id;

        if (!profiles[userId]) {
            profilesToLoad.push(userId);
        }

        if (!statuses[userId]) {
            statusesToLoad.push(userId);
        }
    });

    if (profilesToLoad.length) {
        Client.getProfilesByIds(profilesToLoad).then((data) => {
            dispatch({type: UsersTypes.RECEIVED_PROFILES, data}, getState);
        });
    }

    if (statusesToLoad.length) {
        Client.getStatusesByIds(statusesToLoad).then((data) => {
            dispatch({type: UsersTypes.RECEIVED_STATUSES, data}, getState);
        });
    }
}
