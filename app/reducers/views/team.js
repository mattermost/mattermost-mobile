// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {TeamsTypes} from 'mattermost-redux/constants';

import {ViewTypes} from 'app/constants';

function lastTeamId(state = '', action) {
    switch (action.type) {
    case TeamsTypes.SELECT_TEAM:
        return action.data;
    default:
        return state;
    }
}

function lastChannelForTeam(state = {}, action) {
    switch (action.type) {
    case ViewTypes.SET_LAST_CHANNEL_FOR_TEAM:
        return {
            ...state,
            [action.teamId]: action.channelId
        };
    default:
        return state;
    }
}

export default combineReducers({
    lastTeamId,
    lastChannelForTeam
});
