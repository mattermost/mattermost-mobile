// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {
    Constants,
    ChannelTypes,
    Preferences,
    PreferencesTypes,
    UsersTypes
} from 'service/constants';
import {forceLogoutIfNecessary} from './helpers';
import {batchActions} from 'redux-batched-actions';
import Client from 'service/client';

export function selectChannel(channelId) {
    return async (dispatch, getState) => {
        dispatch({
            type: ChannelTypes.SELECT_CHANNEL,
            data: channelId
        }, getState);
    };
}

export function createChannel(channel, userId) {
    return async (dispatch, getState) => {
        dispatch(batchActions([
            {
                type: ChannelTypes.CREATE_CHANNEL_REQUEST
            },
            {
                type: ChannelTypes.CHANNEL_MEMBERS_REQUEST
            }
        ]), getState);

        let created;
        try {
            created = await Client.createChannel(channel);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch(batchActions([
                {
                    type: ChannelTypes.CREATE_CHANNEL_FAILURE,
                    error
                },
                {
                    type: ChannelTypes.CHANNEL_MEMBERS_FAILURE,
                    error
                }
            ]), getState);
            return;
        }

        const member = {
            channel_id: created.id,
            user_id: userId,
            roles: `${Constants.CHANNEL_USER_ROLE} ${Constants.CHANNEL_ADMIN_ROLE}`,
            last_viewed_at: 0,
            msg_count: 0,
            mention_count: 0,
            notify_props: {desktop: 'default', mark_unread: 'all'},
            last_update_at: created.create_at
        };

        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_CHANNEL,
                data: created
            },
            {
                type: ChannelTypes.CREATE_CHANNEL_SUCCESS
            },
            {
                type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER,
                data: member
            },
            {
                type: ChannelTypes.CHANNEL_MEMBERS_SUCCESS
            }
        ]), getState);
    };
}

export function createDirectChannel(teamId, userId, otherUserId) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.CREATE_CHANNEL_REQUEST}, getState);

        let created;
        try {
            created = await Client.createDirectChannel(teamId, otherUserId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch(batchActions([
                {
                    type: ChannelTypes.CREATE_CHANNEL_FAILURE,
                    error
                },
                {
                    type: ChannelTypes.CHANNEL_MEMBERS_FAILURE,
                    error
                }
            ]), getState);
            return;
        }

        const member = {
            channel_id: created.id,
            user_id: userId,
            roles: `${Constants.CHANNEL_USER_ROLE} ${Constants.CHANNEL_ADMIN_ROLE}`,
            last_viewed_at: 0,
            msg_count: 0,
            mention_count: 0,
            notify_props: {desktop: 'default', mark_unread: 'all'},
            last_update_at: created.create_at
        };

        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_CHANNEL,
                data: created
            },
            {
                type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER,
                data: member
            },
            {
                type: PreferencesTypes.RECEIVED_PREFERENCES,
                data: [{category: Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, name: otherUserId, value: 'true'}]
            },
            {
                type: ChannelTypes.CREATE_CHANNEL_SUCCESS
            }
        ]), getState);
    };
}

export function updateChannel(channel) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.UPDATE_CHANNEL_REQUEST}, getState);

        let updated;
        try {
            updated = await Client.updateChannel(channel);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.UPDATE_CHANNEL_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_CHANNEL,
                data: updated
            },
            {
                type: ChannelTypes.UPDATE_CHANNEL_SUCCESS
            }
        ]), getState);
    };
}

export function updateChannelNotifyProps(userId, teamId, channelId, props) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.NOTIFY_PROPS_REQUEST}, getState);

        const data = {
            user_id: userId,
            channel_id: channelId,
            ...props
        };

        let notifyProps;
        try {
            notifyProps = await Client.updateChannelNotifyProps(teamId, data);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.NOTIFY_PROPS_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_CHANNEL_PROPS,
                data: {
                    channel_id: channelId,
                    notifyProps
                }
            },
            {
                type: ChannelTypes.NOTIFY_PROPS_SUCCESS
            }
        ]), getState);
    };
}

export function getChannel(teamId, channelId) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.CHANNEL_REQUEST}, getState);

        let data;
        try {
            data = await Client.getChannel(teamId, channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.CHANNELS_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_CHANNEL,
                data: data.channel
            },
            {
                type: ChannelTypes.CHANNEL_SUCCESS
            },
            {
                type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER,
                data: data.member
            }
        ]), getState);
    };
}

export function fetchMyChannelsAndMembers(teamId) {
    return async (dispatch, getState) => {
        dispatch(batchActions([
            {
                type: ChannelTypes.CHANNELS_REQUEST
            },
            {
                type: ChannelTypes.CHANNEL_MEMBERS_REQUEST
            }
        ]), getState);

        let channels;
        let channelMembers;
        try {
            const channelsRequest = Client.getChannels(teamId);
            const channelMembersRequest = Client.getMyChannelMembers(teamId);

            channels = await channelsRequest;
            channelMembers = await channelMembersRequest;
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch(batchActions([
                {
                    type: ChannelTypes.CHANNELS_FAILURE,
                    error
                },
                {
                    type: ChannelTypes.CHANNEL_MEMBERS_FAILURE,
                    error
                }
            ]), getState);
            return;
        }

        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_CHANNELS,
                data: channels
            },
            {
                type: ChannelTypes.CHANNELS_SUCCESS
            },
            {
                type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBERS,
                data: channelMembers
            },
            {
                type: ChannelTypes.CHANNEL_MEMBERS_SUCCESS
            }
        ]), getState);
    };
}

export function getMyChannelMembers(teamId) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.CHANNEL_MEMBERS_REQUEST}, getState);

        let channelMembers;
        try {
            const channelMembersRequest = Client.getMyChannelMembers(teamId);

            channelMembers = await channelMembersRequest;
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.CHANNEL_MEMBERS_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBERS,
                data: channelMembers
            },
            {
                type: ChannelTypes.CHANNEL_MEMBERS_SUCCESS
            }
        ]), getState);
    };
}

export function leaveChannel(teamId, channelId) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.LEAVE_CHANNEL_REQUEST}, getState);

        try {
            await Client.leaveChannel(teamId, channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.LEAVE_CHANNEL_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: ChannelTypes.LEAVE_CHANNEL,
                data: channelId
            },
            {
                type: ChannelTypes.LEAVE_CHANNEL_SUCCESS
            }
        ]), getState);
    };
}

export function joinChannel(userId, teamId, channelId, channelName) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.JOIN_CHANNEL_REQUEST}, getState);

        let channel;
        try {
            if (channelId) {
                channel = await Client.joinChannel(teamId, channelId);
            } else if (channelName) {
                channel = await Client.joinChannelByName(teamId, channelName);
            }
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.JOIN_CHANNEL_FAILURE, error}, getState);
            return;
        }

        const channelMember = {
            channel_id: channel.id,
            user_id: userId,
            roles: `${Constants.CHANNEL_USER_ROLE}`,
            last_viewed_at: 0,
            msg_count: 0,
            mention_count: 0,
            notify_props: {desktop: 'default', mark_unread: 'all'},
            last_update_at: new Date().getTime()
        };

        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_CHANNEL,
                data: channel
            },
            {
                type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER,
                data: channelMember
            },
            {
                type: ChannelTypes.JOIN_CHANNEL_SUCCESS
            }
        ]), getState);
    };
}

export function deleteChannel(teamId, channelId) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.DELETE_CHANNEL_REQUEST}, getState);

        try {
            await Client.deleteChannel(teamId, channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.DELETE_CHANNEL_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_CHANNEL_DELETED,
                data: channelId
            },
            {
                type: ChannelTypes.DELETE_CHANNEL_SUCCESS
            }
        ]), getState);
    };
}

export function viewChannel(teamId, channelId, prevChannelId = '') {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.UPDATE_LAST_VIEWED_REQUEST}, getState);

        try {
            // this API should return the timestamp that was set
            await Client.viewChannel(teamId, channelId, prevChannelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.UPDATE_LAST_VIEWED_FAILURE, error}, getState);
            return;
        }

        const {channels} = getState().entities.channels;

        const actions = [{
            type: ChannelTypes.RECEIVED_LAST_VIEWED,
            data: {
                channel_id: channelId,
                last_viewed_at: new Date().getTime(),
                total_msg_count: channels[channelId].total_msg_count
            }
        }];

        if (prevChannelId) {
            actions.push({
                type: ChannelTypes.RECEIVED_LAST_VIEWED,
                data: {
                    channel_id: prevChannelId,
                    last_viewed_at: new Date().getTime(),
                    total_msg_count: channels[prevChannelId].total_msg_count
                }
            });
        }

        dispatch(batchActions([
            ...actions,
            {
                type: ChannelTypes.UPDATE_LAST_VIEWED_SUCCESS
            }
        ]), getState);
    };
}

export function getMoreChannels(teamId, offset, limit = Constants.CHANNELS_CHUNK_SIZE) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.MORE_CHANNELS_REQUEST}, getState);

        let channels;
        try {
            channels = await Client.getMoreChannels(teamId, offset, limit);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.MORE_CHANNELS_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_MORE_CHANNELS,
                data: await channels
            },
            {
                type: ChannelTypes.MORE_CHANNELS_SUCCESS
            }
        ]), getState);
    };
}

export function getChannelStats(teamId, channelId) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.CHANNEL_STATS_REQUEST}, getState);

        let stat;
        try {
            stat = await Client.getChannelStats(teamId, channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.CHANNEL_STATS_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_CHANNEL_STATS,
                data: stat
            },
            {
                type: ChannelTypes.CHANNEL_STATS_SUCCESS
            }
        ]), getState);
    };
}

export function addChannelMember(teamId, channelId, userId) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.ADD_CHANNEL_MEMBER_REQUEST}, getState);

        try {
            await Client.addChannelMember(teamId, channelId, userId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.ADD_CHANNEL_MEMBER_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: UsersTypes.RECEIVED_PROFILE_IN_CHANNEL,
                data: {user_id: userId},
                id: channelId
            },
            {
                type: ChannelTypes.ADD_CHANNEL_MEMBER_SUCCESS
            }
        ]), getState);
    };
}

export function removeChannelMember(teamId, channelId, userId) {
    return async (dispatch, getState) => {
        dispatch({type: ChannelTypes.REMOVE_CHANNEL_MEMBER_REQUEST}, getState);

        try {
            await Client.removeChannelMember(teamId, channelId, userId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: ChannelTypes.REMOVE_CHANNEL_MEMBER_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: UsersTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL,
                data: {user_id: userId},
                id: channelId
            },
            {
                type: ChannelTypes.REMOVE_CHANNEL_MEMBER_SUCCESS
            }
        ]), getState);
    };
}

export function updateChannelHeader(channelId, header) {
    return async (dispatch, getState) => {
        dispatch({
            type: ChannelTypes.UPDATE_CHANNEL_HEADER,
            data: {
                channelId,
                header
            }
        }, getState);
    };
}

export function updateChannelPurpose(channelId, purpose) {
    return async (dispatch, getState) => {
        dispatch({
            type: ChannelTypes.UPDATE_CHANNEL_PURPOSE,
            data: {
                channelId,
                purpose
            }
        }, getState);
    };
}

export default {
    selectChannel,
    createChannel,
    createDirectChannel,
    updateChannel,
    updateChannelNotifyProps,
    getChannel,
    fetchMyChannelsAndMembers,
    getMyChannelMembers,
    leaveChannel,
    joinChannel,
    deleteChannel,
    viewChannel,
    getMoreChannels,
    getChannelStats,
    addChannelMember,
    removeChannelMember,
    updateChannelHeader,
    updateChannelPurpose
};
