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
    switch (action.type) {
    case ChannelTypes.RECEIVED_CHANNEL:
        return {
            ...state,
            [action.channels.id]: action.channels
        };

    case ChannelTypes.RECEIVED_CHANNELS:
        const nextState = {...state};

        for (const channel of action.channels) {
            nextState[channel.id] = channel;
        }

        return nextState;
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function myMembers(state = {}, action) {
    switch (action.type) {

    case ChannelTypes.RECEIVED_MY_CHANNNEL_MEMBER:
        const channelMember = action.channelMember;

        return {
            ...state,
            [channelMember.channel_id]: channelMember
        };

    case ChannelTypes.RECEIVED_MY_CHANNNEL_MEMBERS:
        const nextState = {...state};

        for (const cm of action.channelMembers) {
            nextState[cm.channel_id] = cm;
        }

        return nextState;

    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function moreChannels(state = {}, action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function stats(state = {}, action) {
    switch (action.type) {
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
