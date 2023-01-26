// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type TeamMembership = {
    id?: string;
    mention_count: number;
    msg_count: number;
    team_id: string;
    user_id: string;
    roles: string;
    delete_at: number;
    scheme_user: boolean;
    scheme_admin: boolean;
};

type TeamMemberWithError = {
    member: TeamMembership;
    user_id: string;
    error: ApiError;
}

type TeamInviteWithError = {
    email: string;
    error: ApiError;
}

type TeamType = 'O' | 'I';

type Team = {
    id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    display_name: string;
    name: string;
    description: string;
    email: string;
    type: TeamType;
    company_name: string;
    allowed_domains: string;
    invite_id: string;
    allow_open_invite: boolean;
    scheme_id: string;
    group_constrained: boolean|null;
    last_team_icon_update: number;
};

type TeamsState = {
    currentTeamId: string;
    teams: Dictionary<Team>;
    myMembers: Dictionary<TeamMembership>;
    membersInTeam: any;
    stats: any;
    groupsAssociatedToTeam: any;
    totalCount: number;
};
