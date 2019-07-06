// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function teamDataToRealm(team) {
    return {
        id: team.id,
        createAt: team.create_at,
        updateAt: team.update_at,
        deleteAt: team.delete_at,
        displayName: team.display_name,
        name: team.name,
        type: team.type,
        description: team.description,
        groupConstrained: team.group_constrained || false,
        members: team.members,
    };
}

export function teamMemberDataToRealm(realmUser, member) {
    return {
        id: `${member.team_id}-${member.user_id}`,
        user: realmUser,
        deleteAt: member.delete_at,
        roles: member.roles,
        schemeUser: member.scheme_user,
        schemeAdmin: member.scheme_admin,
        schemeGuest: member.scheme_guest,
        msgCount: member.msgCount,
        mentionCount: member.mentionCount,
    };
}
