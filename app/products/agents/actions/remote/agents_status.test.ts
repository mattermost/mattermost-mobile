// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setAgentsConfig} from '@agents/store/agents_config';

import NetworkManager from '@managers/network_manager';

import {checkIsAgentsPluginEnabled} from './agents_status';

jest.mock('@managers/network_manager');
jest.mock('@agents/store/agents_config');
jest.mock('@utils/log');

describe('checkIsAgentsPluginEnabled', () => {
    const serverUrl = 'https://server.example.com';

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('should set pluginEnabled to true when API returns available: true', async () => {
        const getAgentsStatus = jest.fn().mockResolvedValue({available: true});
        jest.mocked(NetworkManager.getClient).mockReturnValue({getAgentsStatus} as any);

        const result = await checkIsAgentsPluginEnabled(serverUrl);

        expect(getAgentsStatus).toHaveBeenCalled();
        expect(setAgentsConfig).toHaveBeenCalledWith(serverUrl, {pluginEnabled: true});
        expect(result).toEqual({data: true});
    });

    it('should set pluginEnabled to false when API returns available: false', async () => {
        const getAgentsStatus = jest.fn().mockResolvedValue({available: false});
        jest.mocked(NetworkManager.getClient).mockReturnValue({getAgentsStatus} as any);

        const result = await checkIsAgentsPluginEnabled(serverUrl);

        expect(setAgentsConfig).toHaveBeenCalledWith(serverUrl, {pluginEnabled: false});
        expect(result).toEqual({data: false});
    });

    it('should not update config and return error when API call fails', async () => {
        const error = new Error('network error');
        const getAgentsStatus = jest.fn().mockRejectedValue(error);
        jest.mocked(NetworkManager.getClient).mockReturnValue({getAgentsStatus} as any);

        const result = await checkIsAgentsPluginEnabled(serverUrl);

        expect(setAgentsConfig).not.toHaveBeenCalled();
        expect(result).toEqual({error});
    });
});
