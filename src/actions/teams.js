// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindClientFunc} from './helpers.js';
import Client from 'client';
import {TeamsTypes} from 'constants';

export function selectTeam(team) {
    return async (dispatch, getState) => {
        dispatch({
            type: TeamsTypes.SELECT_TEAM,
            teamId: team.id
        }, getState);
    };
}

export function fetchTeams() {
    return bindClientFunc(
        Client.getAllTeams,
        TeamsTypes.FETCH_TEAMS_REQUEST,
        [TeamsTypes.RECEIVED_ALL_TEAMS, TeamsTypes.FETCH_TEAMS_SUCCESS],
        TeamsTypes.FETCH_TEAMS_FAILURE
    );
}
