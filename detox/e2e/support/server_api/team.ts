// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {capitalize, getRandomId} from '@support/utils';
import jestExpect from 'expect';

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
 * Add user to team.
 * See https://api.mattermost.com/#operation/AddTeamMember
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - The ID of user to add into the team
 * @param {string} teamId - The team ID
 * @return {Object} returns {member} on success or {error, status} on error
 */
export const apiAddUserToTeam = async (baseUrl: string, userId: string, teamId: string): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/teams/${teamId}/members`,
            {team_id: teamId, user_id: userId},
        );

        return {member: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Create a team.
 * See https://api.mattermost.com/#operation/CreateTeam
 * @param {string} baseUrl - the base server URL
 * @param {string} option.type - 'O' (default) for open, 'I' for invite only
 * @param {string} option.prefix - prefix to name and display name
 * @param {Object} option.team - team object to be created
 * @return {Object} returns {team} on success or {error, status} on error
 */
export const apiCreateTeam = async (baseUrl: string, {type = 'O', prefix = 'team', team = null}: any = {}): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/teams`,
            team || generateRandomTeam(type, prefix),
        );

        return {team: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Delete a team.
 * See https://api.mattermost.com/#operation/SoftDeleteTeam
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - The team ID
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiDeleteTeam = async (baseUrl: string, teamId: string): Promise<any> => {
    try {
        const response = await client.delete(
            `${baseUrl}/api/v4/teams/${teamId}`,
        );

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Delete teams.
 * @param {string} baseUrl - the base server URL
 * @param {Array} teams - array of teams
 */
export const apiDeleteTeams = async (baseUrl: string, teams: any[] = []) => {
    let teamArray = teams;
    if (teamArray.length === 0) {
        ({teams: teamArray} = await Team.apiGetTeams(baseUrl));
    }

    teamArray.forEach(async (team: any) => {
        const {status} = await Team.apiDeleteTeam(baseUrl, team.id);
        jestExpect(status).toEqual(200);
    });
};

/**
 * Remove user from team.
 * See https://api.mattermost.com/#operation/RemoveTeamMember
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - The team ID
 * @param {string} userId - The user ID to be removed from team
 * @return {Object} returns {status} on success or {error, status} on error
 */
export const apiDeleteUserFromTeam = async (baseUrl: string, teamId: string, userId: string): Promise<any> => {
    try {
        const response = await client.delete(
            `${baseUrl}/api/v4/teams/${teamId}/members/${userId}`,
        );

        return {status: response.status};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get teams.
 * See https://api.mattermost.com/#operation/GetAllTeams
 * @param {string} baseUrl - the base server URL
 * @return {Object} returns {teams} on success or {error, status} on error
 */
export const apiGetTeams = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/teams`);

        return {teams: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get teams for user.
 * See https://api.mattermost.com/#operation/GetTeamsForUser
 * @param {string} baseUrl - the base server URL
 * @param {string} userId - The user ID
 * @return {Object} returns {teams} on success or {error, status} on error
 */
export const apiGetTeamsForUser = async (baseUrl: string, userId = 'me'): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/users/${userId}/teams`);

        return {teams: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Patch a team.
 * See https://api.mattermost.com/#operation/PatchTeam
 * @param {string} baseUrl - the base server URL
 * @param {string} teamId - The team ID
 * @param {string} patch.display_name - Display name
 * @param {string} patch.description - Description
 * @param {string} patch.company_name - Company name
 * @param {string} patch.allowed_domains - Allowed domains
 * @param {boolean} patch.allow_open_invite - Allow open invite
 * @param {boolean} patch.group_constrained - Group constrained
 * @return {Object} returns {team} on success or {error, status} on error
 */
export const apiPatchTeam = async (baseUrl: string, teamId: string, teamData: string): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}/api/v4/teams/${teamId}/patch`,
            teamData,
        );

        return {team: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Patch teams.
 * @param {string} baseUrl - the base server URL
 * @param {string} patch.display_name - Display name
 * @param {string} patch.description - Description
 * @param {string} patch.company_name - Company name
 * @param {string} patch.allowed_domains - Allowed domains
 * @param {boolean} patch.allow_open_invite - Allow open invite
 * @param {boolean} patch.group_constrained - Group constrained
 * @param {Array} teams - array of teams
 */
export const apiPatchTeams = async (baseUrl: string, teamData: any, teams: any[] = []) => {
    let teamArray = teams;
    if (teamArray.length === 0) {
        ({teams: teamArray} = await Team.apiGetTeams(baseUrl));
    }

    teamArray.forEach(async (team: any) => {
        await Team.apiPatchTeam(baseUrl, team.id, teamData);
    });
};

export const generateRandomTeam = (type: string, prefix: string) => {
    const randomId = getRandomId();

    return {
        name: `${prefix}-${randomId}`,
        display_name: `${capitalize(prefix)} ${randomId}`,
        type,
    };
};

export const Team = {
    apiAddUserToTeam,
    apiCreateTeam,
    apiDeleteTeam,
    apiDeleteTeams,
    apiDeleteUserFromTeam,
    apiGetTeams,
    apiGetTeamsForUser,
    apiPatchTeam,
    apiPatchTeams,
    generateRandomTeam,
};

export default Team;
