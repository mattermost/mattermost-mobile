// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
// @flow

import {sortTeamsByUserPreference} from '@mm-redux/utils/team_utils';

export function selectFirstAvailableTeam(teams, locale, teamsOrder = '', primaryTeamName) {
    let defaultTeam;
    if (primaryTeamName) {
        defaultTeam = teams.find((t) => t?.name === primaryTeamName.toLowerCase());
    }

    if (!defaultTeam) {
        defaultTeam = sortTeamsByUserPreference(teams, locale, teamsOrder)[0];
    }

    return defaultTeam;
}
