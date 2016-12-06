// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keymirror from 'keymirror';

const TeamTypes = keymirror({
    FETCH_TEAMS_REQUEST: null,
    FETCH_TEAMS_SUCCESS: null,
    FETCH_TEAMS_FAILURE: null,

    CREATED_TEAM: null,
    SELECT_TEAM: null,
    UPDATED_TEAM: null,
    RECEIVED_ALL_TEAMS: null,
    RECEIVED_MY_TEAM_MEMBERS: null,
    RECEIVED_TEAM_LISTINGS: null,
    RECEIVED_MEMBERS_IN_TEAM: null,
    RECEIVED_TEAM_STATS: null,
    LEAVE_TEAM: null
});

export default TeamTypes;
