// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap, distinctUntilChanged, map} from 'rxjs/operators';

import {Database as DatabaseConstants, General, Permissions} from '@constants';
import {RenderPermissionAction} from '@constants/access_control';
import {CHANNEL_MANAGEMENT_PERMISSIONS, CHANNEL_WRITE_PERMISSIONS} from '@constants/permissions';
import DatabaseManager from '@database/manager';
import {isDefaultChannel, isDMorGM} from '@utils/channel';
import {hasPermission} from '@utils/role';

import {observeChannel, observeMyChannelRoles} from './channel';
import {observeChannelActionDenied} from './render_permissions';
import {observeConfigBooleanValue} from './system';
import {observeMyTeam, observeMyTeamRoles} from './team';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type RoleModel from '@typings/database/models/servers/role';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

const {ROLE} = DatabaseConstants.MM_TABLES.SERVER;

export const queryRoles = (database: Database) => {
    return database.collections.get<RoleModel>(ROLE).query();
};

export const getRoleById = async (database: Database, roleId: string): Promise<RoleModel|undefined> => {
    try {
        const role = (await database.get<RoleModel>(ROLE).find(roleId));
        return role;
    } catch {
        return undefined;
    }
};

export const queryRolesByNames = (database: Database, names: string[]) => {
    return database.get<RoleModel>(ROLE).query(Q.where('name', Q.oneOf(names)));
};

/**
 * The role grant alone, with no ABAC policy applied. For a surface that stays visible under a policy
 * denial, rendering its controls disabled rather than hiding them. Prefer observePermissionForChannel
 * for anything that gates an actual action.
 */
export function observePermissionForChannelRBACOnly(database: Database, channel: ChannelModel | null | undefined, user: UserModel | undefined, permission: string, defaultValue: boolean) {
    if (!user || !channel) {
        return of$(defaultValue);
    }
    const myChannelRoles = observeMyChannelRoles(database, channel.id);
    const myTeamRoles = channel.teamId ? observeMyTeamRoles(database, channel.teamId) : of$(undefined);

    return combineLatest([myChannelRoles, myTeamRoles]).pipe(switchMap(([mc, mt]) => {
        const rolesArray = [...user.roles.split(' ')];
        if (mc) {
            rolesArray.push(...mc.split(' '));
        }
        if (mt) {
            rolesArray.push(...mt.split(' '));
        }
        return queryRolesByNames(database, rolesArray).observeWithColumns(['permissions']).pipe(
            switchMap((r) => of$(hasPermission(r, permission))),
        );
    }),
    distinctUntilChanged(),
    );
}

const getChannelAccessAction = (permission: string) => {
    if (CHANNEL_WRITE_PERMISSIONS.has(permission)) {
        return RenderPermissionAction.ChannelWriteAccess;
    }
    if (CHANNEL_MANAGEMENT_PERMISSIONS.has(permission)) {
        return RenderPermissionAction.ChannelManagementAccess;
    }
    return undefined;
};

/**
 * The role grant, denied as well by an ABAC write or management policy on the channel when the
 * permission is one of those actions. Mirrors the webapp's haveIChannelPermission. DMs and GMs are
 * exempt from channel access policies.
 */
export function observePermissionForChannel(database: Database, channel: ChannelModel | null | undefined, user: UserModel | undefined, permission: string, defaultValue: boolean) {
    const rbacAllowed = observePermissionForChannelRBACOnly(database, channel, user, permission, defaultValue);
    const action = getChannelAccessAction(permission);
    if (!action || !channel || isDMorGM(channel)) {
        return rbacAllowed;
    }

    const serverUrl = DatabaseManager.getServerUrlForDatabase(database);
    if (!serverUrl) {
        return rbacAllowed;
    }

    return combineLatest([
        rbacAllowed,
        observeChannelActionDenied(database, serverUrl, channel.id, action),
    ]).pipe(
        map(([allowed, denied]) => allowed && !denied),
        distinctUntilChanged(),
    );
}

export function observePermissionForTeam(database: Database, team: TeamModel | undefined, user: UserModel | undefined, permission: string, defaultValue: boolean) {
    if (!team || !user) {
        return of$(defaultValue);
    }

    return observeMyTeam(database, team.id).pipe(
        switchMap((myTeam) => {
            const rolesArray = [...user.roles.split(' ')];

            if (myTeam) {
                rolesArray.push(...myTeam.roles.split(' '));
            }

            return queryRolesByNames(database, rolesArray).observeWithColumns(['permissions']).pipe(
                switchMap((roles) => of$(hasPermission(roles, permission))),
            );
        }),
        distinctUntilChanged(),
    );
}

export function observePermissionForPost(database: Database, post: PostModel, user: UserModel | undefined, permission: string, defaultValue: boolean) {
    return observeChannel(database, post.channelId).pipe(
        switchMap((c) => observePermissionForChannel(database, c, user, permission, defaultValue)),
        distinctUntilChanged(),
    );
}

export function observeCanManageChannelMembers(database: Database, channelId: string, user: UserModel) {
    return observeChannel(database, channelId).pipe(
        switchMap((c) => {
            if (!c || c.deleteAt !== 0 || isDMorGM(c) || isDefaultChannel(c)) {
                return of$(false);
            }

            const permission = c.type === General.OPEN_CHANNEL ? Permissions.MANAGE_PUBLIC_CHANNEL_MEMBERS : Permissions.MANAGE_PRIVATE_CHANNEL_MEMBERS;
            return observePermissionForChannel(database, c, user, permission, true);
        }),
        distinctUntilChanged(),
    );
}

export function observeCanManageChannelSettings(database: Database, channelId: string, user: UserModel, rbacOnly = false) {
    const observePermission = rbacOnly ? observePermissionForChannelRBACOnly : observePermissionForChannel;
    return observeChannel(database, channelId).pipe(
        switchMap((c) => {
            if (!c || c.deleteAt !== 0 || isDMorGM(c)) {
                return of$(false);
            }

            const permission = c.type === General.OPEN_CHANNEL ? Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES : Permissions.MANAGE_PRIVATE_CHANNEL_PROPERTIES;
            return observePermission(database, c, user, permission, true);
        }),
        distinctUntilChanged(),
    );
}

export function observeCanManageChannelAutotranslations(database: Database, channelId: string, user: UserModel, rbacOnly = false) {
    const observePermission = rbacOnly ? observePermissionForChannelRBACOnly : observePermissionForChannel;
    const featureEnabled = observeConfigBooleanValue(database, 'EnableAutoTranslation');
    const channel = observeChannel(database, channelId);
    const restrictDMAndGMAutotranslation = observeConfigBooleanValue(database, 'RestrictDMAndGMAutotranslation');
    return combineLatest([featureEnabled, channel, restrictDMAndGMAutotranslation]).pipe(
        switchMap(([enabled, c, isDmGmRestricted]) => {
            if (!enabled) {
                return of$(false);
            }

            if (!c || c.deleteAt !== 0) {
                return of$(false);
            }

            if (isDMorGM(c)) {
                return of$(!isDmGmRestricted);
            }

            const permission = c.type === General.OPEN_CHANNEL ? Permissions.MANAGE_PUBLIC_CHANNEL_AUTO_TRANSLATION : Permissions.MANAGE_PRIVATE_CHANNEL_AUTO_TRANSLATION;
            return observePermission(database, c, user, permission, false);
        }),
        distinctUntilChanged(),
    );
}

export function observeCanManageSharedChannel(database: Database, channelId: string, user: UserModel) {
    const channel = observeChannel(database, channelId);
    return channel.pipe(
        switchMap((c) => {
            if (!c || c.deleteAt !== 0 || isDMorGM(c)) {
                return of$(false);
            }
            return observePermissionForChannel(database, c, user, Permissions.MANAGE_SHARED_CHANNELS, false);
        }),
        distinctUntilChanged(),
    );
}
