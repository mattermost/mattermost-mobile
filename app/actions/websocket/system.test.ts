// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateDmGmDisplayName} from '@actions/local/channel';
import {storeConfig} from '@actions/local/systems';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import SessionAttributesManager from '@managers/session_attributes_manager';
import {getConfig, getLicense} from '@queries/servers/system';

import {handleLicenseChangedEvent, handleConfigChangedEvent} from './system';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@actions/local/channel');
jest.mock('@actions/local/systems');
jest.mock('@database/manager');
jest.mock('@managers/session_attributes_manager', () => ({
    __esModule: true,
    default: {
        refreshManifest: jest.fn().mockResolvedValue(undefined),
        removeServer: jest.fn(),
    },
}));
jest.mock('@queries/servers/system');

describe('WebSocket System Actions', () => {
    const serverUrl = 'baseHandler.test.com';

    let operator: ServerDataOperator;
    let handleSystem: jest.SpyInstance;

    beforeEach(async () => {
        jest.clearAllMocks();

        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        handleSystem = jest.spyOn(operator, 'handleSystem');
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.restoreAllMocks();
    });

    describe('handleLicenseChangedEvent', () => {
        it('should handle missing operator', async () => {
            DatabaseManager.serverDatabases = {};
            const msg = {
                data: {
                    license: {
                        LockTeammateNameDisplay: true,
                    },
                },
            } as WebSocketMessage;
            await handleLicenseChangedEvent(serverUrl, msg);
            expect(handleSystem).not.toHaveBeenCalled();
        });

        it('should handle license update with no display name change', async () => {
            const mockLicense = {
                LockTeammateNameDisplay: false,
            };

            jest.mocked(getLicense).mockResolvedValue({
                LockTeammateNameDisplay: 'false',
            } as ClientLicense);

            const msg = {
                data: {
                    license: mockLicense,
                },
            } as WebSocketMessage;

            await handleLicenseChangedEvent(serverUrl, msg);

            expect(handleSystem).toHaveBeenCalledWith({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.LICENSE,
                    value: JSON.stringify(mockLicense),
                }],
                prepareRecordsOnly: false,
            });
            expect(updateDmGmDisplayName).not.toHaveBeenCalled();
        });

        it('should handle license update with display name change', async () => {
            const mockLicense = {
                LockTeammateNameDisplay: true,
            };

            jest.mocked(getLicense).mockResolvedValue({
                LockTeammateNameDisplay: 'false',
            } as ClientLicense);

            const msg = {
                data: {
                    license: mockLicense,
                },
            } as WebSocketMessage;

            await handleLicenseChangedEvent(serverUrl, msg);

            expect(handleSystem).toHaveBeenCalled();
            expect(updateDmGmDisplayName).toHaveBeenCalledWith(serverUrl);
        });
    });

    describe('handleConfigChangedEvent', () => {
        it('should handle missing operator', async () => {
            DatabaseManager.serverDatabases = {};
            const msg = {
                data: {
                    config: {
                        LockTeammateNameDisplay: true,
                    },
                },
            } as WebSocketMessage;
            await handleConfigChangedEvent(serverUrl, msg);
            expect(storeConfig).not.toHaveBeenCalled();
        });

        it('should handle config update with no display name change', async () => {
            const mockConfig = {
                LockTeammateNameDisplay: false,
            };

            jest.mocked(getConfig).mockResolvedValue({
                LockTeammateNameDisplay: 'false',
            } as ClientConfig);

            const msg = {
                data: {
                    config: mockConfig,
                },
            } as WebSocketMessage;

            await handleConfigChangedEvent(serverUrl, msg);

            expect(storeConfig).toHaveBeenCalledWith(serverUrl, mockConfig);
            expect(updateDmGmDisplayName).not.toHaveBeenCalled();
        });

        it('should handle config update with display name change', async () => {
            const mockConfig = {
                LockTeammateNameDisplay: true,
            };

            jest.mocked(getConfig).mockResolvedValue({
                LockTeammateNameDisplay: 'false',
            } as ClientConfig);

            const msg = {
                data: {
                    config: mockConfig,
                },
            } as WebSocketMessage;

            await handleConfigChangedEvent(serverUrl, msg);

            expect(storeConfig).toHaveBeenCalledWith(serverUrl, mockConfig);
            expect(updateDmGmDisplayName).toHaveBeenCalledWith(serverUrl);
        });

        it('should re-init session attributes when feature flag is enabled', async () => {
            jest.mocked(getConfig).mockResolvedValue({
                FeatureFlagSessionAttributes: 'false',
            } as ClientConfig);

            const msg = {
                data: {
                    config: {
                        FeatureFlagSessionAttributes: 'true',
                    },
                },
            } as WebSocketMessage;

            await handleConfigChangedEvent(serverUrl, msg);

            expect(SessionAttributesManager.refreshManifest).toHaveBeenCalledWith(serverUrl);
        });

        it('should stop sending session attributes when feature flag is disabled', async () => {
            jest.mocked(getConfig).mockResolvedValue({
                FeatureFlagSessionAttributes: 'true',
            } as ClientConfig);

            const msg = {
                data: {
                    config: {
                        FeatureFlagSessionAttributes: 'false',
                    },
                },
            } as WebSocketMessage;

            await handleConfigChangedEvent(serverUrl, msg);

            expect(SessionAttributesManager.removeServer).toHaveBeenCalledWith(serverUrl);
        });
    });
});
