// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {analytics} from '@init/analytics';
import {Team, TeamMembership, TeamUnread} from '@mm-redux/types/teams';
import {buildQueryString} from '@mm-redux/utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

export interface ClientTeamsMix {
    createTeam: (team: Team) => Promise<Team>;
    deleteTeam: (teamId: string) => Promise<any>;
    updateTeam: (team: Team) => Promise<Team>;
    patchTeam: (team: Partial<Team> & {id: string}) => Promise<Team>;
    getTeams: (page?: number, perPage?: number, includeTotalCount?: boolean) => Promise<any>;
    getTeam: (teamId: string) => Promise<Team>;
    getTeamByName: (teamName: string) => Promise<Team>;
    getMyTeams: () => Promise<Team[]>;
    getTeamsForUser: (userId: string) => Promise<Team[]>;
    getMyTeamMembers: () => Promise<TeamMembership[]>;
    getMyTeamUnreads: () => Promise<TeamUnread[]>;
    getTeamMembers: (teamId: string, page?: number, perPage?: number) => Promise<TeamMembership[]>;
    getTeamMember: (teamId: string, userId: string) => Promise<TeamMembership>;
    addToTeam: (teamId: string, userId: string) => Promise<TeamMembership>;
    joinTeam: (inviteId: string) => Promise<TeamMembership>;
    removeFromTeam: (teamId: string, userId: string) => Promise<any>;
    getTeamStats: (teamId: string) => Promise<any>;
    getTeamIconUrl: (teamId: string, lastTeamIconUpdate: number) => string;
}

const ClientTeams = (superclass: any) => class extends superclass {
    createTeam = async (team: Team) => {
        analytics.trackAPI('api_teams_create');

        return this.doFetch(
            `${this.getTeamsRoute()}`,
            {method: 'post', body: JSON.stringify(team)},
        );
    };

    deleteTeam = async (teamId: string) => {
        analytics.trackAPI('api_teams_delete');

        return this.doFetch(
            `${this.getTeamRoute(teamId)}`,
            {method: 'delete'},
        );
    };

    updateTeam = async (team: Team) => {
        analytics.trackAPI('api_teams_update_name', {team_id: team.id});

        return this.doFetch(
            `${this.getTeamRoute(team.id)}`,
            {method: 'put', body: JSON.stringify(team)},
        );
    };

    patchTeam = async (team: Partial<Team> & {id: string}) => {
        analytics.trackAPI('api_teams_patch_name', {team_id: team.id});

        return this.doFetch(
            `${this.getTeamRoute(team.id)}/patch`,
            {method: 'put', body: JSON.stringify(team)},
        );
    };

    getTeams = async (page = 0, perPage = PER_PAGE_DEFAULT, includeTotalCount = false) => {
        return this.doFetch(
            `${this.getTeamsRoute()}${buildQueryString({page, per_page: perPage, include_total_count: includeTotalCount})}`,
            {method: 'get'},
        );
    };

    getTeam = async (teamId: string) => {
        return this.doFetch(
            this.getTeamRoute(teamId),
            {method: 'get'},
        );
    };

    getTeamByName = async (teamName: string) => {
        analytics.trackAPI('api_teams_get_team_by_name');

        return this.doFetch(
            this.getTeamNameRoute(teamName),
            {method: 'get'},
        );
    };

    getMyTeams = async () => {
        return this.doFetch(
            `${this.getUserRoute('me')}/teams`,
            {method: 'get'},
        );
    };

    getTeamsForUser = async (userId: string) => {
        return this.doFetch(
            `${this.getUserRoute(userId)}/teams`,
            {method: 'get'},
        );
    };

    getMyTeamMembers = async () => {
        return this.doFetch(
            `${this.getUserRoute('me')}/teams/members`,
            {method: 'get'},
        );
    };

    getMyTeamUnreads = async () => {
        return this.doFetch(
            `${this.getUserRoute('me')}/teams/unread`,
            {method: 'get'},
        );
    };

    getTeamMembers = async (teamId: string, page = 0, perPage = PER_PAGE_DEFAULT) => {
        return this.doFetch(
            `${this.getTeamMembersRoute(teamId)}${buildQueryString({page, per_page: perPage})}`,
            {method: 'get'},
        );
    };

    getTeamMember = async (teamId: string, userId: string) => {
        return this.doFetch(
            `${this.getTeamMemberRoute(teamId, userId)}`,
            {method: 'get'},
        );
    };

    addToTeam = async (teamId: string, userId: string) => {
        analytics.trackAPI('api_teams_invite_members', {team_id: teamId});

        const member = {user_id: userId, team_id: teamId};
        return this.doFetch(
            `${this.getTeamMembersRoute(teamId)}`,
            {method: 'post', body: JSON.stringify(member)},
        );
    };

    joinTeam = async (inviteId: string) => {
        const query = buildQueryString({invite_id: inviteId});
        return this.doFetch(
            `${this.getTeamsRoute()}/members/invite${query}`,
            {method: 'post'},
        );
    };

    removeFromTeam = async (teamId: string, userId: string) => {
        analytics.trackAPI('api_teams_remove_members', {team_id: teamId});

        return this.doFetch(
            `${this.getTeamMemberRoute(teamId, userId)}`,
            {method: 'delete'},
        );
    };

    getTeamStats = async (teamId: string) => {
        return this.doFetch(
            `${this.getTeamRoute(teamId)}/stats`,
            {method: 'get'},
        );
    };

    getTeamIconUrl = (teamId: string, lastTeamIconUpdate: number) => {
        const params: any = {};
        if (lastTeamIconUpdate) {
            params._ = lastTeamIconUpdate;
        }

        return `${this.getTeamRoute(teamId)}/image${buildQueryString(params)}`;
    };
};

export default ClientTeams;
