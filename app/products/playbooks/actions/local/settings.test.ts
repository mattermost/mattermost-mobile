// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {querySystemValue} from '@queries/servers/system';

import {setPlaybooksTaskRequirementsEnabled} from './settings';

const serverUrl = 'baseHandler.test.com';

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('setPlaybooksTaskRequirementsEnabled', () => {
    it('should persist the task requirements setting', async () => {
        const result = await setPlaybooksTaskRequirementsEnabled(serverUrl, true);
        expect(result).toEqual({data: true});

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const systemValues = await querySystemValue(database, SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED);
        expect(systemValues).toHaveLength(1);
        expect(systemValues[0].value).toBe(true);
    });
});
