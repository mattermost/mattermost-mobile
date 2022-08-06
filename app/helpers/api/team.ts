// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DEFAULT_LOCALE} from '@i18n';

import type TeamModel from '@typings/database/models/servers/team';

export const selectDefaultTeam = (teams: Array<Team | TeamModel>, locale = DEFAULT_LOCALE, userTeamOrderPreference = '', primaryTeam = '') => {
    let defaultTeam;

    if (!teams.length) {
        return defaultTeam;
    }

    if (primaryTeam) {
        defaultTeam = teams.find((t) => t.name.toLowerCase() === primaryTeam.toLowerCase());
    }

    if (!defaultTeam) {
        defaultTeam = sortTeamsByUserPreference(teams, locale, userTeamOrderPreference)[0];
    }

    return defaultTeam;
};

export const sortTeamsByUserPreference = (teams: Array<Team | TeamModel>, locale: string, teamsOrder = '') => {
    if (!teams.length) {
        return [];
    }

    const teamsOrderArray = teamsOrder.split(',').filter((t) => t);
    const teamsOrderList = new Set(teamsOrderArray);

    if (!teamsOrderList.size) {
        return [...teams].sort(sortTeamsWithLocale(locale));
    }

    const customSortedTeams = teams.filter((team) => {
        if (team !== null) {
            return teamsOrderList.has(team.id);
        }
        return false;
    }).sort((a, b) => {
        return teamsOrderArray.indexOf(a.id) - teamsOrderArray.indexOf(b.id);
    });

    const otherTeams = teams.filter((team) => {
        if (team !== null) {
            return !teamsOrderList.has(team.id);
        }
        return false;
    }).sort(sortTeamsWithLocale(locale));

    return [...customSortedTeams, ...otherTeams];
};

export function sortTeamsWithLocale(locale: string): (a: Team | TeamModel, b: Team | TeamModel) => number {
    return (a, b): number => {
        const aDisplayName = 'display_name' in a ? a.display_name : a.displayName;
        const bDisplayName = 'display_name' in b ? b.display_name : b.displayName;
        if (aDisplayName !== bDisplayName) {
            return aDisplayName.toLowerCase().localeCompare(bDisplayName.toLowerCase(), locale, {numeric: true});
        }

        return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), locale, {numeric: true});
    };
}
