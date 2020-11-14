// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {capitalize, getRandomId} from '@support/utils';

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Teams
// See https://api.mattermost.com/#tag/teams
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Create a team.
 * See https://api.mattermost.com/#tag/teams/paths/~1teams/post
 * @param {string} option.type - 'O' (default) for open, 'I' for invite only
 * @param {string} option.prefix - option to add prefix to name and display name
 * @param {Object} team - fix team object to be created
 * @return {Object} returns {team} on success or {error, status} on error
 */
export const apiCreateTeam = async ({type = 'O', prefix = 'team', team = null} = {}) => {
    try {
        const response = await client.post(
            '/api/v4/teams',
            team || generateRandomTeam(type, prefix),
        );

        return {team: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Add user to team.
 * See https://api.mattermost.com/#tag/teams/paths/~1teams~1{team_id}~1members/post
 * @param {string} userId - The ID of user to add into the team
 * @param {string} teamId - The team ID
 * @return {Object} returns {member} on success or {error, status} on error
 */
export const apiAddUserToTeam = async (userId, teamId) => {
    try {
        const response = await client.post(
            `/api/v4/teams/${teamId}/members`,
            {team_id: teamId, user_id: userId},
        );

        return {member: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get team members for user.
 * See https://api.mattermost.com/#tag/teams/paths/~1users~1{user_id}~1teams~1members/get
 * @param {string} userId
 * @return {Object} returns {teams} on success or {error, status} on error
 */
export const apiGetTeamMembersForUser = async (userId = 'me') => {
    try {
        const response = await client.get(`/api/v4/users/${userId}/teams`);

        return {teams: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

function generateRandomTeam(type, prefix) {
    const randomId = getRandomId();

    return {
        name: `${prefix}-${randomId}`,
        display_name: `${capitalize(prefix)} ${randomId}`,
        type,
    };
}

export const Team = {
    apiAddUserToTeam,
    apiCreateTeam,
    apiGetTeamMembersForUser,
};

export default Team;
