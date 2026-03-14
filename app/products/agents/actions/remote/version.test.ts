// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setAgentsVersion} from '@agents/actions/local/version';
import {AGENTS_PLUGIN_ID} from '@agents/constants/plugin';

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {updateAgentsVersion} from './version';

const serverUrl = 'agents-remote-version.test.com';

const mockManifest = {
    id: AGENTS_PLUGIN_ID,
    version: '2.0.0',
};

jest.mock('@agents/actions/local/version');
jest.mock('@actions/remote/session');

const mockClient = {
    getPluginsManifests: jest.fn(),
};

beforeAll(() => {
    (NetworkManager.getClient as jest.Mock) = jest.fn(() => mockClient);
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('updateAgentsVersion', () => {
    it('should handle client error and force logout if necessary', async () => {
        const error = new Error('error');
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(() => {
            throw error;
        });

        const result = await updateAgentsVersion(serverUrl);

        expect(result.error).toBe(error);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
    });

    it('should update agents version successfully when manifest found', async () => {
        mockClient.getPluginsManifests.mockResolvedValueOnce([mockManifest]);

        const result = await updateAgentsVersion(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(setAgentsVersion).toHaveBeenCalledWith(serverUrl, '2.0.0');
    });

    it('should handle when agents manifest not found', async () => {
        mockClient.getPluginsManifests.mockResolvedValueOnce([
            {id: 'other-plugin', version: '1.0.0'},
        ]);

        const result = await updateAgentsVersion(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);

        // setAgentsVersion not called because current version ('') equals new version ('')
        expect(setAgentsVersion).not.toHaveBeenCalled();
    });

});
