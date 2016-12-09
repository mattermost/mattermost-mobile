// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keymirror from 'keymirror';

const TeamTypes = keymirror({
    FETCH_TEAMS_REQUEST: null,
    FETCH_TEAMS_SUCCESS: null,
    FETCH_TEAMS_FAILURE: null,

    CREATE_TEAM_REQUEST: null,
    CREATE_TEAM_SUCCESS: null,
    CREATE_TEAM_FAILURE: null,

    UPDATE_TEAM_REQUEST: null,
    UPDATE_TEAM_SUCCESS: null,
    UPDATE_TEAM_FAILURE: null,

    MY_TEAM_MEMBERS_REQUEST: null,
    MY_TEAM_MEMBERS_SUCCESS: null,
    MY_TEAM_MEMBERS_FAILURE: null,

    TEAM_LISTINGS_REQUEST: null,
    TEAM_LISTINGS_SUCCESS: null,
    TEAM_LISTINGS_FAILURE: null,

    TEAM_MEMBERS_REQUEST: null,
    TEAM_MEMBERS_SUCCESS: null,
    TEAM_MEMBERS_FAILURE: null,

    TEAM_STATS_REQUEST: null,
    TEAM_STATS_SUCCESS: null,
    TEAM_STATS_FAILURE: null,

    ADD_TEAM_MEMBER_REQUEST: null,
    ADD_TEAM_MEMBER_SUCCESS: null,
    ADD_TEAM_MEMBER_FAILURE: null,

    REMOVE_TEAM_MEMBER_REQUEST: null,
    REMOVE_TEAM_MEMBER_SUCCESS: null,
    REMOVE_TEAM_MEMBER_FAILURE: null,

    CREATED_TEAM: null,
    SELECT_TEAM: null,
    UPDATED_TEAM: null,
    RECEIVED_ALL_TEAMS: null,
    RECEIVED_MY_TEAM_MEMBERS: null,
    RECEIVED_TEAM_LISTINGS: null,
    RECEIVED_MEMBERS_IN_TEAM: null,
    RECEIVED_MEMBER_IN_TEAM: null,
    REMOVE_MEMBER_FROM_TEAM: null,
    RECEIVED_TEAM_STATS: null,
    LEAVE_TEAM: null
});

export default TeamTypes;
