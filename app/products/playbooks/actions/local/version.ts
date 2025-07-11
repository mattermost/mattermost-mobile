// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

export const setPlaybooksVersion = async (serverUrl: string, version: string) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION,
                value: version,
            }],
            prepareRecordsOnly: false,
        });

        return {data: true};
    } catch (error) {
        return {error};
    }
};
