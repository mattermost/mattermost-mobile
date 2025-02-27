// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$} from 'rxjs';

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getChannelById} from '@queries/servers/channel';
import {getConfig} from '@queries/servers/system';
import {logDebug} from '@utils/log';

import {AppsManagerSingleton as AppsManagerClass} from './apps_manager';

import type ChannelModel from '@typings/database/models/servers/channel';

jest.mock('@database/manager', () => ({
    default: {
        getServerDatabaseAndOperator: jest.fn(),
    },
}));
jest.mock('@managers/network_manager', () => ({
    default: {
        getClient: jest.fn(),
    },
}));
jest.mock('@queries/servers/channel', () => ({
    getChannelById: jest.fn(() => ({id: 'channel_id', teamId: 'team_id'})),
}));
jest.mock('@queries/servers/system', () => ({
    getConfig: jest.fn(),
    getCurrentUserId: jest.fn(() => 'user_id'),
    getCurrentTeamId: jest.fn(() => 'team_id'),
    getCurrentChannelId: jest.fn(() => 'channel_id'),
}));

jest.mock('@utils/apps', () => ({
    validateBindings: jest.fn(() => []),
}));
jest.mock('@utils/log');

describe('AppsManager', () => {
    const mockServerUrl = 'https://example.com';
    const mockChannelId = 'channel_id';
    const mockBindings: AppBinding[] = [
        {
            location: 'test_location',
            bindings: [{
                app_id: 'test_app_id',
                location: 'sub_location',
                label: 'Test Binding',
            }],
            app_id: 'test_app_id',
            label: 'test_label',
        },
    ];

    let AppsManager: AppsManagerClass;

    beforeEach(() => {
        jest.clearAllMocks();

        const mockDatabase = {
            database: {},
            operator: {},
        };
        DatabaseManager.getServerDatabaseAndOperator = jest.fn();
        (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockReturnValue(mockDatabase);

        const mockClient = {
            getAppsBindings: jest.fn().mockResolvedValue(mockBindings),
        };
        NetworkManager.getClient = jest.fn();
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        AppsManager = new AppsManagerClass();
    });

    it('initializes with empty bindings', () => {
        const bindings = AppsManager.getBindings(mockServerUrl);
        expect(bindings).toEqual([]);
    });

    describe('apps enabled state', () => {
        beforeEach(() => {
            const mockConfig = {
                FeatureFlagAppsEnabled: 'true',
            } as ClientConfig;
            jest.mocked(getConfig).mockResolvedValue(mockConfig);
        });

        it('should return true when apps are enabled', async () => {
            const enabled = await AppsManager.isAppsEnabled(mockServerUrl);
            expect(enabled).toBe(true);
        });

        it('should return false when database error occurs', async () => {
            (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockImplementation(() => {
                throw new Error('Database error');
            });

            const enabled = await AppsManager.isAppsEnabled(mockServerUrl);
            expect(enabled).toBe(false);
        });

        it('should observe apps enabled state', async () => {
            const mockObservable = of$(false);
            jest.spyOn(AppsManager, 'observeIsAppsEnabled').mockReturnValue(mockObservable);

            const result = await new Promise((resolve) => {
                AppsManager.observeIsAppsEnabled(mockServerUrl).subscribe((enabled) => {
                    resolve(enabled);
                });
            });

            expect(result).toBe(false);
        });

        it('should handle database error in observeIsAppsEnabled', async () => {
            (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockImplementation(() => {
                throw new Error('Database error');
            });

            const result = await new Promise((resolve) => {
                AppsManager.observeIsAppsEnabled(mockServerUrl).subscribe((enabled) => {
                    resolve(enabled);
                });
            });

            expect(result).toBe(false);
        });
    });

    describe('bindings management', () => {
        it('should fetch bindings successfully', async () => {
            await AppsManager.fetchBindings(mockServerUrl, mockChannelId);
            expect(NetworkManager.getClient).toHaveBeenCalledWith(mockServerUrl);
            expect(NetworkManager.getClient(mockServerUrl).getAppsBindings).toHaveBeenCalled();
        });

        it('should handle fetch bindings error', async () => {
            const error = new Error('Network error');
            jest.mocked(NetworkManager.getClient(mockServerUrl).getAppsBindings).mockRejectedValue(error);

            await AppsManager.fetchBindings(mockServerUrl, mockChannelId);
            expect(logDebug).toHaveBeenCalledWith('error on fetchBindings', expect.any(String));
        });

        it('should fetch bindings successfully for DM channel and thread', async () => {
            jest.mocked(getChannelById).mockResolvedValue({id: 'channel_id', teamId: ''} as ChannelModel);

            await AppsManager.fetchBindings(mockServerUrl, mockChannelId, true);

            expect(NetworkManager.getClient).toHaveBeenCalledWith(mockServerUrl);
            expect(NetworkManager.getClient(mockServerUrl).getAppsBindings).toHaveBeenCalled();
        });

        it('should clear bindings', async () => {
            await AppsManager.clearBindings(mockServerUrl);
            const bindings = AppsManager.getBindings(mockServerUrl);
            expect(bindings).toEqual([]);
        });

        it('should copy main bindings to thread', async () => {
            const channelId = 'test_channel';
            await AppsManager.copyMainBindingsToThread(mockServerUrl, channelId);
            const threadBindings = AppsManager.getBindings(mockServerUrl, undefined, true);
            expect(threadBindings).toEqual([]);
        });

        it('should observe bindings changes', async () => {
            const mockObservable = of$([]);
            jest.spyOn(AppsManager, 'observeBindings').mockReturnValue(mockObservable);

            const result = await new Promise((resolve) => {
                AppsManager.observeBindings(mockServerUrl).subscribe((bindings) => {
                    resolve(bindings);
                });
            });

            expect(result).toEqual([]);
        });

        it('should observe bindings with location filter', async () => {
            const location = 'test_location';
            const result = await new Promise((resolve) => {
                AppsManager.observeBindings(mockServerUrl, location).subscribe((bindings) => {
                    resolve(bindings);
                });
            });

            expect(result).toEqual([]);
        });

        it('should refresh app bindings successfully', async () => {
            const mockConfig = {FeatureFlagAppsEnabled: 'true'} as ClientConfig;
            jest.mocked(getConfig).mockResolvedValue(mockConfig);

            const mockClient = {
                getAppsBindings: jest.fn().mockResolvedValue(mockBindings),
            };
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

            await AppsManager.refreshAppBindings(mockServerUrl);

            expect(NetworkManager.getClient).toHaveBeenCalledWith(mockServerUrl);
            expect(mockClient.getAppsBindings).toHaveBeenCalledWith('user_id', mockChannelId, 'team_id', undefined);
        });

        it('should handle error in refreshAppBindings', async () => {
            const error = new Error('Refresh error');
            (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockImplementation(() => {
                throw error;
            });

            await AppsManager.refreshAppBindings(mockServerUrl);

            expect(logDebug).toHaveBeenCalledWith('Error refreshing apps', error);
        });

        it('should clear bindings when apps are disabled', async () => {
            const mockConfig = {FeatureFlagAppsEnabled: 'false'} as ClientConfig;
            jest.mocked(getConfig).mockResolvedValue(mockConfig);

            await AppsManager.refreshAppBindings(mockServerUrl);

            const bindings = AppsManager.getBindings(mockServerUrl);
            expect(bindings).toEqual([]);
        });
    });

    describe('command forms', () => {
        beforeEach(() => {
            // Clear any existing forms before each test
            AppsManager.removeServer(mockServerUrl);
        });
        const mockForm: AppForm = {
            title: 'Test Form',
            fields: [],
        };

        it('should set and get command form', () => {
            const key = 'test_key';

            AppsManager.setCommandForm(mockServerUrl, key, mockForm);
            const form = AppsManager.getCommandForm(mockServerUrl, key);
            const nonExistentForm = AppsManager.getCommandForm(mockServerUrl, 'non_existent');

            expect(form).toEqual(mockForm);
            expect(nonExistentForm).toBeUndefined();
        });

        it('should handle thread command forms separately', () => {
            // Clear any existing forms
            AppsManager.removeServer(mockServerUrl);

            // Set form for thread context only
            AppsManager.setCommandForm(mockServerUrl, 'test_key', mockForm, true);

            // Get forms for both contexts
            const threadForm = AppsManager.getCommandForm(mockServerUrl, 'test_key', true);
            const regularForm = AppsManager.getCommandForm(mockServerUrl, 'test_key', false);

            // Verify thread form exists and regular form doesn't
            expect(threadForm).toEqual(mockForm);
            expect(regularForm).toBeUndefined();
        });
    });

    describe('server management', () => {
        it('should remove server data', () => {
            AppsManager.setCommandForm(mockServerUrl, 'test_key', {title: 'Test'});
            AppsManager.removeServer(mockServerUrl);

            const form = AppsManager.getCommandForm(mockServerUrl, 'test_key');
            expect(form).toBeUndefined();
        });

        it('should clear server data', async () => {
            AppsManager.setCommandForm(mockServerUrl, 'test_key', {title: 'Test'});
            await AppsManager.clearServer(mockServerUrl);

            const form = AppsManager.getCommandForm(mockServerUrl, 'test_key');
            const bindings = AppsManager.getBindings(mockServerUrl);

            expect(form).toBeUndefined();
            expect(bindings).toEqual([]);
        });
    });
});
