// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {setPlaybooksVersion} from '@playbooks/actions/local/version';
import {PLAYBOOKS_PLUGIN_ID} from '@playbooks/constants/plugin';

import {updatePlaybooksVersion} from './version';

const serverUrl = 'baseHandler.test.com';

const mockManifest = {
    id: PLAYBOOKS_PLUGIN_ID,
    version: '2.0.0',
};

jest.mock('@playbooks/actions/local/version');

const mockClient = {
    getPluginsManifests: jest.fn(),
};

const throwFunc = () => {
    throw Error('error');
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

describe('updatePlaybooksVersion', () => {
    it('should handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await updatePlaybooksVersion(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('should update playbooks version successfully when manifest found', async () => {
        mockClient.getPluginsManifests.mockResolvedValueOnce([mockManifest]);

        const result = await updatePlaybooksVersion(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(setPlaybooksVersion).toHaveBeenCalledWith(serverUrl, '2.0.0');
    });

    it('should handle when playbooks manifest not found', async () => {
        mockClient.getPluginsManifests.mockResolvedValueOnce([
            {id: 'other-plugin', version: '1.0.0'},
        ]);

        const result = await updatePlaybooksVersion(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(setPlaybooksVersion).toHaveBeenCalledWith(serverUrl, '');
    });

    it('should handle empty manifests array', async () => {
        mockClient.getPluginsManifests.mockResolvedValueOnce([]);

        const result = await updatePlaybooksVersion(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(setPlaybooksVersion).toHaveBeenCalledWith(serverUrl, '');
    });
});
