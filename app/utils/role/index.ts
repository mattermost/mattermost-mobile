// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$, combineLatest} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {queryRolesByNames} from '@queries/servers/role';

import type ChannelModel from '@typings/database/models/servers/channel';
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

export function observePermissionForChannel(channel: ChannelModel, user: UserModel, permission: string, defaultValue: boolean) {
    const myChannel = channel.membership.observe();
    const myTeam = channel.team.observe().pipe(switchMap((t) => (t ? t.myTeam.observe() : of$(undefined))));

    return combineLatest([myChannel, myTeam]).pipe(switchMap(([mc, mt]) => {
        const rolesArray = [...user.roles.split(' ')];
        if (mc) {
            rolesArray.push(...mc.roles.split(' '));
        }
        if (mt) {
            rolesArray.push(...mt.roles.split(' '));
        }
        return queryRolesByNames(user.database, rolesArray).observe().pipe(
            switchMap((r) => of$(hasPermission(r, permission, defaultValue))),
        );
    }));
}

export function observePermissionForTeam(team: TeamModel, user: UserModel, permission: string, defaultValue: boolean) {
    return team.myTeam.observe().pipe(switchMap((myTeam) => {
        const rolesArray = [...user.roles.split(' ')];

        if (myTeam) {
            rolesArray.push(...myTeam.roles.split(' '));
        }

        return queryRolesByNames(user.database, rolesArray).observe().pipe(
            switchMap((roles) => of$(hasPermission(roles, permission, defaultValue))),
        );
    }));
}

export function observePermissionForPost(post: PostModel, user: UserModel, permission: string, defaultValue: boolean) {
    return post.channel.observe().pipe(switchMap((c) => (c ? observePermissionForChannel(c, user, permission, defaultValue) : of$(defaultValue))));
}

export function observeCanManageChannelMembers(post: PostModel, user: UserModel) {
    return post.channel.observe().pipe((switchMap((c) => {
        const directTypes: ChannelType[] = [General.DM_CHANNEL, General.GM_CHANNEL];
        if (!c || c.deleteAt !== 0 || directTypes.includes(c.type) || c.name === General.DEFAULT_CHANNEL) {
            return of$(false);
        }

        const permission = c.type === General.OPEN_CHANNEL ? Permissions.MANAGE_PUBLIC_CHANNEL_MEMBERS : Permissions.MANAGE_PRIVATE_CHANNEL_MEMBERS;
        return observePermissionForChannel(c, user, permission, true);
    })));
}
