// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, of as of$, type Observable} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {General, Permissions} from '@constants';
import {isDMorGM} from '@utils/channel';
import {
    canSetChannelAttributeOnCreate,
    compareChannelAttributeFields,
    hasAttributeEditor,
    isPropertyFieldRequired,
    type ChannelAttributeField,
    type ChannelAttributePermissions,
} from '@utils/channel_attributes';

import {observeChannel} from './channel';
import {observeChannelAttributeFields, SIGNATURE_SEPARATOR} from './properties';
import {observeCanManageSystem, observePermissionForChannel} from './role';
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

const EMPTY_CREATABLE_FIELDS: ChannelAttributeField[] = [];

// WatermelonDB updates a record in place and re-emits the same model instance
// (see the identical note on renderSignature in @queries/servers/properties), so
// comparing fields by reference here would always read as equal once a field's
// required flag or permission_values tier changed in place — masking exactly the
// change this list exists to react to. Snapshotting the keys that decide
// membership in this list is what makes the comparison mean anything.
// Mirrors renderSignature's option digest in @queries/servers/properties: joined
// with SIGNATURE_SEPARATOR rather than a plain delimiter because option.name is
// admin-authored free text that can legally contain one.
function fieldSignature(field: ChannelAttributeField): string {
    const options = Array.isArray(field.attrs?.options) ?field.attrs.options.map((option) => [option.id, option.rank ?? '', option.color ?? '', option.name].join(SIGNATURE_SEPARATOR)).join(SIGNATURE_SEPARATOR) :'';

    return [
        field.id,

        // The fallback label (getPropertyFieldLabel falls back to name when
        // display_name is absent), the sort tie-break, and every row testID are
        // all keyed off name, not just display_name.
        field.name,
        field.type,
        field.permissionValues ?? '',
        isPropertyFieldRequired(field) ? '1' : '0',

        // The label and options are what the form actually renders, not just what
        // decides membership in the list — an administrator renaming the field or
        // its options while the create screen is open produced an emission this
        // treated as identical.
        field.attrs?.display_name ?? '',
        typeof field.attrs?.sort_order === 'number' ? String(field.attrs.sort_order) : '',
        options,
    ].join(SIGNATURE_SEPARATOR);
}

function creatableFieldsSignature(fields: ChannelAttributeField[]): string {
    return fields.map(fieldSignature).join('|');
}

function isCreatableWith(canManageSystem: boolean) {
    return (field: ChannelAttributeField) => isPropertyFieldRequired(field) && hasAttributeEditor(field) && canSetChannelAttributeOnCreate(field, canManageSystem);
}

// A field the server will require from this caller (required, and the caller's
// tier passes canSetChannelAttributeOnCreate) but that has no mobile editor at
// all. observeCreatableChannelAttributeFields drops it for the same reason a
// sysadmin-only field is dropped — there is nothing to render — but unlike the
// sysadmin case the server does *not* also skip the requirement here, since the
// tier check passes. Left undetected, the create screen would let Create be
// tapped with no way to have supplied a value the server then rejects.
function isBlockingUnsupportedWith(canManageSystem: boolean) {
    return (field: ChannelAttributeField) => isPropertyFieldRequired(field) && !hasAttributeEditor(field) && canSetChannelAttributeOnCreate(field, canManageSystem);
}

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
                const creatable = fields.filter(isCreatableWith(canManageSystem)).sort(compareChannelAttributeFields);
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
            map((canManageSystem) => fields.some(isBlockingUnsupportedWith(canManageSystem))),
        )),
        distinctUntilChanged(),
    );
};
