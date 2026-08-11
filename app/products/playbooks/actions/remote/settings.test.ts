// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {setPlaybooksTaskRequirementsEnabled} from '@playbooks/actions/local/settings';

import {updatePlaybooksSettings} from './settings';

const serverUrl = 'baseHandler.test.com';

jest.mock('@playbooks/actions/local/settings');

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
        expect(setPlaybooksTaskRequirementsEnabled).toHaveBeenCalledWith(serverUrl, true);
    });
});
