// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OWNED_OBJECT_TYPES} from '@constants/channel_attributes';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getAccessControlGroupId, getPropertyFieldsByGroupId, getPropertyFieldsByObjectTypes} from '@queries/servers/properties';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {PropertyFieldModel} from '@database/models/server';

/**
 * Clears the local definitions for this group.
 *
 * Scoped by group id where it is known. When the System table entry is empty
 * (fetch never ran), WS-delivered field rows still carry their own group_id, so
 * we recover it from any locally-stored field with an owned object type. This
 * ensures non-classification channel-attribute fields are cleaned up too, not
 * just the 'classification'-named field.
 */
export async function removeStoredFields(serverUrl: string) {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const groupId = await getAccessControlGroupId(database);

    let inGroup: PropertyFieldModel[];
    if (groupId) {
        inGroup = await getPropertyFieldsByGroupId(database, groupId);
    } else {
        // Recover group id from any locally-stored field with an owned object type.
        // WS events write fields with their group_id populated even when the System
        // table entry is still empty. All owned fields share the same group.
        const ownedByType = await getPropertyFieldsByObjectTypes(database, [...OWNED_OBJECT_TYPES]);
        const recoveredGroupId = ownedByType[0]?.groupId ?? '';
        inGroup = recoveredGroupId ? await getPropertyFieldsByGroupId(database, recoveredGroupId) : [];
    }

    // Narrowed to the object types this feature owns. The group is shared — user
    // and session fields live in it too — and those belong to other features that
    // are not being turned off here.
    const stale = inGroup.filter((f) => OWNED_OBJECT_TYPES.has(f.objectType as PropertyFieldObjectType));

    if (stale.length) {
        // Passing delete_at causes the operator to permanently destroy the records and
        // cascade-delete their associated property values.
        // If this throws, the group ID is not cleared below — but the next call to
        // removeStoredFields will find no matching fields and clear it successfully.
        await operator.handlePropertyFields({
            fields: stale.map((f) => ({id: f.id, delete_at: Date.now()} as PropertyField)),
            prepareRecordsOnly: false,
        });
    }

    const {error} = await setAccessControlGroupId(serverUrl, '');
    if (error) {
        throw error;
    }
}

export async function setAccessControlGroupId(serverUrl: string, groupId: string) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.ACCESS_CONTROL_GROUP_ID, value: groupId}],
            prepareRecordsOnly: false,
        });

        return {data: true};
    } catch (error) {
        logError('setAccessControlGroupId', getFullErrorMessage(error));
        return {error};
    }
}
