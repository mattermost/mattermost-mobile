// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
// @flow

import type {Team} from 'mattermost-redux/types/teams';

export function selectFirstAvailableTeam(teams: Array<Team>, primaryTeam: ?string): ?Team {
    let defaultTeam;
    if (primaryTeam) {
        defaultTeam = teams.find((t) => t.name === primaryTeam.toLowerCase());
    }

    if (!defaultTeam) {
        defaultTeam = Object.values(teams).sort((a, b) => a.display_name.localeCompare(b.display_name))[0];
    }

    return defaultTeam;
}
