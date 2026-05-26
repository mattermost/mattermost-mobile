// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getPersistedPropertyFields, getPersistedPropertyGroupNames, getPersistedPropertyValues} from '@queries/servers/properties';
import {
    getFieldStoreSnapshot,
    getGroupNameSnapshot,
    getValueStoreSnapshot,
    setAllPropertyData,
} from '@store/system_property_store';
import {logDebug, logError} from '@utils/log';

/**
 * Writes the current ephemeral property store snapshot to the server's System table.
 * Called by action callers after store mutations are complete.
 */
export async function persistPropertyStoreSnapshot(serverUrl: string): Promise<void> {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const fieldsByGroup = getFieldStoreSnapshot(serverUrl);
        const valuesByTarget = getValueStoreSnapshot(serverUrl);
        const groupNames = getGroupNameSnapshot(serverUrl);

        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: fieldsByGroup},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: valuesByTarget},
                {id: SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES, value: groupNames},
            ],
            prepareRecordsOnly: false,
        });
    } catch (error) {
        logError('persistPropertyStoreSnapshot', error);
    }
}

/**
 * Reads persisted property data from the server's System table and populates
 * the ephemeral property store.
 */
export async function hydratePropertyStore(serverUrl: string): Promise<void> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const [fieldsByGroup, valuesByTarget, groupNames] = await Promise.all([
            getPersistedPropertyFields(database),
            getPersistedPropertyValues(database),
            getPersistedPropertyGroupNames(database),
        ]);

        if (fieldsByGroup === undefined || valuesByTarget === undefined || groupNames === undefined) {
            logDebug('hydratePropertyStore', 'No persisted property data found, keeping in-memory state');
            return;
        }

        setAllPropertyData(serverUrl, {fieldsByGroup, valuesByTarget, groupNames});
    } catch (error) {
        logError('hydratePropertyStore', error);
    }
}
