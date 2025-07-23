// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

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

        if (version === '') {
            const {error} = await purgePlaybooks(serverUrl);
            if (error) {
                return {error};
            }
        }

        return {data: true};
    } catch (error) {
        return {error};
    }
};

const purgePlaybooks = async (serverUrl: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await database.write(() => {
            return database.adapter.unsafeExecute({
                sqls: [
                    [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_RUN}`, []],
                    [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST}`, []],
                    [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM}`, []],
                ],
            });
        });
    } catch (error) {
        return {error};
    }

    return {data: true};
};
