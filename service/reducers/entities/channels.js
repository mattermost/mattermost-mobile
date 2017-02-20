// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ChannelTypes, UsersTypes} from 'service/constants';
import {combineReducers} from 'redux';

function currentId(state = '', action) {
    switch (action.type) {
    case ChannelTypes.SELECT_CHANNEL:
        return action.data;
    case UsersTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}

function channels(state = {}, action) {
    const nextState = {...state};

    switch (action.type) {
    case ChannelTypes.RECEIVED_CHANNEL:
        return {
            ...state,
            [action.data.id]: action.data
        };

    case ChannelTypes.RECEIVED_CHANNELS:
    case ChannelTypes.RECEIVED_MORE_CHANNELS: {
        for (const channel of action.data) {
            nextState[channel.id] = channel;
        }
        return nextState;
    }
    case ChannelTypes.RECEIVED_CHANNEL_DELETED:
        Reflect.deleteProperty(nextState, action.data);
        return nextState;
    case ChannelTypes.RECEIVED_LAST_VIEWED: {
        const channelId = action.data.channel_id;
        const lastUpdatedAt = action.data.last_viewed_at;
        return {
            ...state,
            [channelId]: {
                ...state[channelId],
                extra_update_at: lastUpdatedAt
            }
        };
    }
    case ChannelTypes.UPDATE_CHANNEL_HEADER: {
        const {channelId, header} = action.data;
        return {
            ...state,
            [channelId]: {
                ...state[channelId],
                header
            }
        };
    }
    case ChannelTypes.UPDATE_CHANNEL_PURPOSE: {
        const {channelId, purpose} = action.data;
        return {
            ...state,
            [channelId]: {
                ...state[channelId],
                purpose
            }
        };
    }
    case UsersTypes.LOGOUT_SUCCESS:
        return {};

    default:
        return state;
    }
}

function myMembers(state = {}, action) {
    const nextState = {...state};

    switch (action.type) {
    case ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER: {
        const channelMember = action.data;
        return {
            ...state,
            [channelMember.channel_id]: channelMember
        };
    }
    case ChannelTypes.RECEIVED_MY_CHANNEL_MEMBERS: {
        for (const cm of action.data) {
            nextState[cm.channel_id] = cm;
        }
        return nextState;
    }
    case ChannelTypes.RECEIVED_CHANNEL_PROPS: {
        const member = {...state[action.data.channel_id]};
        member.notify_props = action.data.notifyProps;

        return {
            ...state,
            [action.data.channel_id]: member
        };
    }
    case ChannelTypes.RECEIVED_LAST_VIEWED: {
        const member = {...state[action.data.channel_id]};
        member.last_viewed_at = action.data.last_viewed_at;
        member.msg_count = action.data.total_msg_count;
        member.mention_count = 0;

        return {
            ...state,
            [action.data.channel_id]: member
        };
    }
    case ChannelTypes.LEAVE_CHANNEL:
    case ChannelTypes.RECEIVED_CHANNEL_DELETED:
        Reflect.deleteProperty(nextState, action.data);
        return nextState;

    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function stats(state = {}, action) {
    switch (action.type) {
    case ChannelTypes.RECEIVED_CHANNEL_STATS: {
        const nextState = {...state};
        const stat = action.data;
        nextState[stat.channel_id] = stat;

        return nextState;
    }
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

export default combineReducers({

    // the current selected channel
    currentId,

    // object where every key is the channel id and has and object with the channel detail
    channels,

    //object where every key is the channel id and has and object with the channel members detail
    myMembers,

    // object where every key is the channel id and has an object with the channel stats
    stats
});
