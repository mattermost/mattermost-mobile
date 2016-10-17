// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindClientFunc} from './helpers.js';
import Client from 'client/client_instance';
import {TeamsTypes as types} from 'constants';

export function selectTeam(team) {
    Client.setTeamId(team.id);
    return {
        type: types.SELECT_TEAM,
        team_id: team.id
    };
}

export function fetchTeams() {
    return bindClientFunc(
        Client.fetchTeams,
        types.FETCH_TEAMS_REQUEST,
        types.FETCH_TEAMS_SUCCESS,
        types.FETCH_TEAMS_FAILURE
    );
}
