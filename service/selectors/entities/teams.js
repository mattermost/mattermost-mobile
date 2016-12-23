// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

export function getCurrentTeamId(state) {
    return state.entities.teams.currentId;
}

export function getTeams(state) {
    return state.entities.teams.teams;
}

export const getCurrentTeam = createSelector(
    getTeams,
    getCurrentTeamId,
    (teams, currentTeamId) => {
        return teams[currentTeamId];
    }
);

