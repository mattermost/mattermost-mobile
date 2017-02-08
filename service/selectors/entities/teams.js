// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

import {getCurrentUrl} from './general';

export function getCurrentTeamId(state) {
    return state.entities.teams.currentId;
}

export function getTeams(state) {
    return state.entities.teams.teams;
}

export function getTeamStats(state) {
    return state.entities.teams.stats;
}

export function getTeamMemberships(state) {
    return state.entities.teams.myMembers;
}

export const getCurrentTeam = createSelector(
    getTeams,
    getCurrentTeamId,
    (teams, currentTeamId) => {
        return teams[currentTeamId];
    }
);

export const getCurrentTeamMembership = createSelector(
    getCurrentTeamId,
    getTeamMemberships,
    (currentTeamId, teamMemberships) => {
        return teamMemberships[currentTeamId];
    }
);

export const getCurrentTeamUrl = createSelector(
    getCurrentUrl,
    getCurrentTeam,
    (currentUrl, currentTeam) => {
        return `${currentUrl}/${currentTeam.name}`;
    }
);

export const getCurrentTeamStats = createSelector(
    getCurrentTeamId,
    getTeamStats,
    (currentTeamId, teamStats) => {
        return teamStats[currentTeamId];
    }
);
