// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

export const setPlaybooksTaskRequirementsEnabled = async (serverUrl: string, enabled: boolean) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED,
                value: enabled,
            }],
            prepareRecordsOnly: false,
        });
        return {data: true};
    } catch (error) {
        return {error};
    }
};
