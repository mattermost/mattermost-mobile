// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindClientFunc} from './helpers.js';
import Client from 'client/client_instance';
import {TeamsTypes} from 'constants';

export function selectTeam(team) {
    Client.setTeamId(team.id);
    return {
        type: TeamsTypes.SELECT_TEAM,
        teamId: team.id
    };
}

export function fetchTeams() {
    return bindClientFunc(
        Client.getAllTeams,
        TeamsTypes.FETCH_TEAMS_REQUEST,
        TeamsTypes.FETCH_TEAMS_SUCCESS,
        TeamsTypes.FETCH_TEAMS_FAILURE
    );
}
