// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

/**
 * Records the resolved id of the access_control property group.
 *
 * Persisted rather than held in memory because every channel-attribute query
 * scopes itself by this id: property rows carry a group_id but nothing maps a
 * group *name* to it locally, and other features store channel-object fields in
 * the same table. Keeping it in memory meant a cold start with no network showed
 * no chips and no banner even though the rows were on disk.
 *
 * An empty value clears it, which is what turning the feature off does.
 */
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
