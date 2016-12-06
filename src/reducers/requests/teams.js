// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handleRequest, initialRequestState} from './helpers';
import {TeamsTypes} from 'constants';

import {combineReducers} from 'redux';

function allTeams(state = initialRequestState(), action) {
    return handleRequest(
        TeamsTypes.FETCH_TEAMS_REQUEST,
        TeamsTypes.FETCH_TEAMS_SUCCESS,
        TeamsTypes.FETCH_TEAMS_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    allTeams
});
