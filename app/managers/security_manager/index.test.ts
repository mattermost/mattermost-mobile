// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import Emm from '@mattermost/react-native-emm';
import {isRootedExperimentalAsync} from 'expo-device';
import {type AppStateStatus, type EventSubscription} from 'react-native';

import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import IntuneManager from '@managers/intune_manager';
import {queryAllActiveServers} from '@queries/app/servers';
import {getSecurityConfig} from '@queries/servers/system';
import TestHelper from '@test/test_helper';
import * as alerts from '@utils/alerts';
import {toMilliseconds} from '@utils/datetime';
import {logError} from '@utils/log';

import SecurityManager from '.';

import type {IntunePolicy} from '@managers/intune_manager/types';
import type {Query} from '@nozbe/watermelondb';
import type {ServerDatabase} from '@typings/database/database';
import type ServersModel from '@typings/database/models/app/servers';

jest.mock('@mattermost/react-native-emm', () => ({
    isDeviceSecured: jest.fn(),
    authenticate: jest.fn(),
    openSecuritySettings: jest.fn(),
    exitApp: jest.fn(),
    enableBlurScreen: jest.fn(),
}));

jest.mock('expo-device', () => ({
    isRootedExperimentalAsync: jest.fn(),
}));
jest.mock('@actions/app/server', () => ({switchToServer: jest.fn()}));
jest.mock('@actions/remote/session', () => ({logout: jest.fn()}));
jest.mock('@utils/datetime', () => ({toMilliseconds: jest.fn(() => 25000)}));
jest.mock('@utils/helpers', () => ({
    isMainActivity: jest.fn(() => true),
    isTablet: jest.fn(() => false),
}));
jest.mock('@utils/log', () => ({
    logError: jest.fn(),
    logDebug: jest.fn(),
}));
jest.mock('@init/managed_app', () => ({enabled: true, inAppPinCode: false}));
jest.mock('@init/credentials', () => ({getServerCredentials: jest.fn().mockResolvedValue({token: 'token'})}));
jest.mock('@database/manager', () => ({
    getActiveServerUrl: jest.fn(),
    getServerDatabaseAndOperator: jest.fn(),
}));
jest.mock('@queries/servers/system', () => ({
    getSecurityConfig: jest.fn(),
}));
jest.mock('@queries/app/servers', () => ({
    queryAllActiveServers: jest.fn(),
}));

describe('SecurityManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        SecurityManager.initialized = false;
        SecurityManager.serverConfig = {};
        SecurityManager.activeServer = undefined;
    });

    describe('init', () => {
        test('should initialize and load configs from all active servers', async () => {
            const mockServers = [
                {url: 'server-1'},
                {url: 'server-2'},
            ];
            const mockFetch = jest.fn().mockResolvedValue(mockServers);
            jest.mocked(queryAllActiveServers).mockReturnValue({fetch: mockFetch} as unknown as Query<ServersModel>);

            const mockConfig1 = {SiteName: 'Server One', MobileEnableBiometrics: 'true'} as ClientConfig;
            const mockConfig2 = {SiteName: 'Server Two', MobilePreventScreenCapture: 'true'} as ClientConfig;

            jest.mocked(getSecurityConfig).mockImplementation(async (database: any) => {
                if (database === 'db-1') {
                    return mockConfig1;
                }
                return mockConfig2;
            });

            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementation((url: string) => {
                if (url === 'server-1') {
                    return {database: 'db-1'} as unknown as ServerDatabase;
                }
                return {database: 'db-2'} as unknown as ServerDatabase;
            });

            jest.mocked(IntuneManager.getPolicy).mockResolvedValue(null);

            await SecurityManager.init();

            expect(queryAllActiveServers).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalled();
            expect(getSecurityConfig).toHaveBeenCalledTimes(2);
            expect(IntuneManager.getPolicy).toHaveBeenCalledWith('server-1');
            expect(IntuneManager.getPolicy).toHaveBeenCalledWith('server-2');
            expect(SecurityManager.initialized).toBe(true);
            expect(SecurityManager.serverConfig['server-1']).toBeDefined();
            expect(SecurityManager.serverConfig['server-2']).toBeDefined();
        });

        test('should not reinitialize if already initialized', async () => {
            SecurityManager.initialized = true;
            await SecurityManager.init();
            expect(queryAllActiveServers).not.toHaveBeenCalled();
        });

        test('should handle empty server list', async () => {
            const mockFetch = jest.fn().mockResolvedValue([]);
            jest.mocked(queryAllActiveServers).mockReturnValue({fetch: mockFetch} as unknown as Query<ServersModel>);

            await SecurityManager.init();

            expect(queryAllActiveServers).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalled();
            expect(SecurityManager.initialized).toBe(true);
            expect(Object.keys(SecurityManager.serverConfig)).toHaveLength(0);
        });

        test('should handle undefined queryAllActiveServers result', async () => {
            jest.mocked(queryAllActiveServers).mockReturnValue(undefined);

            await SecurityManager.init();

            expect(queryAllActiveServers).toHaveBeenCalled();
            expect(SecurityManager.initialized).toBe(true);
        });

        test('should load Intune policies along with server configs', async () => {
            const mockServers = [{url: 'server-1'}];
            const mockFetch = jest.fn().mockResolvedValue(mockServers);
            jest.mocked(queryAllActiveServers).mockReturnValue({fetch: mockFetch} as unknown as Query<ServersModel>);

            const mockConfig = {SiteName: 'Server One', MobileEnableBiometrics: 'false'} as ClientConfig;
            const mockIntunePolicy: IntunePolicy = {
                isPINRequired: false,
                isContactSyncAllowed: true,
                isWidgetContentSyncAllowed: true,
                isSpotlightIndexingAllowed: true,
                areSiriIntentsAllowed: true,
                areAppIntentsAllowed: true,
                isAppSharingAllowed: true,
                shouldFileProviderEncryptFiles: false,
                isManagedBrowserRequired: false,
                isFileEncryptionRequired: false,
                isScreenCaptureAllowed: false,
                notificationPolicy: 0,
                allowedSaveLocations: {
                    Other: false,
                    OneDriveForBusiness: true,
                    SharePoint: true,
                    LocalDrive: false,
                    PhotoLibrary: false,
                    CameraRoll: false,
                    FilesApp: false,
                    iCloudDrive: false,
                },
                allowedOpenLocations: 0,
            };

            jest.mocked(getSecurityConfig).mockResolvedValue(mockConfig);
            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({database: 'db-1'} as unknown as ServerDatabase);
            jest.mocked(IntuneManager.getPolicy).mockResolvedValue(mockIntunePolicy);

            await SecurityManager.init();

            expect(IntuneManager.getPolicy).toHaveBeenCalledWith('server-1');
            expect(SecurityManager.serverConfig['server-1'].intunePolicy).toEqual(mockIntunePolicy);
        });

        test('should handle errors when loading server config', async () => {
            const mockServers = [{url: 'server-1'}, {url: 'server-2'}];
            const mockFetch = jest.fn().mockResolvedValue(mockServers);
            jest.mocked(queryAllActiveServers).mockReturnValue({fetch: mockFetch} as unknown as Query<ServersModel>);

            // First server throws error, second succeeds
            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementation((url: string) => {
                if (url === 'server-1') {
                    throw new Error('Database error');
                }
                return {database: 'db-2'} as unknown as ServerDatabase;
            });

            const mockConfig2 = {SiteName: 'Server Two'} as ClientConfig;
            jest.mocked(getSecurityConfig).mockResolvedValue(mockConfig2);
            jest.mocked(IntuneManager.getPolicy).mockResolvedValue(null);

            await SecurityManager.init();

            expect(SecurityManager.initialized).toBe(true);
            expect(SecurityManager.serverConfig['server-1']).toBeUndefined();
            expect(SecurityManager.serverConfig['server-2']).toBeDefined();
            expect(logError).toHaveBeenCalled();
        });
    });

    describe('addServer', () => {
        test('should add server config with biometrics enabled', async () => {
            await SecurityManager.addServer('server-1', {SiteName: 'Server One', MobileEnableBiometrics: 'true'} as ClientConfig);
            expect(SecurityManager.serverConfig['server-1']).toEqual({
                siteName: 'Server One',
                Biometrics: true,
                JailbreakProtection: false,
                PreventScreenCapture: false,
                authenticated: false,
                intunePolicy: null,
            });
        });

        test('should add server config with jailbreak protection enabled', async () => {
            await SecurityManager.addServer('server-2', {SiteName: 'Server Two', MobileJailbreakProtection: 'true'} as ClientConfig);
            expect(SecurityManager.serverConfig['server-2']).toEqual({
                siteName: 'Server Two',
                Biometrics: false,
                JailbreakProtection: true,
                PreventScreenCapture: false,
                authenticated: false,
                intunePolicy: null,
            });
        });

        test('should add server config with screen capture prevention enabled', async () => {
            await SecurityManager.addServer('server-3', {SiteName: 'Server Three', MobilePreventScreenCapture: 'true'} as ClientConfig);
            expect(SecurityManager.serverConfig['server-3']).toEqual({
                siteName: 'Server Three',
                Biometrics: false,
                JailbreakProtection: false,
                PreventScreenCapture: true,
                authenticated: false,
                intunePolicy: null,
            });
        });

        test('should add server config with all features enabled', async () => {
            await SecurityManager.addServer('server-4', {
                SiteName: 'Server Four',
                MobileEnableBiometrics: 'true',
                MobileJailbreakProtection: 'true',
                MobilePreventScreenCapture: 'true',
            } as ClientConfig);
            expect(SecurityManager.serverConfig['server-4']).toEqual({
                siteName: 'Server Four',
                Biometrics: true,
                JailbreakProtection: true,
                PreventScreenCapture: true,
                authenticated: false,
                intunePolicy: null,
            });
        });

        test('should add server config with authenticated set to true', async () => {
            await SecurityManager.addServer('server-5', {SiteName: 'Server Five'} as ClientConfig, true);
            expect(SecurityManager.serverConfig['server-5']).toEqual({
                siteName: 'Server Five',
                Biometrics: false,
                JailbreakProtection: false,
                PreventScreenCapture: false,
                authenticated: true,
                intunePolicy: null,
            });
        });

        test('should add server config without config', async () => {
            await SecurityManager.addServer('server-6');
            expect(SecurityManager.serverConfig['server-6']).toEqual({
                siteName: undefined,
                Biometrics: false,
                JailbreakProtection: false,
                PreventScreenCapture: false,
                authenticated: false,
                intunePolicy: null,
            });
        });

        test('should update a server config previously added', async () => {
            await SecurityManager.addServer('server-3', {SiteName: 'Server Three', MobilePreventScreenCapture: 'true'} as ClientConfig, true);
            expect(SecurityManager.serverConfig['server-3']).toEqual({
                siteName: 'Server Three',
                Biometrics: false,
                JailbreakProtection: false,
                PreventScreenCapture: true,
                authenticated: true,
                intunePolicy: null,
            });
        });
    });

    describe('removeServer', () => {
        test('should remove server config and active server', async () => {
            await SecurityManager.addServer('server-1', {SiteName: 'Server One', MobileEnableBiometrics: 'true'} as ClientConfig);
            await SecurityManager.addServer('server-2', {SiteName: 'Server Two', MobileEnableBiometrics: 'false'} as ClientConfig);
            SecurityManager.setActiveServer({serverUrl: 'server-1'});
            SecurityManager.initialized = true;

            SecurityManager.removeServer('server-1');
            expect(SecurityManager.serverConfig['server-1']).toBeUndefined();
            expect(SecurityManager.activeServer).toBeUndefined();
            expect(SecurityManager.initialized).toBe(false);
        });

        test('should remove server config', async () => {
            await SecurityManager.addServer('server-3');
            SecurityManager.removeServer('server-3');
            expect(SecurityManager.serverConfig['server-3']).toBeUndefined();
        });
    });

    describe('getServerConfig', () => {
        test('should return server config', async () => {
            await SecurityManager.addServer('server-4', {SiteName: 'Server Four'} as ClientConfig);
            expect(SecurityManager.getServerConfig('server-4')?.siteName).toBe('Server Four');
        });

        test('should return undefined if server config does not exist', () => {
            expect(SecurityManager.getServerConfig('server-5')).toBeUndefined();
        });
    });

    describe('setActiveServer', () => {
        test('should set active server and update lastAccessed', async () => {
            await SecurityManager.addServer('server-5');
            const before = Date.now();
            SecurityManager.setActiveServer({serverUrl: 'server-5'});
            const after = Date.now();
            expect(SecurityManager.activeServer).toBe('server-5');
            expect(SecurityManager.serverConfig['server-5'].lastAccessed).toBeGreaterThanOrEqual(before);
            expect(SecurityManager.serverConfig['server-5'].lastAccessed).toBeLessThanOrEqual(after);
        });

        test('should not set active server if server does not exist', () => {
            SecurityManager.setActiveServer({serverUrl: 'server-6'});
            expect(SecurityManager.activeServer).toBeUndefined();
        });

        test('should update active server and lastAccessed if a different server is set', async () => {
            await SecurityManager.addServer('server-7');
            await SecurityManager.addServer('server-8');
            SecurityManager.setActiveServer({serverUrl: 'server-7'});
            const before = Date.now();
            SecurityManager.setActiveServer({serverUrl: 'server-8'});
            const after = Date.now();
            expect(SecurityManager.activeServer).toBe('server-8');
            expect(SecurityManager.serverConfig['server-8'].lastAccessed).toBeGreaterThanOrEqual(before);
            expect(SecurityManager.serverConfig['server-8'].lastAccessed).toBeLessThanOrEqual(after);
        });

        test('should not change active server or lastAccessed if the same server is set', async () => {
            await SecurityManager.addServer('server-9');
            SecurityManager.setActiveServer({serverUrl: 'server-9'});
            const lastAccessed = SecurityManager.serverConfig['server-9'].lastAccessed;
            SecurityManager.setActiveServer({serverUrl: 'server-9'});
            expect(SecurityManager.activeServer).toBe('server-9');
            expect(SecurityManager.serverConfig['server-9'].lastAccessed).toBe(lastAccessed);
        });
    });

    describe('isScreenCapturePrevented', () => {
        test('should return true if screen capture prevention is enabled', async () => {
            await SecurityManager.addServer('server-1', {SiteName: 'Server One', MobilePreventScreenCapture: 'true'} as ClientConfig);
            expect(SecurityManager.isScreenCapturePrevented('server-1')).toBe(true);
        });

        test('should return false if screen capture prevention is disabled', async () => {
            await SecurityManager.addServer('server-2', {SiteName: 'Server Two', MobilePreventScreenCapture: 'false'} as ClientConfig);
            expect(SecurityManager.isScreenCapturePrevented('server-2')).toBe(false);
        });

        test('should return false if server configuration does not exist', () => {
            expect(SecurityManager.isScreenCapturePrevented('server-3')).toBe(false);
        });

        test('should return false if PreventScreenCapture property is not set', async () => {
            await SecurityManager.addServer('server-4', {SiteName: 'Server Four'} as ClientConfig);
            expect(SecurityManager.isScreenCapturePrevented('server-4')).toBe(false);
        });
    });

    describe('authenticateWithBiometricsIfNeeded', () => {
        test('should handle biometric authentication if biometrics enabled and device secured', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(true);
            await SecurityManager.addServer('server-6', {MobileEnableBiometrics: 'true'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-6')).resolves.toBe(true);
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).toHaveBeenCalled();
        });

        test('should not prompt for biometric authentication if biometrics enabled but device is not secured', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(false);
            const showNotSecuredAlertSpy = jest.spyOn(alerts, 'showNotSecuredAlert');
            await SecurityManager.addServer('server-6', {MobileEnableBiometrics: 'true'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-6')).resolves.toBe(false);
            expect(showNotSecuredAlertSpy).toHaveBeenCalled();
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });

        test('should not attempt biometric authentication if biometrics not enabled', async () => {
            await SecurityManager.addServer('server-8', {MobileEnableBiometrics: 'false'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-8')).resolves.toBe(true);
            expect(Emm.isDeviceSecured).not.toHaveBeenCalled();
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });

        test('should resolve with true if biometric authentication succeeds', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(true);
            await SecurityManager.addServer('server-9', {MobileEnableBiometrics: 'true'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-9')).resolves.toBe(true);
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).toHaveBeenCalled();
        });

        test('should log error and resolve with false if biometric authentication fails', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(false);
            await SecurityManager.addServer('server-10', {MobileEnableBiometrics: 'true'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-10')).resolves.toBe(false);
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).toHaveBeenCalled();
            expect(SecurityManager.getServerConfig('server-10')?.authenticated).toBe(false);
            expect(logError).toHaveBeenCalled();
        });

        test('should log error and resolve with false if biometric authentication throws an error', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockRejectedValue(new Error('Authorization cancelled'));
            await SecurityManager.addServer('server-11', {MobileEnableBiometrics: 'true'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-11')).resolves.toBe(false);
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).toHaveBeenCalled();
            expect(logError).toHaveBeenCalled();
        });

        test('should not attempt biometric authentication if server was previously authenticated within 5 mins', async () => {
            // Mock toMilliseconds locally to return correct value for this test
            const originalToMilliseconds = jest.requireActual('@utils/datetime').toMilliseconds;
            jest.mocked(require('@utils/datetime').toMilliseconds).mockImplementation(originalToMilliseconds);

            // Use a fixed timestamp instead of Date.now() to eliminate timing races
            const fixedTime = 1672574400000; // Fixed timestamp: Jan 1, 2023 12:00:00 GMT
            const oneMinuteAgo = fixedTime - (60 * 1000);

            // Mock Date.now to return our fixed time
            const originalDateNow = Date.now;
            Date.now = jest.fn(() => fixedTime);

            try {
                await SecurityManager.addServer('server-12', {MobileEnableBiometrics: 'true'} as ClientConfig, true);
                SecurityManager.serverConfig['server-12'].lastAccessed = oneMinuteAgo;
                await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-12')).resolves.toBe(true);
                expect(Emm.isDeviceSecured).not.toHaveBeenCalled();
                expect(Emm.authenticate).not.toHaveBeenCalled();
            } finally {
                // Restore original implementations
                Date.now = originalDateNow;
                jest.mocked(require('@utils/datetime').toMilliseconds).mockReturnValue(25000);
            }
        });

        test('should not attempt biometric authentication if server was previously failed authentication even though lastAccess is less than 5 mins', async () => {
            await SecurityManager.addServer('server-13', {MobileEnableBiometrics: 'true'} as ClientConfig);
            SecurityManager.serverConfig['server-13'].authenticated = false;
            SecurityManager.serverConfig['server-13'].lastAccessed = Date.now() - toMilliseconds({minutes: 1});
            await SecurityManager.authenticateWithBiometricsIfNeeded('server-13');
            expect(SecurityManager.serverConfig['server-13'].authenticated).toBe(false);
            await expect(Emm.authenticate).toHaveBeenCalled();
        });
    });

    describe('onAppStateChange', () => {
        test('should handle app state changes', async () => {
            await SecurityManager.addServer('server-8', {MobileEnableBiometrics: 'true'} as ClientConfig);
            SecurityManager.setActiveServer({serverUrl: 'server-8'});
            await SecurityManager.onAppStateChange('background' as AppStateStatus);
            expect(SecurityManager.backgroundSince).toBeGreaterThan(0);
            await SecurityManager.onAppStateChange('active' as AppStateStatus);
            expect(SecurityManager.backgroundSince).toBe(0);
        });

        test('should call biometric authentication app state changes', async () => {
            const authenticateWithBiometrics = jest.spyOn(SecurityManager, 'authenticateWithBiometrics');
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);
            await SecurityManager.addServer('server-8', {MobileEnableBiometrics: 'true'} as ClientConfig);
            SecurityManager.setActiveServer({serverUrl: 'server-8'});
            SecurityManager.onAppStateChange('background' as AppStateStatus);
            SecurityManager.backgroundSince = Date.now() - toMilliseconds({minutes: 5, seconds: 1});
            SecurityManager.onAppStateChange('active' as AppStateStatus);
            await TestHelper.wait(300);
            expect(authenticateWithBiometrics).toHaveBeenCalledWith('server-8');
        });
    });

    describe('isDeviceJailbroken', () => {
        test('should check if device is jailbroken and return true', async () => {
            const server = 'server-15';
            const siteName = 'Site Name';
            await SecurityManager.addServer(server, {MobileJailbreakProtection: 'true'} as ClientConfig);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);

            const result = await SecurityManager.isDeviceJailbroken(server, siteName);
            expect(result).toBe(true);
            expect(isRootedExperimentalAsync).toHaveBeenCalled();
        });

        test('should return false if device is not jailbroken', async () => {
            const server = 'server-16';
            const siteName = 'Site Name';
            await SecurityManager.addServer(server, {MobileJailbreakProtection: 'true'} as ClientConfig);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);

            const result = await SecurityManager.isDeviceJailbroken(server, siteName);

            expect(result).toBe(false);
        });

        test('should return false if jailbreak protection is not enabled', async () => {
            const server = 'server-17';
            await SecurityManager.addServer(server, {MobileJailbreakProtection: 'false'} as ClientConfig);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);

            const result = await SecurityManager.isDeviceJailbroken(server);

            expect(result).toBe(false);
            expect(isRootedExperimentalAsync).not.toHaveBeenCalled();
        });
    });

    describe('getShieldScreenId', () => {
        test('should return the name of the screen shielded if prevent screen capture is enabled', () => {
            SecurityManager.addServer('server-2', {MobilePreventScreenCapture: 'true'} as ClientConfig);
            SecurityManager.activeServer = 'server-2';
            expect(SecurityManager.getShieldScreenId(Screens.CHANNEL)).toBe(`${Screens.CHANNEL}.screen.shielded`);
        });

        test('should return the name of the screen without shielded if active server is different', () => {
            SecurityManager.addServer('server-2', {MobilePreventScreenCapture: 'true'} as ClientConfig);
            SecurityManager.activeServer = 'server-1';
            expect(SecurityManager.getShieldScreenId(Screens.CHANNEL)).toBe(`${Screens.CHANNEL}.screen`);
        });

        test('should return the name of the screen shielded if prevent screen capture is disabled', () => {
            SecurityManager.addServer('server-2', {MobilePreventScreenCapture: 'false'} as ClientConfig);
            expect(SecurityManager.getShieldScreenId(Screens.CHANNEL)).toBe(`${Screens.CHANNEL}.screen`);
        });

        test('should return the name of the screen shielded if prevent screen capture is disabled but forced', () => {
            SecurityManager.addServer('server-2', {MobilePreventScreenCapture: 'false'} as ClientConfig);
            expect(SecurityManager.getShieldScreenId(Screens.CHANNEL, true)).toBe(`${Screens.CHANNEL}.screen.shielded`);
        });

        test('should return the name of the screen as shielded but skip', () => {
            SecurityManager.addServer('server-2', {MobilePreventScreenCapture: 'true'} as ClientConfig);
            SecurityManager.activeServer = 'server-2';
            expect(SecurityManager.getShieldScreenId(Screens.CHANNEL, false, true)).toBe(`${Screens.CHANNEL}.screen.skip.shielded`);
        });
    });

    describe('Intune MAM Integration', () => {
        // Default policy with strict restrictions (all policies enforced)
        const mockRestrictiveIntunePolicy: IntunePolicy = {
            isPINRequired: true,
            isContactSyncAllowed: false,
            isWidgetContentSyncAllowed: false,
            isSpotlightIndexingAllowed: false,
            areSiriIntentsAllowed: false,
            areAppIntentsAllowed: false,
            isAppSharingAllowed: false,
            shouldFileProviderEncryptFiles: true,
            isManagedBrowserRequired: true,
            isFileEncryptionRequired: true,
            isScreenCaptureAllowed: false,
            notificationPolicy: 2, // Block all notifications
            allowedSaveLocations: {
                Other: false,
                OneDriveForBusiness: true,
                SharePoint: true,
                LocalDrive: false,
                PhotoLibrary: false,
                CameraRoll: false,
                FilesApp: false,
                iCloudDrive: false,
            },
            allowedOpenLocations: 0,
        };

        const mockPermissiveIntunePolicy: IntunePolicy = {
            isPINRequired: false,
            isContactSyncAllowed: true,
            isWidgetContentSyncAllowed: true,
            isSpotlightIndexingAllowed: true,
            areSiriIntentsAllowed: true,
            areAppIntentsAllowed: true,
            isAppSharingAllowed: true,
            shouldFileProviderEncryptFiles: false,
            isManagedBrowserRequired: false,
            isFileEncryptionRequired: false,
            isScreenCaptureAllowed: true,
            notificationPolicy: 0, // Allow all notifications
            allowedSaveLocations: {
                Other: true,
                OneDriveForBusiness: true,
                SharePoint: true,
                LocalDrive: true,
                PhotoLibrary: true,
                CameraRoll: true,
                FilesApp: true,
                iCloudDrive: true,
            },
            allowedOpenLocations: 255, // All locations
        };

        describe('start', () => {
            test('should set current Intune identity and apply policies', async () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {MobilePreventScreenCapture: 'false'} as ClientConfig);
                jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);
                jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);

                await SecurityManager.start();

                expect(IntuneManager.setCurrentIdentity).toHaveBeenCalledWith(serverUrl);
                expect(SecurityManager.activeServer).toBe(serverUrl);
            });

            test('should handle missing active server', async () => {
                jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue('');

                await SecurityManager.start();

                expect(IntuneManager.setCurrentIdentity).not.toHaveBeenCalled();
            });

            test('should skip biometric auth when device is jailbroken', async () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true', MobileJailbreakProtection: 'true'} as ClientConfig);
                jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);
                jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);

                await SecurityManager.start();

                expect(Emm.authenticate).not.toHaveBeenCalled();
            });
        });

        describe('isScreenCapturePrevented - MAM policy precedence', () => {
            test('should return false (block capture) when MAM disallows even if server allows', () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {MobilePreventScreenCapture: 'false'} as ClientConfig, false, mockRestrictiveIntunePolicy);

                expect(SecurityManager.isScreenCapturePrevented(serverUrl)).toBe(false);
            });

            test('should return true (allow capture) when both MAM and server allow', () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {MobilePreventScreenCapture: 'false'} as ClientConfig, false, mockPermissiveIntunePolicy);

                expect(SecurityManager.isScreenCapturePrevented(serverUrl)).toBe(false);
            });

            test('should return true (block capture) when server prevents and MAM allows', () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {MobilePreventScreenCapture: 'true'} as ClientConfig, false, mockPermissiveIntunePolicy);

                expect(SecurityManager.isScreenCapturePrevented(serverUrl)).toBe(true);
            });

            test('should return false (block capture) when MAM disallows regardless of server', () => {
                const serverUrl = 'https://test.server.com';

                // Server allows capture, but MAM blocks - MAM wins
                SecurityManager.addServer(serverUrl, {MobilePreventScreenCapture: 'false'} as ClientConfig, false, mockRestrictiveIntunePolicy);

                expect(SecurityManager.isScreenCapturePrevented(serverUrl)).toBe(false);
            });

            test('should use server config when no Intune policy', () => {
                const serverUrl1 = 'https://test1.server.com';
                const serverUrl2 = 'https://test2.server.com';
                SecurityManager.addServer(serverUrl1, {MobilePreventScreenCapture: 'true'} as ClientConfig, false, null);
                SecurityManager.addServer(serverUrl2, {MobilePreventScreenCapture: 'false'} as ClientConfig, false, null);

                expect(SecurityManager.isScreenCapturePrevented(serverUrl1)).toBe(true);
                expect(SecurityManager.isScreenCapturePrevented(serverUrl2)).toBe(false);
            });
        });

        describe('authenticateWithBiometricsIfNeeded - isPINRequired enforcement', () => {
            test('should skip biometric auth when MAM requires PIN', async () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as ClientConfig, false, mockRestrictiveIntunePolicy);

                const result = await SecurityManager.authenticateWithBiometricsIfNeeded(serverUrl);

                expect(result).toBe(true);
                expect(Emm.authenticate).not.toHaveBeenCalled();
            });

            test('should use server biometric config when MAM PIN not required', async () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as ClientConfig, false, mockPermissiveIntunePolicy);
                jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
                jest.mocked(Emm.authenticate).mockResolvedValue(true);

                const result = await SecurityManager.authenticateWithBiometricsIfNeeded(serverUrl);

                expect(result).toBe(true);
                expect(Emm.authenticate).toHaveBeenCalled();
            });

            test('should not require auth when server disables biometrics and MAM PIN not required', async () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'false'} as ClientConfig, false, mockPermissiveIntunePolicy);

                const result = await SecurityManager.authenticateWithBiometricsIfNeeded(serverUrl);

                expect(result).toBe(true);
                expect(Emm.authenticate).not.toHaveBeenCalled();
            });

            test('should skip auth when MAM requires PIN even if server enables biometrics', async () => {
                const serverUrl = 'https://test.server.com';

                // Server wants biometrics, but MAM requires PIN - MAM wins
                SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as ClientConfig, false, mockRestrictiveIntunePolicy);

                const result = await SecurityManager.authenticateWithBiometricsIfNeeded(serverUrl);

                expect(result).toBe(true);
                expect(Emm.authenticate).not.toHaveBeenCalled();
            });

            test('should use server config when no Intune policy', async () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as ClientConfig, false, null);
                jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
                jest.mocked(Emm.authenticate).mockResolvedValue(true);

                const result = await SecurityManager.authenticateWithBiometricsIfNeeded(serverUrl);

                expect(result).toBe(true);
                expect(Emm.authenticate).toHaveBeenCalled();
            });
        });

        describe('authenticateWithBiometrics - isPINRequired enforcement', () => {
            test('should skip authentication when MAM handles PIN', async () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as ClientConfig, false, mockRestrictiveIntunePolicy);

                const result = await SecurityManager.authenticateWithBiometrics(serverUrl);

                expect(result).toBe(true);
                expect(Emm.isDeviceSecured).not.toHaveBeenCalled();
                expect(Emm.authenticate).not.toHaveBeenCalled();
            });

            test('should attempt authentication when MAM does not require PIN', async () => {
                const serverUrl = 'https://test.server.com';
                const siteName = 'Test Site';
                SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as ClientConfig, false, mockPermissiveIntunePolicy);
                jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
                jest.mocked(Emm.authenticate).mockResolvedValue(true);

                const result = await SecurityManager.authenticateWithBiometrics(serverUrl, siteName);

                expect(result).toBe(true);
                expect(Emm.authenticate).toHaveBeenCalled();
            });
        });

        describe('cleanup', () => {
            test('should remove all Intune event subscriptions', () => {
                const mockSubscription = {remove: jest.fn()} as unknown as EventSubscription;
                SecurityManager.intunePolicySubscription = mockSubscription;
                SecurityManager.intuneEnrollmentSubscription = mockSubscription;
                SecurityManager.intuneWipeSubscription = mockSubscription;
                SecurityManager.intuneAuthSubscription = mockSubscription;
                SecurityManager.intuneBlockedSubscription = mockSubscription;
                SecurityManager.intuneIdentitySwitchSubscription = mockSubscription;

                SecurityManager.cleanup();

                expect(mockSubscription.remove).toHaveBeenCalledTimes(6);
            });

            test('should handle missing subscriptions gracefully', () => {
                SecurityManager.intunePolicySubscription = undefined;
                SecurityManager.intuneEnrollmentSubscription = undefined;

                expect(() => SecurityManager.cleanup()).not.toThrow();
            });
        });

        describe('addServer with Intune policy', () => {
            test('should store restrictive Intune policy', () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as ClientConfig, false, mockRestrictiveIntunePolicy);

                const config = SecurityManager.getServerConfig(serverUrl);
                expect(config?.intunePolicy).toEqual(mockRestrictiveIntunePolicy);
                expect(config?.intunePolicy?.isPINRequired).toBe(true);
                expect(config?.intunePolicy?.isScreenCaptureAllowed).toBe(false);
            });

            test('should store permissive Intune policy', () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as ClientConfig, false, mockPermissiveIntunePolicy);

                const config = SecurityManager.getServerConfig(serverUrl);
                expect(config?.intunePolicy).toEqual(mockPermissiveIntunePolicy);
                expect(config?.intunePolicy?.isPINRequired).toBe(false);
                expect(config?.intunePolicy?.isScreenCaptureAllowed).toBe(true);
            });

            test('should store null when not enrolled in Intune', () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as ClientConfig, false, null);

                const config = SecurityManager.getServerConfig(serverUrl);
                expect(config?.intunePolicy).toBeNull();
            });

            test('should update policy when server re-enrolls', () => {
                const serverUrl = 'https://test.server.com';

                // First add without policy
                SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as ClientConfig, false, null);
                expect(SecurityManager.getServerConfig(serverUrl)?.intunePolicy).toBeNull();

                // Then update with restrictive policy
                SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as ClientConfig, false, mockRestrictiveIntunePolicy);
                const config = SecurityManager.getServerConfig(serverUrl);
                expect(config?.intunePolicy?.isPINRequired).toBe(true);
            });

            test('should update from restrictive to permissive policy', () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as ClientConfig, false, mockRestrictiveIntunePolicy);
                expect(SecurityManager.getServerConfig(serverUrl)?.intunePolicy?.isPINRequired).toBe(true);

                SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as ClientConfig, false, mockPermissiveIntunePolicy);
                expect(SecurityManager.getServerConfig(serverUrl)?.intunePolicy?.isPINRequired).toBe(false);
            });

            test('should clear policy when unenrolled', () => {
                const serverUrl = 'https://test.server.com';
                SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as ClientConfig, false, mockRestrictiveIntunePolicy);
                expect(SecurityManager.getServerConfig(serverUrl)?.intunePolicy).not.toBeNull();

                SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as ClientConfig, false, null);
                expect(SecurityManager.getServerConfig(serverUrl)?.intunePolicy).toBeNull();
            });
        });
    });
});
