// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, of as of$, type Observable} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {isDMorGM} from '@utils/channel';
import {type ChannelAttributePermissions} from '@utils/channel_attributes';

import {observeChannel} from './channel';
import {observePermissionForChannel} from './role';
import {observeCurrentUser} from './user';

import type {Database} from '@nozbe/watermelondb';

const NO_PERMISSIONS: ChannelAttributePermissions = {
    canManageChannelProperties: false,
    canManageChannelRoles: false,
    canManageSystem: false,
};

function permissionsEqual(a: ChannelAttributePermissions, b: ChannelAttributePermissions): boolean {
    return a.canManageChannelProperties === b.canManageChannelProperties &&
        a.canManageChannelRoles === b.canManageChannelRoles &&
        a.canManageSystem === b.canManageSystem;
}

/**
 * The three permission answers every attribute row on a channel is judged
 * against, resolved once for the channel rather than once per row.
 *
 * Two independent gates, both of which the server applies:
 *
 * - the channel-level one — manage_public_channel_properties on an open channel,
 *   manage_private_channel_properties on a private one, which is what
 *   hasTargetAccess checks before it looks at the field at all;
 * - the field's own permission_values tier, which needs manage_system for
 *   `sysadmin` and manage_channel_roles on this channel for `admin`.
 *
 * The webapp's equivalent hook checks only the tier and misses the channel-level
 * gate, so it can offer an edit the server refuses. Both are checked here.
 *
 * Archived channels, DMs and GMs resolve to nothing. The server would let a
 * DM/GM value write past the channel-level gate on membership alone, and leaves
 * the tier to stop it; mobile does not offer attributes there at all.
 */
export const observeChannelAttributePermissions = (database: Database, channelId: string): Observable<ChannelAttributePermissions> => {
    return combineLatest([observeChannel(database, channelId), observeCurrentUser(database)]).pipe(
        switchMap(([channel, user]) => {
            if (!channel || !user || channel.deleteAt !== 0 || isDMorGM(channel)) {
                return of$(NO_PERMISSIONS);
            }

            const propertiesPermission = channel.type === General.OPEN_CHANNEL ? Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES : Permissions.MANAGE_PRIVATE_CHANNEL_PROPERTIES;

            return combineLatest([
                observePermissionForChannel(database, channel, user, propertiesPermission, false),
                observePermissionForChannel(database, channel, user, Permissions.MANAGE_CHANNEL_ROLES, false),
                observePermissionForChannel(database, channel, user, Permissions.MANAGE_SYSTEM, false),
            ]).pipe(
                switchMap(([canManageChannelProperties, canManageChannelRoles, canManageSystem]) => of$({
                    canManageChannelProperties,
                    canManageChannelRoles,
                    canManageSystem,
                })),
            );
        }),
        distinctUntilChanged(permissionsEqual),
    );
};
