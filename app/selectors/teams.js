// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

import {getMyTeams} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

export const getMySortedTeams = createSelector(
    getMyTeams,
    getCurrentUser,
    (teams, currentUser) => {
        const locale = currentUser.locale;

        return teams.sort((a, b) => {
            if (a.display_name !== b.display_name) {
                return a.display_name.toLowerCase().localeCompare(b.display_name.toLowerCase(), locale, {numeric: true});
            }

            return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), locale, {numeric: true});
        });
    }
);
