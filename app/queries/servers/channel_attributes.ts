// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, of as of$, type Observable} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {isDMorGM} from '@utils/channel';
import {
    channelAttributePermissionsEqual,
    creatableFieldsSignature,
    getCreatableChannelAttributeFields,
    hasCreationBlockingChannelAttribute,
    type ChannelAttributeField,
    type ChannelAttributePermissions,
} from '@utils/channel_attributes';

import {observeChannel} from './channel';
import {observeChannelAttributeFields} from './properties';
import {observeCanManageSystem, observePermissionForChannel} from './role';
import {observeCurrentUser} from './user';

import type {Database} from '@nozbe/watermelondb';

const NO_PERMISSIONS: ChannelAttributePermissions = {
    canManageChannelProperties: false,
    canManageChannelRoles: false,
    canManageSystem: false,
};

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
        distinctUntilChanged(channelAttributePermissionsEqual),
    );
};

const EMPTY_CREATABLE_FIELDS: ChannelAttributeField[] = [];

/**
 * The required channel attributes a channel-creation form should offer, in
 * display order.
 *
 * Narrower than observeChannelAttributeFields in two ways that both matter here:
 * only required fields are worth showing (an optional attribute is reachable
 * later from Channel Info, and this form has no Add attribute affordance), and
 * only fields the caller may set on create at all — canSetChannelAttributeOnCreate
 * mirrors the server's own check, so a field the caller cannot satisfy is dropped
 * rather than shown and refused. The server independently skips a required field
 * the caller may not set when it decides whether creation is blocked, so omitting
 * it here cannot make creation impossible.
 *
 * A required field with no mobile editor (date, user, multiuser) is dropped too:
 * there is no sheet to fill it with, and showing it would gate Create on a value
 * this form can never collect. Whether that omission can still block creation
 * outright is answered separately by observeChannelAttributeCreationBlocked,
 * since only the sysadmin-tier case is safe to drop silently.
 */
export const observeCreatableChannelAttributeFields = (database: Database): Observable<ChannelAttributeField[]> => {
    return combineLatest([
        observeChannelAttributeFields(database),
        observeCurrentUser(database),
    ]).pipe(
        switchMap(([fields, user]) => observeCanManageSystem(database, user).pipe(
            map((canManageSystem) => {
                const creatable = getCreatableChannelAttributeFields(fields, canManageSystem);
                return creatable.length === 0 ? EMPTY_CREATABLE_FIELDS : creatable;
            }),
        )),
        map((creatable) => ({creatable, signature: creatableFieldsSignature(creatable)})),
        distinctUntilChanged((a, b) => a.signature === b.signature),
        map(({creatable}) => creatable),
    );
};

/**
 * Whether some required attribute the caller could otherwise satisfy has no
 * mobile editor at all — a date, user or multiuser field, since those are the
 * only required-and-creator-settable types the create screen cannot collect.
 *
 * observeCreatableChannelAttributeFields silently drops such a field, which is
 * safe when the drop reason is the caller's own tier — the server drops the
 * requirement right alongside it — but not here: the caller's tier passes, so
 * the server will still refuse creation for a value nothing on screen could ever
 * have supplied. The create screen uses this to block Create outright instead of
 * letting the tap round-trip into an unrecoverable, unexplained 400.
 */
export const observeChannelAttributeCreationBlocked = (database: Database): Observable<boolean> => {
    return combineLatest([
        observeChannelAttributeFields(database),
        observeCurrentUser(database),
    ]).pipe(
        switchMap(([fields, user]) => observeCanManageSystem(database, user).pipe(
            map((canManageSystem) => hasCreationBlockingChannelAttribute(fields, canManageSystem)),
        )),
        distinctUntilChanged(),
    );
};
