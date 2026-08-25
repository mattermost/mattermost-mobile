// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import Emm from '@mattermost/react-native-emm';
import {isRootedExperimentalAsync} from 'expo-device';

import DatabaseManager from '@database/manager';
import IntuneManager from '@managers/intune_manager';
import {
    type IntunePolicy,
} from '@managers/intune_manager/types';
import {queryAllActiveServers} from '@queries/app/servers';
import {getSecurityConfig} from '@queries/servers/system';
import * as alerts from '@utils/alerts';
import {toMilliseconds} from '@utils/datetime';
import {logError} from '@utils/log';

import SecurityManager from './index';

import type {Query} from '@nozbe/watermelondb';
import type {ServerDatabase} from '@typings/database/database';
import type ServersModel from '@typings/database/models/app/servers';

jest.mock('@mattermost/react-native-emm', () => ({
    isDeviceSecured: jest.fn(),
    authenticate: jest.fn(),
    openSecuritySettings: jest.fn(),
    exitApp: jest.fn(),
    enableBlurScreen: jest.fn(),
    applyBlurEffect: jest.fn(),
    removeBlurEffect: jest.fn(),
}));

jest.mock('expo-device', () => ({
    isRootedExperimentalAsync: jest.fn(),
}));
jest.mock('@actions/app/server', () => ({switchToServer: jest.fn()}));
jest.mock('@actions/local/session', () => ({terminateSession: jest.fn()}));
jest.mock('@actions/local/user', () => ({getCurrentUserLocale: jest.fn(() => Promise.resolve('en'))}));
jest.mock('@actions/remote/session', () => ({
    logout: jest.fn(),
}));
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
    getConfig: jest.fn(),
    getConfigValue: jest.fn(),
}));
jest.mock('@queries/app/servers', () => ({
    queryAllActiveServers: jest.fn(),
}));
jest.mock('@queries/servers/user', () => ({
    getCurrentUser: jest.fn(),
    getCurrentUserLocale: jest.fn(() => Promise.resolve('en')),
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

            const mockConfig1 = {SiteName: 'Server One', MobileEnableBiometrics: 'true'} as SecurityClientConfig;
            const mockConfig2 = {SiteName: 'Server Two', MobilePreventScreenCapture: 'true'} as SecurityClientConfig;

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

            const mockConfig = {SiteName: 'Server One', MobileEnableBiometrics: 'false'} as unknown as SecurityClientConfig;
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

            const mockConfig2 = {SiteName: 'Server Two'} as unknown as SecurityClientConfig;
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
            await SecurityManager.addServer('server-1', {SiteName: 'Server One', MobileEnableBiometrics: 'true'} as unknown as SecurityClientConfig);
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
            await SecurityManager.addServer('server-2', {SiteName: 'Server Two', MobileJailbreakProtection: 'true'} as unknown as SecurityClientConfig);
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
            await SecurityManager.addServer('server-3', {SiteName: 'Server Three', MobilePreventScreenCapture: 'true'} as unknown as SecurityClientConfig);
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
            } as unknown as SecurityClientConfig);
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
            await SecurityManager.addServer('server-5', {SiteName: 'Server Five'} as unknown as SecurityClientConfig, true);
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
            await SecurityManager.addServer('server-3', {SiteName: 'Server Three', MobilePreventScreenCapture: 'true'} as unknown as SecurityClientConfig, true);
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
            await SecurityManager.addServer('server-1', {SiteName: 'Server One', MobileEnableBiometrics: 'true'} as SecurityClientConfig);
            await SecurityManager.addServer('server-2', {SiteName: 'Server Two', MobileEnableBiometrics: 'false'} as SecurityClientConfig);
            await SecurityManager.setActiveServer({serverUrl: 'server-1'});
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
            await SecurityManager.addServer('server-4', {SiteName: 'Server Four'} as SecurityClientConfig);
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
            await SecurityManager.setActiveServer({serverUrl: 'server-5'});
            const after = Date.now();
            expect(SecurityManager.activeServer).toBe('server-5');
            expect(SecurityManager.serverConfig['server-5'].lastAccessed).toBeGreaterThanOrEqual(before);
            expect(SecurityManager.serverConfig['server-5'].lastAccessed).toBeLessThanOrEqual(after);
        });

        test('should not set active server if server does not exist', async () => {
            await SecurityManager.setActiveServer({serverUrl: 'server-6'});
            expect(SecurityManager.activeServer).toBeUndefined();
        });

        test('should update active server and lastAccessed if a different server is set', async () => {
            await SecurityManager.addServer('server-7');
            await SecurityManager.addServer('server-8');
            await SecurityManager.setActiveServer({serverUrl: 'server-7'});
            const before = Date.now();
            await SecurityManager.setActiveServer({serverUrl: 'server-8'});
            const after = Date.now();
            expect(SecurityManager.activeServer).toBe('server-8');
            expect(SecurityManager.serverConfig['server-8'].lastAccessed).toBeGreaterThanOrEqual(before);
            expect(SecurityManager.serverConfig['server-8'].lastAccessed).toBeLessThanOrEqual(after);
        });

        test('should not change active server or lastAccessed if the same server is set', async () => {
            await SecurityManager.addServer('server-9');
            await SecurityManager.setActiveServer({serverUrl: 'server-9'});
            const lastAccessed = SecurityManager.serverConfig['server-9'].lastAccessed;
            await SecurityManager.setActiveServer({serverUrl: 'server-9'});
            expect(SecurityManager.activeServer).toBe('server-9');
            expect(SecurityManager.serverConfig['server-9'].lastAccessed).toBe(lastAccessed);
        });
    });

    describe('setActiveServer options', () => {
        const serverUrl1 = 'https://test1.server.com';
        const serverUrl2 = 'https://test2.server.com';

        beforeEach(async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockReturnValue(false);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(true);
            await SecurityManager.init();
            await SecurityManager.addServer(serverUrl1, {SiteName: 'Test Server 1'} as SecurityClientConfig);
            await SecurityManager.addServer(serverUrl2, {SiteName: 'Test Server 2'} as SecurityClientConfig);
        });

        test('should skip MAM enrollment check when skipMAMEnrollmentCheck is true', async () => {
            const ensureMAMSpy = jest.spyOn(SecurityManager, 'ensureMAMEnrollmentForActiveServer');

            await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true}});

            expect(ensureMAMSpy).not.toHaveBeenCalled();
            ensureMAMSpy.mockRestore();
        });

        test('should perform MAM enrollment check when skipMAMEnrollmentCheck is false', async () => {
            const ensureMAMSpy = jest.spyOn(SecurityManager, 'ensureMAMEnrollmentForActiveServer').mockResolvedValue(true);

            await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: false}});

            expect(ensureMAMSpy).toHaveBeenCalledWith(serverUrl1);
            ensureMAMSpy.mockRestore();
        });

        test('should skip jailbreak check when skipJailbreakCheck is true', async () => {
            const jailbreakSpy = jest.spyOn(SecurityManager, 'isDeviceJailbroken');

            await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true}});

            expect(jailbreakSpy).not.toHaveBeenCalled();
            jailbreakSpy.mockRestore();
        });

        test('should perform jailbreak check when skipJailbreakCheck is false', async () => {
            const jailbreakSpy = jest.spyOn(SecurityManager, 'isDeviceJailbroken').mockResolvedValue(false);

            await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: false}});

            expect(jailbreakSpy).toHaveBeenCalledWith(serverUrl1);
            jailbreakSpy.mockRestore();
        });

        test('should skip biometric auth when skipBiometricCheck is true', async () => {
            const biometricSpy = jest.spyOn(SecurityManager, 'authenticateWithBiometricsIfNeeded');

            await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});

            expect(biometricSpy).not.toHaveBeenCalled();
            biometricSpy.mockRestore();
        });

        test('should perform biometric auth when skipBiometricCheck is false', async () => {
            const biometricSpy = jest.spyOn(SecurityManager, 'authenticateWithBiometricsIfNeeded');

            await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: false}});

            expect(biometricSpy).toHaveBeenCalledWith(serverUrl1);
            biometricSpy.mockRestore();
        });

        test('should force switch to same server when forceSwitch is true', async () => {
            await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
            const setScreenCaptureSpy = jest.spyOn(SecurityManager, 'setScreenCapturePolicy');
            setScreenCaptureSpy.mockClear();

            await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true, forceSwitch: true}});

            expect(setScreenCaptureSpy).toHaveBeenCalledWith(serverUrl1);
            setScreenCaptureSpy.mockRestore();
        });

        test('should not switch to same server when forceSwitch is false', async () => {
            await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
            const setScreenCaptureSpy = jest.spyOn(SecurityManager, 'setScreenCapturePolicy');
            setScreenCaptureSpy.mockClear();

            await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true, forceSwitch: false}});

            expect(setScreenCaptureSpy).not.toHaveBeenCalled();
            setScreenCaptureSpy.mockRestore();
        });
    });

    describe('isScreenCapturePrevented', () => {
        test('should return true if screen capture prevention is enabled', async () => {
            await SecurityManager.addServer('server-1', {SiteName: 'Server One', MobilePreventScreenCapture: 'true'} as SecurityClientConfig);
            expect(SecurityManager.isScreenCapturePrevented('server-1')).toBe(true);
        });

        test('should return false if screen capture prevention is disabled', async () => {
            await SecurityManager.addServer('server-2', {SiteName: 'Server Two', MobilePreventScreenCapture: 'false'} as SecurityClientConfig);
            expect(SecurityManager.isScreenCapturePrevented('server-2')).toBe(false);
        });

        test('should return false if server configuration does not exist', () => {
            expect(SecurityManager.isScreenCapturePrevented('server-3')).toBe(false);
        });

        test('should return false if PreventScreenCapture property is not set', async () => {
            await SecurityManager.addServer('server-4', {SiteName: 'Server Four'} as SecurityClientConfig);
            expect(SecurityManager.isScreenCapturePrevented('server-4')).toBe(false);
        });
    });

    describe('authenticateWithBiometricsIfNeeded', () => {
        test('should handle biometric authentication if biometrics enabled and device secured', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(true);
            await SecurityManager.addServer('server-6', {MobileEnableBiometrics: 'true'} as SecurityClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-6')).resolves.toBe(true);
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).toHaveBeenCalled();
        });

        test('should not prompt for biometric authentication if biometrics enabled but device is not secured', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(false);
            const showNotSecuredAlertSpy = jest.spyOn(alerts, 'showNotSecuredAlert');
            await SecurityManager.addServer('server-6', {MobileEnableBiometrics: 'true'} as SecurityClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-6')).resolves.toBe(false);
            expect(showNotSecuredAlertSpy).toHaveBeenCalled();
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });

        test('should not attempt biometric authentication if biometrics not enabled', async () => {
            await SecurityManager.addServer('server-8', {MobileEnableBiometrics: 'false'} as SecurityClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-8')).resolves.toBe(true);
            expect(Emm.isDeviceSecured).not.toHaveBeenCalled();
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });

        test('should resolve with true if biometric authentication succeeds', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(true);
            await SecurityManager.addServer('server-9', {MobileEnableBiometrics: 'true'} as SecurityClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-9')).resolves.toBe(true);
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).toHaveBeenCalled();
        });

        test('should log error and resolve with false if biometric authentication fails', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(false);
            await SecurityManager.addServer('server-10', {MobileEnableBiometrics: 'true'} as SecurityClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-10')).resolves.toBe(false);
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).toHaveBeenCalled();
            expect(SecurityManager.getServerConfig('server-10')?.authenticated).toBe(false);
            expect(logError).toHaveBeenCalled();
        });

        test('should log error and resolve with false if biometric authentication throws an error', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockRejectedValue(new Error('Authorization cancelled'));
            await SecurityManager.addServer('server-11', {MobileEnableBiometrics: 'true'} as SecurityClientConfig);
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
                await SecurityManager.addServer('server-12', {MobileEnableBiometrics: 'true'} as SecurityClientConfig, true);
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
            await SecurityManager.addServer('server-13', {MobileEnableBiometrics: 'true'} as SecurityClientConfig);
            SecurityManager.serverConfig['server-13'].authenticated = false;
            SecurityManager.serverConfig['server-13'].lastAccessed = Date.now() - toMilliseconds({minutes: 1});
            await SecurityManager.authenticateWithBiometricsIfNeeded('server-13');
            expect(SecurityManager.serverConfig['server-13'].authenticated).toBe(false);
            await expect(Emm.authenticate).toHaveBeenCalled();
        });
    });

    describe('isDeviceJailbroken', () => {
        test('should check if device is jailbroken and return true', async () => {
            const server = 'server-15';
            const siteName = 'Site Name';
            await SecurityManager.addServer(server, {MobileJailbreakProtection: 'true'} as SecurityClientConfig);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);

            const result = await SecurityManager.isDeviceJailbroken(server, siteName);
            expect(result).toBe(true);
            expect(isRootedExperimentalAsync).toHaveBeenCalled();
        });

        test('should return false if device is not jailbroken', async () => {
            const server = 'server-16';
            const siteName = 'Site Name';
            await SecurityManager.addServer(server, {MobileJailbreakProtection: 'true'} as SecurityClientConfig);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);

            const result = await SecurityManager.isDeviceJailbroken(server, siteName);

            expect(result).toBe(false);
        });

        test('should return false if jailbreak protection is not enabled', async () => {
            const server = 'server-17';
            await SecurityManager.addServer(server, {MobileJailbreakProtection: 'false'} as SecurityClientConfig);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);

            const result = await SecurityManager.isDeviceJailbroken(server);

            expect(result).toBe(false);
            expect(isRootedExperimentalAsync).not.toHaveBeenCalled();
        });
    });
});
