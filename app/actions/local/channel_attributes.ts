// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OWNED_OBJECT_TYPES} from '@constants/channel_attributes';
import {CLASSIFICATIONS_FIELD_NAME} from '@constants/classification';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getAccessControlGroupId, getPropertyFieldsByGroupId, getPropertyFieldsByNames} from '@queries/servers/properties';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

/**
 * Clears the local definitions for this group.
 *
 * Scoped by group id where it is known, so turning the feature off removes every
 * attribute rather than only classification's. The name-based lookup is the
 * fallback for the case where nothing has fetched yet and the group id was never
 * learned — websocket field events write rows without it.
 */
export async function removeStoredFields(serverUrl: string) {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const groupId = await getAccessControlGroupId(database);
    const inGroup = groupId ?
        await getPropertyFieldsByGroupId(database, groupId) :
        await getPropertyFieldsByNames(database, [CLASSIFICATIONS_FIELD_NAME]);

    // Narrowed to the object types this feature owns. The group is shared — user
    // and session fields live in it too — and those belong to other features that
    // are not being turned off here.
    const stale = inGroup.filter((f) => OWNED_OBJECT_TYPES.has(f.objectType as PropertyFieldObjectType));

    if (stale.length) {
        await operator.handlePropertyFields({
            fields: stale.map((f) => ({id: f.id, delete_at: Date.now()} as PropertyField)),
            prepareRecordsOnly: false,
        });
    }

    await setAccessControlGroupId(serverUrl, '');
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
