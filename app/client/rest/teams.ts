// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';

export interface ClientTeamsMix {
    createTeam: (team: Team) => Promise<Team>;
    deleteTeam: (teamId: string) => Promise<any>;
    updateTeam: (team: Team) => Promise<Team>;
    patchTeam: (team: Partial<Team> & {id: string}) => Promise<Team>;
    getTeams: (page?: number, perPage?: number, includeTotalCount?: boolean, groupLabel?: RequestGroupLabel) => Promise<Team[]>;
    getTeam: (teamId: string, groupLabel?: RequestGroupLabel) => Promise<Team>;
    getTeamByName: (teamName: string) => Promise<Team>;
    getMyTeams: (groupLabel?: RequestGroupLabel) => Promise<Team[]>;
    getTeamsForUser: (userId: string) => Promise<Team[]>;
    getMyTeamMembers: (groupLabel?: RequestGroupLabel) => Promise<TeamMembership[]>;
    getTeamMembers: (teamId: string, page?: number, perPage?: number) => Promise<TeamMembership[]>;
    getTeamMember: (teamId: string, userId: string, groupLabel?: RequestGroupLabel) => Promise<TeamMembership>;
    getTeamMembersByIds: (teamId: string, userIds: string[]) => Promise<TeamMembership[]>;
    addToTeam: (teamId: string, userId: string) => Promise<TeamMembership>;
    addUsersToTeamGracefully: (teamId: string, userIds: string[]) => Promise<TeamMemberWithError[]>;
    sendEmailInvitesToTeamGracefully: (teamId: string, emails: string[]) => Promise<TeamInviteWithError[]>;
    joinTeam: (inviteId: string) => Promise<TeamMembership>;
    removeFromTeam: (teamId: string, userId: string) => Promise<any>;
    getTeamStats: (teamId: string) => Promise<any>;
    getTeamIconUrl: (teamId: string, lastTeamIconUpdate: number) => string;
}

const ClientTeams = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    createTeam = async (team: Team) => {
        return this.doFetch(
            `${this.getTeamsRoute()}`,
            {method: 'post', body: team},
        );
    };

    deleteTeam = async (teamId: string) => {
        return this.doFetch(
            `${this.getTeamRoute(teamId)}`,
            {method: 'delete'},
        );
    };

    updateTeam = async (team: Team) => {
        return this.doFetch(
            `${this.getTeamRoute(team.id)}`,
            {method: 'put', body: team},
        );
    };

    patchTeam = async (team: Partial<Team> & {id: string}) => {
        return this.doFetch(
            `${this.getTeamRoute(team.id)}/patch`,
            {method: 'put', body: team},
        );
    };

    getTeams = async (page = 0, perPage = PER_PAGE_DEFAULT, includeTotalCount = false, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getTeamsRoute()}${buildQueryString({page, per_page: perPage, include_total_count: includeTotalCount})}`,
            {method: 'get', groupLabel},
        );
    };

    getTeam = async (teamId: string, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            this.getTeamRoute(teamId),
            {method: 'get', groupLabel},
        );
    };

    getTeamByName = async (teamName: string) => {
        return this.doFetch(
            this.getTeamNameRoute(teamName),
            {method: 'get'},
        );
    };

    getMyTeams = async (groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getUserRoute('me')}/teams`,
            {method: 'get', groupLabel},
        );
    };

    getTeamsForUser = async (userId: string) => {
        return this.doFetch(
            `${this.getUserRoute(userId)}/teams`,
            {method: 'get'},
        );
    };

    getMyTeamMembers = async (groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getUserRoute('me')}/teams/members`,
            {method: 'get', groupLabel},
        );
    };

    getTeamMembers = async (teamId: string, page = 0, perPage = PER_PAGE_DEFAULT) => {
        return this.doFetch(
            `${this.getTeamMembersRoute(teamId)}${buildQueryString({page, per_page: perPage})}`,
            {method: 'get'},
        );
    };

    getTeamMember = async (teamId: string, userId: string, groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getTeamMemberRoute(teamId, userId)}`,
            {method: 'get', groupLabel},
        );
    };

    getTeamMembersByIds = (teamId: string, userIds: string[]) => {
        return this.doFetch(
            `${this.getTeamMembersRoute(teamId)}/ids`,
            {method: 'post', body: userIds},
        );
    };

    addToTeam = async (teamId: string, userId: string) => {
        const member = {user_id: userId, team_id: teamId};
        return this.doFetch(
            `${this.getTeamMembersRoute(teamId)}`,
            {method: 'post', body: member},
        );
    };

    addUsersToTeamGracefully = (teamId: string, userIds: string[]) => {
        const members: Array<{team_id: string; user_id: string}> = [];
        userIds.forEach((id) => members.push({team_id: teamId, user_id: id}));

        return this.doFetch(
            `${this.getTeamMembersRoute(teamId)}/batch?graceful=true`,
            {method: 'post', body: members},
        );
    };

    sendEmailInvitesToTeamGracefully = (teamId: string, emails: string[]) => {
        return this.doFetch(
            `${this.getTeamRoute(teamId)}/invite/email?graceful=true`,
            {method: 'post', body: emails},
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
