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
 * The classification field is a safe fallback for recovering the group ID when
 * the System record is missing. Object type alone is not safe because other
 * property groups also store channel fields.
 */
export async function removeStoredFields(serverUrl: string) {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    let groupId = await getAccessControlGroupId(database);
    if (!groupId) {
        const classificationFields = await getPropertyFieldsByNames(database, [CLASSIFICATIONS_FIELD_NAME]);
        groupId = classificationFields[0]?.groupId ?? '';
    }

    const candidates = groupId ? await getPropertyFieldsByGroupId(database, groupId) : [];

    // Narrowed to the object types this feature owns. The group is shared — user
    // and session fields live in it too — and those belong to other features that
    // are not being turned off here.
    const stale = candidates.filter((f) => OWNED_OBJECT_TYPES.has(f.objectType as PropertyFieldObjectType));

    if (stale.length) {
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
