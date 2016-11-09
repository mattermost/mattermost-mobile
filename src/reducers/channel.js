// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ChannelTypes} from 'constants';
import {combineReducers} from 'redux';

export function channels(state = {}, action) {
    switch (action.type) {
    case ChannelTypes.CHANNEL_RECEIVED:
        return {
            ...state,
            [action.channel.id]: action.channel
        };

    case ChannelTypes.CHANNELS_RECEIVED: {
        const nextState = {...state};

        for (const channel of action.channels) {
            nextState[channel.id] = channel;
        }

        return nextState;
    }

    default:
        return state;
    }
}

export function channelIdsByTeamId(state = {}, action) {
    switch (action.type) {
    case ChannelTypes.CHANNEL_RECEIVED: {
        const channel = action.channel;

        return {
            ...state,
            [channel.team_id]: {
                ...state[channel.team_id],
                [channel.id]: channel.id
            }
        };
    }

    case ChannelTypes.CHANNELS_RECEIVED: {
        const nextState = {...state};

        for (const channel of action.channels) {
            nextState[channel.team_id] = {
                ...nextState[channel.team_id],
                [channel.id]: channel.id
            };
        }

        return nextState;
    }

    default:
        return state;
    }
}

export function channelMembers(state = {}, action) {
    switch (action.type) {

    case ChannelTypes.CHANNEL_MEMBER_RECEIVED: {
        const channelMember = action.channelMember;

        return {
            ...state,
            [`${channelMember.channel_id}-${channelMember.user_id}`]: channelMember
        };
    }

    case ChannelTypes.CHANNEL_MEMBERS_RECEIVED: {
        const nextState = {...state};

        for (const channelMember of action.channelMembers) {
            nextState[`${channelMember.channel_id}-${channelMember.user_id}`] = channelMember;
        }

        return nextState;
    }

    default:
        return state;
    }
}

export default combineReducers({

    // A map of channel IDs to channels
    channels,

    // A map of team IDs to pseudo-sets of channelIds
    channelIdsByTeamId,

    // A map of "channelId-userId" to channel members
    channelMembers
});
