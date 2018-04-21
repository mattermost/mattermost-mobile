// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {TeamTypes} from 'mattermost-redux/action_types';

import {ViewTypes} from 'app/constants';

function lastTeamId(state = '', action) {
    switch (action.type) {
    case TeamTypes.SELECT_TEAM:
        return action.data;
    default:
        return state;
    }
}

function lastChannelForTeam(state = {}, action) {
    switch (action.type) {
    case ViewTypes.SET_LAST_CHANNEL_FOR_TEAM: {
        const team = state[action.teamId];
        const channelIds = [];

        if (!action.channelId) {
            return state;
        }

        if (team) {
            channelIds.push(...team);
            const index = channelIds.indexOf(action.channelId);
            if (index === -1) {
                channelIds.unshift(action.channelId);
                channelIds.slice(0, 5);
            } else {
                channelIds.splice(index, 1);
                channelIds.unshift(action.channelId);
            }
        } else {
            channelIds.push(action.channelId);
        }

        return {
            ...state,
            [action.teamId]: channelIds,
        };
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
