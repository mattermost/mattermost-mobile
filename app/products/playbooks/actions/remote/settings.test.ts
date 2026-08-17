// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {querySystemValue} from '@queries/servers/system';

import {updatePlaybooksSettings} from './settings';

const serverUrl = 'baseHandler.test.com';

const mockClient = {
    fetchPlaybooksSettings: jest.fn(),
};

beforeAll(() => {
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('updatePlaybooksSettings', () => {
    it('should fetch settings and persist task requirements flag', async () => {
        mockClient.fetchPlaybooksSettings.mockResolvedValueOnce({
            enable_experimental_features: false,
            enable_task_requirements: true,
        });

        const result = await updatePlaybooksSettings(serverUrl);
        expect(result).toEqual({
            data: {
                enable_experimental_features: false,
                enable_task_requirements: true,
            },
        });

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const systemValues = await querySystemValue(database, SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED);
        expect(systemValues).toHaveLength(1);
        expect(systemValues[0].value).toBe(true);
    });
});
