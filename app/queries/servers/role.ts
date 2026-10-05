// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {of as of$, combineLatest, type Observable} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {Database as DatabaseConstants, General, Permissions} from '@constants';
import {isDefaultChannel, isDMorGM} from '@utils/channel';
import {hasPermission} from '@utils/role';

import {observeChannel, observeMyChannelRoles} from './channel';
import {observeConfigBooleanValue} from './system';
import {observeMyTeamRoles} from './team';

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

export function observePermissionForChannel(database: Database, channel: ChannelModel | null | undefined, user: UserModel | undefined, permission: string, defaultValue: boolean) {
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

/**
 * Observes the role records granted to a user in a team, or undefined when the team or user is unknown.
 * Callers checking several permissions should share this and derive each permission with hasPermission.
 */
export function observeRolesForTeam(database: Database, teamId: string | undefined, userRoles: string | undefined): Observable<RoleModel[] | undefined> {
    if (!teamId || userRoles === undefined) {
        return of$(undefined);
    }

    return observeMyTeamRoles(database, teamId).pipe(
        switchMap((myTeamRoles) => {
            const rolesArray = userRoles.split(' ');
            if (myTeamRoles) {
                rolesArray.push(...myTeamRoles.split(' '));
            }
            return queryRolesByNames(database, rolesArray).observeWithColumns(['permissions']);
        }),
    );
}

export function observePermissionForTeam(database: Database, team: TeamModel | undefined, user: UserModel | undefined, permission: string, defaultValue: boolean) {
    return observeRolesForTeam(database, team?.id, user?.roles).pipe(
        map((roles) => (roles ? hasPermission(roles, permission) : defaultValue)),
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

export function observeCanManageChannelSettings(database: Database, channelId: string, user: UserModel) {
    return observeChannel(database, channelId).pipe(
        switchMap((c) => {
            if (!c || c.deleteAt !== 0 || isDMorGM(c)) {
                return of$(false);
            }

            const permission = c.type === General.OPEN_CHANNEL ? Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES : Permissions.MANAGE_PRIVATE_CHANNEL_PROPERTIES;
            return observePermissionForChannel(database, c, user, permission, true);
        }),
        distinctUntilChanged(),
    );
}

export function observeCanManageChannelAutotranslations(database: Database, channelId: string, user: UserModel) {
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
            return observePermissionForChannel(database, c, user, permission, false);
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
