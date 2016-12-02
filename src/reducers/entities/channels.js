// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ChannelTypes, UsersTypes} from 'constants';
import {combineReducers} from 'redux';

function currentId(state = '', action) {
    switch (action.type) {
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
            [action.channel.id]: action.channel
        };

    case ChannelTypes.RECEIVED_CHANNELS:
        for (const channel of action.channels) {
            nextState[channel.id] = channel;
        }
        return nextState;

    case ChannelTypes.LEAVE_CHANNEL:
    case ChannelTypes.RECEIVED_CHANNEL_DELETED:
        Reflect.deleteProperty(nextState, action.channel_id);
        return nextState;

    case UsersTypes.LOGOUT_SUCCESS:
        return {};

    default:
        return state;
    }
}

function myMembers(state = {}, action) {
    const nextState = {...state};
    let member;
    switch (action.type) {
    case ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER:
        const channelMember = action.channelMember;
        return {
            ...state,
            [channelMember.channel_id]: channelMember
        };

    case ChannelTypes.RECEIVED_MY_CHANNEL_MEMBERS:
        for (const cm of action.channelMembers) {
            nextState[cm.channel_id] = cm;
        }
        return nextState;

    case ChannelTypes.RECEIVED_CHANNEL_PROPS:
        member = {...state[action.channel_id]};
        member.notify_props = action.props;

        return {
            ...state,
            [action.channel_id]: member
        };

    case ChannelTypes.RECEIVED_LAST_VIEWED:
        member = {...state[action.channel_id]};
        member.last_viewed_at = action.last_viewed_at;

        return {
            ...state,
            [action.channel_id]: member
        };

    case ChannelTypes.LEAVE_CHANNEL:
    case ChannelTypes.RECEIVED_CHANNEL_DELETED:
        Reflect.deleteProperty(nextState, action.channel_id);
        return nextState;

    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function moreChannels(state = {}, action) {
    const nextState = {...state};
    switch (action.type) {
    case ChannelTypes.RECEIVED_MORE_CHANNELS:
        for (const channel of action.channels) {
            nextState[channel.id] = channel;
        }
        return nextState;

    case ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER:
        const channelMember = action.channelMember;
        Reflect.deleteProperty(nextState, channelMember.channel_id);
        return nextState;

    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function stats(state = {}, action) {
    switch (action.type) {
    case ChannelTypes.RECEIVED_CHANNEL_STATS:
        const nextState = {...state};
        const stat = action.stat;
        nextState[stat.channel_id] = stat;

        return nextState;

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

    // object where every key is the channel id and has a object with the channel detail where the user is not a current member
    moreChannels,

    // object where every key is the team id and has an object with the team stats
    stats
});
