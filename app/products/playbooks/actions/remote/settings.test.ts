// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {
    MINIMUM_MAJOR_VERSION,
    MINIMUM_MINOR_VERSION,
    MINIMUM_PATCH_VERSION,
} from '@playbooks/constants/version';
import {querySystemValue} from '@queries/servers/system';

import {updatePlaybooksSettings} from './settings';

const serverUrl = 'baseHandler.test.com';
const minimumVersion = `${MINIMUM_MAJOR_VERSION}.${MINIMUM_MINOR_VERSION}.${MINIMUM_PATCH_VERSION}`;

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
    it('should skip the settings fetch when playbooks is below the minimum version', async () => {
        const result = await updatePlaybooksSettings(serverUrl);

        expect(result).toEqual({
            data: {
                enable_experimental_features: false,
                enable_task_requirements: false,
            },
        });
        expect(mockClient.fetchPlaybooksSettings).not.toHaveBeenCalled();
    });

    it('should clear a stale task-requirements flag when playbooks is below the minimum version', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED, value: true}],
            prepareRecordsOnly: false,
        });

        const result = await updatePlaybooksSettings(serverUrl);

        expect(result).toEqual({
            data: {
                enable_experimental_features: false,
                enable_task_requirements: false,
            },
        });
        expect(mockClient.fetchPlaybooksSettings).not.toHaveBeenCalled();

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const systemValues = await querySystemValue(database, SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED);
        expect(systemValues).toHaveLength(1);
        expect(systemValues[0].value).toBe(false);
    });

    it('should fetch settings and persist task requirements flag', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION, value: minimumVersion}],
            prepareRecordsOnly: false,
        });

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
