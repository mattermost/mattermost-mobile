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
    type ChannelAttributeCreateFlags,
    type ChannelAttributeField,
    type ChannelAttributePermissions,
} from '@utils/channel_attributes';

import {observeChannel} from './channel';
import {observeChannelAttributeFields, observeChannelAttributesRequiredEnabled, observeClassificationMarkingsEnabled} from './properties';
import {observeCanManageSystem, observePermissionForChannel} from './role';
import {observeCurrentUser} from './user';

import type {Database} from '@nozbe/watermelondb';

const NO_PERMISSIONS: ChannelAttributePermissions = {
    canManageChannelProperties: false,
    canManageChannelRoles: false,
    canManageSystem: false,
};

/**
 * The server checks both the channel-level manage_*_channel_properties gate and the
 * field's permission_values tier (sysadmin: manage_system, admin: manage_channel_roles).
 * Archived channels, DMs and GMs get nothing; mobile does not offer attributes there.
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

const observeCreateInputs = (database: Database): Observable<[ChannelAttributeField[], boolean, ChannelAttributeCreateFlags]> => {
    const flags = combineLatest([
        observeChannelAttributesRequiredEnabled(database),
        observeClassificationMarkingsEnabled(database),
    ]).pipe(
        map(([requiredEnforced, classificationAvailable]) => ({requiredEnforced, classificationAvailable})),
    );

    return combineLatest([
        observeChannelAttributeFields(database),
        observeCurrentUser(database).pipe(switchMap((user) => observeCanManageSystem(database, user))),
        flags,
    ]);
};

export const observeCreatableChannelAttributeFields = (database: Database): Observable<ChannelAttributeField[]> => {
    return observeCreateInputs(database).pipe(
        map(([fields, canManageSystem, flags]) => {
            const creatable = getCreatableChannelAttributeFields(fields, canManageSystem, flags);
            return creatable.length === 0 ? EMPTY_CREATABLE_FIELDS : creatable;
        }),
        map((creatable) => ({creatable, signature: creatableFieldsSignature(creatable)})),
        distinctUntilChanged((a, b) => a.signature === b.signature),
        map(({creatable}) => creatable),
    );
};

export const observeChannelAttributeCreationBlocked = (database: Database): Observable<boolean> => {
    return observeCreateInputs(database).pipe(
        map(([fields, canManageSystem, flags]) => hasCreationBlockingChannelAttribute(fields, canManageSystem, flags)),
        distinctUntilChanged(),
    );
};
