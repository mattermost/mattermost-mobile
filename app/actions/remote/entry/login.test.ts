// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {initializeE2EEManager} from '@e2ee/setup';

import {fetchConfigAndLicense} from '@actions/remote/systems';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import IntuneManager from '@managers/intune_manager';
import WebsocketManager from '@managers/websocket_manager';

import {loginEntry} from './login';

jest.mock('@actions/remote/systems');
jest.mock('@init/credentials');
jest.mock('@e2ee/setup');
jest.mock('@managers/intune_manager');
jest.mock('@managers/performance_metrics_manager');
jest.mock('@managers/security_manager');
jest.mock('@managers/websocket_manager');

describe('actions/remote/entry/login', () => {
    const serverUrl = 'https://server.example.com';
    const mockOperator = {};

    beforeEach(() => {
        jest.clearAllMocks();

        DatabaseManager.serverDatabases = {
            [serverUrl]: {operator: mockOperator} as any,
        };

        jest.mocked(fetchConfigAndLicense).mockResolvedValue({config: {} as ClientConfig, license: {} as ClientLicense});
        jest.mocked(IntuneManager.getPolicy).mockResolvedValue(null);
        jest.mocked(WebsocketManager.createClient).mockReturnValue({} as any);
        jest.mocked(WebsocketManager.initializeClient).mockResolvedValue(undefined);
    });

    describe('loginEntry', () => {
        it('should return error when database operator is not found', async () => {
            DatabaseManager.serverDatabases = {};

            const result = await loginEntry({serverUrl});

            expect(result).toEqual({error: `${serverUrl} database not found`});
        });

        it('should return error when fetchConfigAndLicense fails', async () => {
            const fetchError = new Error('network error');
            jest.mocked(fetchConfigAndLicense).mockResolvedValue({error: fetchError} as any);

            const result = await loginEntry({serverUrl});

            expect(result).toEqual({error: fetchError});
        });

        it('should call initializeE2EEManager before creating websocket client when credentials are available', async () => {
            jest.mocked(getServerCredentials).mockResolvedValue({token: 'test-token'} as any);

            const callOrder: string[] = [];
            jest.mocked(initializeE2EEManager).mockImplementation(() => {
                callOrder.push('initializeE2EEManager');
            });
            jest.mocked(WebsocketManager.createClient).mockImplementation(() => {
                callOrder.push('createClient');
                return {} as any;
            });

            await loginEntry({serverUrl});

            expect(callOrder).toEqual(['initializeE2EEManager', 'createClient']);
        });

        it('should call initializeE2EEManager with the correct serverUrl', async () => {
            jest.mocked(getServerCredentials).mockResolvedValue({token: 'test-token'} as any);

            await loginEntry({serverUrl});

            expect(initializeE2EEManager).toHaveBeenCalledTimes(1);
            expect(initializeE2EEManager).toHaveBeenCalledWith(serverUrl);
        });

        it('should not call initializeE2EEManager when no credentials are found', async () => {
            jest.mocked(getServerCredentials).mockResolvedValue(null);

            await loginEntry({serverUrl});

            expect(initializeE2EEManager).not.toHaveBeenCalled();
        });

        it('should not call initializeE2EEManager when credentials have no token', async () => {
            jest.mocked(getServerCredentials).mockResolvedValue({token: ''} as any);

            await loginEntry({serverUrl});

            expect(initializeE2EEManager).not.toHaveBeenCalled();
        });
    });
});
