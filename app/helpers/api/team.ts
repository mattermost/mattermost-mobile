// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DEFAULT_LOCALE} from '@i18n';

export const selectDefaultTeam = (teams: Team[], locale = DEFAULT_LOCALE, userTeamOrderPreference = '', primaryTeam = '') => {
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

export const sortTeamsByUserPreference = (teams: Team[], locale: string, teamsOrder = '') => {
    if (!teams.length) {
        return [];
    }

    const teamsOrderList = teamsOrder.split(',').filter((t) => t);

    if (!teamsOrderList.length) {
        return [...teams].sort(sortTeamsWithLocale(locale));
    }

    const customSortedTeams = teams.filter((team) => {
        if (team !== null) {
            return teamsOrderList.includes(team.id);
        }
        return false;
    }).sort((a, b) => {
        return teamsOrderList.indexOf(a.id) - teamsOrderList.indexOf(b.id);
    });

    const otherTeams = teams.filter((team) => {
        if (team !== null) {
            return !teamsOrderList.includes(team.id);
        }
        return false;
    }).sort(sortTeamsWithLocale(locale));

    return [...customSortedTeams, ...otherTeams];
};

export function sortTeamsWithLocale(locale: string): (a: Team, b: Team) => number {
    return (a: Team, b: Team): number => {
        if (a.display_name !== b.display_name) {
            return a.display_name.toLowerCase().localeCompare(b.display_name.toLowerCase(), locale, {numeric: true});
        }

        return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), locale, {numeric: true});
    };
}
