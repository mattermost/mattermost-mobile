// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

export const getTeamsFromTeamMembers = createSelector(
    (members) => members,
    (members) => {
        return members.map((m) => {
            return m.teams[0];
        });
    }
);
