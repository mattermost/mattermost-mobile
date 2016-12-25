// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'service/client';
import {batchActions} from 'redux-batched-actions';
import {Constants, TeamsTypes} from 'service/constants';
import {bindClientFunc, forceLogoutIfNecessary} from './helpers';
import {getProfilesByIds, getStatusesByIds} from './users';

async function getProfilesAndStatusesForMembers(userIds, dispatch, getState) {
    const {profiles, statuses} = getState().entities.users;
    const profilesToLoad = [];
    const statusesToLoad = [];

    userIds.forEach((userId) => {
        if (!profiles[userId]) {
            profilesToLoad.push(userId);
        }

        if (!statuses[userId]) {
            statusesToLoad.push(userId);
        }
    });

    if (profilesToLoad.length) {
        await getProfilesByIds(profilesToLoad)(dispatch, getState);
    }

    if (statusesToLoad.length) {
        await getStatusesByIds(statusesToLoad)(dispatch, getState);
    }
}

export function selectTeam(team) {
    return async (dispatch, getState) => {
        dispatch({
            type: TeamsTypes.SELECT_TEAM,
            data: team.id
        }, getState);
    };
}

export function fetchTeams() {
    return bindClientFunc(
        Client.getAllTeams,
        TeamsTypes.FETCH_TEAMS_REQUEST,
        [TeamsTypes.RECEIVED_ALL_TEAMS, TeamsTypes.FETCH_TEAMS_SUCCESS],
        TeamsTypes.FETCH_TEAMS_FAILURE
    );
}

export function getAllTeamListings() {
    return bindClientFunc(
        Client.getAllTeamListings,
        TeamsTypes.TEAM_LISTINGS_REQUEST,
        [TeamsTypes.RECEIVED_TEAM_LISTINGS, TeamsTypes.TEAM_LISTINGS_SUCCESS],
        TeamsTypes.TEAM_LISTINGS_FAILURE
    );
}

export function createTeam(userId, team) {
    return async (dispatch, getState) => {
        dispatch({type: TeamsTypes.CREATE_TEAM_REQUEST}, getState);

        let created;
        try {
            created = await Client.createTeam(team);
        } catch (err) {
            forceLogoutIfNecessary(err, dispatch);
            dispatch({type: TeamsTypes.CREATE_TEAM_FAILURE, error: err}, getState);
            return;
        }

        const member = {
            team_id: created.id,
            user_id: userId,
            roles: `${Constants.TEAM_ADMIN_ROLE} ${Constants.TEAM_USER_ROLE}`,
            delete_at: 0,
            msg_count: 0,
            mention_count: 0
        };

        dispatch(batchActions([
            {
                type: TeamsTypes.CREATED_TEAM,
                data: created
            },
            {
                type: TeamsTypes.RECEIVED_MY_TEAM_MEMBERS,
                data: [member]
            },
            {
                type: TeamsTypes.SELECT_TEAM,
                data: created.id
            },
            {
                type: TeamsTypes.CREATE_TEAM_SUCCESS
            }
        ]), getState);
    };
}

export function updateTeam(team) {
    return bindClientFunc(
        Client.updateTeam,
        TeamsTypes.UPDATE_TEAM_REQUEST,
        [TeamsTypes.UPDATED_TEAM, TeamsTypes.UPDATE_TEAM_SUCCESS],
        TeamsTypes.UPDATE_TEAM_FAILURE,
        team
    );
}

export function getMyTeamMembers() {
    return bindClientFunc(
        Client.getMyTeamMembers,
        TeamsTypes.MY_TEAM_MEMBERS_REQUEST,
        [TeamsTypes.RECEIVED_MY_TEAM_MEMBERS, TeamsTypes.MY_TEAM_MEMBERS_SUCCESS],
        TeamsTypes.MY_TEAM_MEMBERS_FAILURE
    );
}

export function getTeamMember(teamId, userId) {
    return async (dispatch, getState) => {
        dispatch({type: TeamsTypes.TEAM_MEMBERS_REQUEST}, getState);

        let member;
        try {
            member = await Client.getTeamMember(teamId, userId);
            getProfilesAndStatusesForMembers([userId], dispatch, getState);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: TeamsTypes.TEAM_MEMBERS_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: TeamsTypes.RECEIVED_MEMBERS_IN_TEAM,
                data: [member]
            },
            {
                type: TeamsTypes.TEAM_MEMBERS_SUCCESS
            }
        ]), getState);
    };
}

export function getTeamMembersByIds(teamId, userIds) {
    return async (dispatch, getState) => {
        dispatch({type: TeamsTypes.TEAM_MEMBERS_REQUEST}, getState);

        let members;
        try {
            members = await Client.getTeamMemberByIds(teamId, userIds);
            getProfilesAndStatusesForMembers(userIds, dispatch, getState);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: TeamsTypes.TEAM_MEMBERS_FAILURE}, getState);
        }

        dispatch(batchActions([
            {
                type: TeamsTypes.RECEIVED_MEMBERS_IN_TEAM,
                data: members
            },
            {
                type: TeamsTypes.TEAM_MEMBERS_SUCCESS
            }
        ]), getState);
    };
}

export function getTeamStats(teamId) {
    return bindClientFunc(
        Client.getTeamStats,
        TeamsTypes.TEAM_STATS_REQUEST,
        [TeamsTypes.RECEIVED_TEAM_STATS, TeamsTypes.TEAM_STATS_SUCCESS],
        TeamsTypes.TEAM_STATS_FAILURE,
        teamId
    );
}

export function addUserToTeam(teamId, userId) {
    return async (dispatch, getState) => {
        dispatch({type: TeamsTypes.ADD_TEAM_MEMBER_REQUEST}, getState);

        try {
            await Client.addUserToTeam(teamId, userId);
        } catch (err) {
            forceLogoutIfNecessary(err, dispatch);
            dispatch({type: TeamsTypes.ADD_TEAM_MEMBER_FAILURE, error: err}, getState);
            return;
        }

        const member = {
            team_id: teamId,
            user_id: userId
        };

        dispatch(batchActions([
            {
                type: TeamsTypes.RECEIVED_MEMBER_IN_TEAM,
                data: member
            },
            {
                type: TeamsTypes.ADD_TEAM_MEMBER_SUCCESS
            }
        ]), getState);
    };
}

export function removeUserFromTeam(teamId, userId) {
    return async (dispatch, getState) => {
        dispatch({type: TeamsTypes.REMOVE_TEAM_MEMBER_REQUEST}, getState);

        try {
            await Client.removeUserFromTeam(teamId, userId);
        } catch (err) {
            forceLogoutIfNecessary(err, dispatch);
            dispatch({type: TeamsTypes.REMOVE_TEAM_MEMBER_FAILURE, error: err}, getState);
            return;
        }

        const member = {
            team_id: teamId,
            user_id: userId
        };

        dispatch(batchActions([
            {
                type: TeamsTypes.REMOVE_MEMBER_FROM_TEAM,
                data: member
            },
            {
                type: TeamsTypes.REMOVE_TEAM_MEMBER_SUCCESS
            }
        ]), getState);
    };
}
