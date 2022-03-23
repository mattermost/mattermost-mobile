// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Permissions} from '@constants';
import {queryRolesByNames} from '@queries/servers/role';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type PostModel from '@typings/database/models/servers/post';
import type RoleModel from '@typings/database/models/servers/role';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

export function hasPermission(roles: RoleModel[] | Role[], permission: string, defaultValue: boolean) {
    const permissions = new Set<string>();
    for (const role of roles) {
        role.permissions.forEach(permissions.add, permissions);
    }

    const exists = permissions.has(permission);
    return defaultValue === true || exists;
}

export async function hasPermissionForChannel(channel: ChannelModel, user: UserModel, permission: string, defaultValue: boolean) {
    const rolesArray = [...user.roles.split(' ')];

    const myChannel = await channel.membership.fetch() as MyChannelModel | undefined;
    if (myChannel) {
        rolesArray.push(...myChannel.roles.split(' '));
    }

    const team = await channel.team.fetch() as TeamModel | undefined;
    if (team) {
        const myTeam = await team.myTeam.fetch() as MyTeamModel | undefined;
        if (myTeam) {
            rolesArray.push(...myTeam.roles.split(' '));
        }
    }

    if (rolesArray.length) {
        const roles = await queryRolesByNames(user.database, rolesArray).fetch();
        return hasPermission(roles, permission, defaultValue);
    }

    return defaultValue;
}

export async function hasPermissionForTeam(team: TeamModel, user: UserModel, permission: string, defaultValue: boolean) {
    const rolesArray = [...user.roles.split(' ')];

    const myTeam = await team.myTeam.fetch() as MyTeamModel | undefined;
    if (myTeam) {
        rolesArray.push(...myTeam.roles.split(' '));
    }

    if (rolesArray.length) {
        const roles = await queryRolesByNames(user.database, rolesArray).fetch();
        return hasPermission(roles, permission, defaultValue);
    }

    return defaultValue;
}

export async function hasPermissionForPost(post: PostModel, user: UserModel, permission: string, defaultValue: boolean) {
    const channel = await post.channel.fetch() as ChannelModel | undefined;
    if (channel) {
        return hasPermissionForChannel(channel, user, permission, defaultValue);
    }

    return defaultValue;
}

export async function canManageChannelMembers(post: PostModel, user: UserModel) {
    const rolesArray = [...user.roles.split(' ')];
    const channel = await post.channel.fetch() as ChannelModel | undefined;

    if (!channel || channel.deleteAt !== 0 || [General.DM_CHANNEL, General.GM_CHANNEL].includes(channel.type as any) || channel.name === General.DEFAULT_CHANNEL) {
        return false;
    }

    const myChannel = await channel.membership.fetch() as MyChannelModel | undefined;
    if (myChannel) {
        rolesArray.push(...myChannel.roles.split(' '));
    }

    const team = await channel.team.fetch() as TeamModel | undefined;
    if (team) {
        const myTeam = await team.myTeam.fetch() as MyTeamModel | undefined;
        if (myTeam) {
            rolesArray.push(...myTeam.roles.split(' '));
        }
    }

    if (rolesArray.length) {
        const roles = await queryRolesByNames(post.database, rolesArray).fetch() as RoleModel[];
        const permission = channel.type === General.OPEN_CHANNEL ? Permissions.MANAGE_PUBLIC_CHANNEL_MEMBERS : Permissions.MANAGE_PRIVATE_CHANNEL_MEMBERS;
        return hasPermission(roles, permission, true);
    }

    return true;
}
