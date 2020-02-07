// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';
import {ChannelTypes, TeamTypes} from 'mattermost-redux/action_types';

import {ViewTypes} from 'app/constants';

function lastTeamId(state = '', action) {
    switch (action.type) {
    case TeamTypes.SELECT_TEAM:
        return action.data;
    default:
        return state;
    }
}

function setLastChannelForTeam(state, teamId, channelId) {
    const team = state[teamId];
    const channelIds = [];

    if (!channelId) {
        return state;
    }

    if (team) {
        channelIds.push(...team);
        const index = channelIds.indexOf(channelId);
        if (index === -1) {
            channelIds.unshift(channelId);
            channelIds.slice(0, 5);
        } else {
            channelIds.splice(index, 1);
            channelIds.unshift(channelId);
        }
    } else {
        channelIds.push(channelId);
    }

    return {
        ...state,
        [teamId]: channelIds,
    };
}

function lastChannelForTeam(state = {}, action) {
    switch (action.type) {
    case ChannelTypes.SELECT_CHANNEL: {
        return setLastChannelForTeam(state, action.extra.teamId, action.data);
    }

    case ViewTypes.REMOVE_LAST_CHANNEL_FOR_TEAM: {
        const {data} = action;
        const team = state[data.teamId];

        if (!data.channelId) {
            return state;
        }

        if (team) {
            const channelIds = [...team];
            const index = channelIds.indexOf(data.channelId);
            if (index !== -1) {
                channelIds.splice(index, 1);
            }

            return {
                ...state,
                [data.teamId]: channelIds,
            };
        }

        return state;
    }
    default:
        return state;
    }
}

export default combineReducers({
    lastTeamId,
    lastChannelForTeam,
});
