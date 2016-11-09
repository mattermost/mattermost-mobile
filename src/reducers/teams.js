// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {TeamsTypes, LogoutTypes} from 'constants';

export const initState = {
    status: 'not fetched',
    error: null,
    data: {},
    currentTeamId: null
};

export default function reduceTeams(state = initState, action) {
    switch (action.type) {

    case TeamsTypes.SELECT_TEAM:
        return {
            ...state,
            currentTeamId: action.teamId
        };

    case TeamsTypes.FETCH_TEAMS_REQUEST:
        return {
            ...state,
            status: 'fetching',
            error: null
        };
    case TeamsTypes.FETCH_TEAMS_SUCCESS:
        return {
            ...state,
            status: 'fetched',
            data: action.data
        };
    case TeamsTypes.FETCH_TEAMS_FAILURE:
        return {
            ...state,
            status: 'failed',
            error: action.error
        };

    case LogoutTypes.LOGOUT_SUCCESS:
        return initState;
    default:
        return state;
    }
}
