// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {isRootedExperimentalAsync} from 'expo-device';
import {Alert, type AppStateStatus} from 'react-native';

import {switchToServer} from '@actions/app/server';
import {logout} from '@actions/remote/session';
import {Screens} from '@constants';
import {DEFAULT_LOCALE, getTranslations, t} from '@i18n';
import {getServerCredentials} from '@init/credentials';
import TestHelper from '@test/test_helper';
import {toMilliseconds} from '@utils/datetime';
import {logError} from '@utils/log';

import SecurityManager from '.';

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
jest.mock('@utils/log', () => ({logError: jest.fn()}));
jest.mock('@init/managed_app', () => ({enabled: true, inAppPinCode: false}));
jest.mock('@init/credentials', () => ({getServerCredentials: jest.fn().mockResolvedValue({token: 'token'})}));

describe('SecurityManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        SecurityManager.initialized = false;
        SecurityManager.serverConfig = {};
        SecurityManager.activeServer = undefined;
    });

    describe('init', () => {
        test('should initialize with servers', () => {
            const servers: Record<string, any> = {
                'server-1': {SiteName: 'Server One', MobileEnableBiometrics: 'true'},
            };
            SecurityManager.init(servers, 'server-1');
            expect(SecurityManager.serverConfig['server-1']).toBeDefined();
            expect(SecurityManager.activeServer).toBe('server-1');
        });

        test('should initialize with servers and set active server', async () => {
            const servers: Record<string, any> = {
                'server-1': {SiteName: 'Server One', MobileEnableBiometrics: 'true'},
                'server-2': {SiteName: 'Server Two', MobileEnableBiometrics: 'false'},
            };
            await SecurityManager.init(servers, 'server-1');
            expect(SecurityManager.serverConfig['server-1']).toBeDefined();
            expect(SecurityManager.serverConfig['server-2']).toBeDefined();
            expect(SecurityManager.activeServer).toBe('server-1');
        });

        test('should not reinitialize if already initialized', async () => {
            const servers: Record<string, any> = {
                'server-1': {SiteName: 'Server One', MobileEnableBiometrics: 'true'},
            };
            SecurityManager.initialized = true;
            await SecurityManager.init(servers, 'server-1');
            expect(SecurityManager.serverConfig['server-1']).toBeUndefined();
        });

        test('should set active server and authenticate if not jailbroken', async () => {
            const servers: Record<string, any> = {
                'server-1': {SiteName: 'Server One', MobileEnableBiometrics: 'true'},
            };
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);

            const isDeviceJailbrokenSpy = jest.spyOn(SecurityManager, 'isDeviceJailbroken');
            const authenticateWithBiometricsIfNeededSpy = jest.spyOn(SecurityManager, 'authenticateWithBiometricsIfNeeded');

            await SecurityManager.init(servers, 'server-1');
            expect(SecurityManager.activeServer).toBe('server-1');
            expect(isDeviceJailbrokenSpy).toHaveBeenCalledWith('server-1');
            expect(authenticateWithBiometricsIfNeededSpy).toHaveBeenCalledWith('server-1');
        });

        test('should not authenticate if device is jailbroken', async () => {
            const servers: Record<string, any> = {
                'server-1': {SiteName: 'Server One', MobileEnableBiometrics: 'true', MobileJailbreakProtection: 'true'},
            };
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);
            await SecurityManager.init(servers, 'server-1');
            expect(SecurityManager.activeServer).toBe('server-1');
            expect(SecurityManager.isDeviceJailbroken).toHaveBeenCalledWith('server-1');
            expect(SecurityManager.authenticateWithBiometricsIfNeeded).not.toHaveBeenCalled();
        });

        test('should not set active server if not provided', async () => {
            const servers: Record<string, any> = {
                'server-1': {SiteName: 'Server One', MobileEnableBiometrics: 'true'},
            };
            await SecurityManager.init(servers);
            expect(SecurityManager.activeServer).toBeUndefined();
        });
    });

    describe('addServer', () => {
        test('should add server config with biometrics enabled', () => {
            SecurityManager.addServer('server-1', {SiteName: 'Server One', MobileEnableBiometrics: 'true'} as ClientConfig);
            expect(SecurityManager.serverConfig['server-1']).toEqual({
                siteName: 'Server One',
                Biometrics: true,
                JailbreakProtection: false,
                PreventScreenCapture: false,
                authenticated: false,
            });
        });

        test('should add server config with jailbreak protection enabled', () => {
            SecurityManager.addServer('server-2', {SiteName: 'Server Two', MobileJailbreakProtection: 'true'} as ClientConfig);
            expect(SecurityManager.serverConfig['server-2']).toEqual({
                siteName: 'Server Two',
                Biometrics: false,
                JailbreakProtection: true,
                PreventScreenCapture: false,
                authenticated: false,
            });
        });

        test('should add server config with screen capture prevention enabled', () => {
            SecurityManager.addServer('server-3', {SiteName: 'Server Three', MobilePreventScreenCapture: 'true'} as ClientConfig);
            expect(SecurityManager.serverConfig['server-3']).toEqual({
                siteName: 'Server Three',
                Biometrics: false,
                JailbreakProtection: false,
                PreventScreenCapture: true,
                authenticated: false,
            });
        });

        test('should add server config with all features enabled', () => {
            SecurityManager.addServer('server-4', {
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
            });
        });

        test('should add server config with authenticated set to true', () => {
            SecurityManager.addServer('server-5', {SiteName: 'Server Five'} as ClientConfig, true);
            expect(SecurityManager.serverConfig['server-5']).toEqual({
                siteName: 'Server Five',
                Biometrics: false,
                JailbreakProtection: false,
                PreventScreenCapture: false,
                authenticated: true,
            });
        });

        test('should add server config without config', () => {
            SecurityManager.addServer('server-6');
            expect(SecurityManager.serverConfig['server-6']).toEqual({
                siteName: undefined,
                Biometrics: false,
                JailbreakProtection: false,
                PreventScreenCapture: false,
                authenticated: false,
            });
        });

        test('should update a server config previously added', () => {
            SecurityManager.addServer('server-3', {SiteName: 'Server Three', MobilePreventScreenCapture: 'true'} as ClientConfig, true);
            expect(SecurityManager.serverConfig['server-3']).toEqual({
                siteName: 'Server Three',
                Biometrics: false,
                JailbreakProtection: false,
                PreventScreenCapture: true,
                authenticated: true,
            });
        });
    });

    describe('removeServer', () => {
        test('should remove server config and active server', async () => {
            const servers: Record<string, any> = {
                'server-1': {SiteName: 'Server One', MobileEnableBiometrics: 'true'},
                'server-2': {SiteName: 'Server Two', MobileEnableBiometrics: 'false'},
            };
            await SecurityManager.init(servers, 'server-1');
            SecurityManager.removeServer('server-1');
            expect(SecurityManager.serverConfig['server-1']).toBeUndefined();
            expect(SecurityManager.activeServer).toBeUndefined();
            expect(SecurityManager.initialized).toBe(false);
        });

        test('should remove server config', () => {
            SecurityManager.addServer('server-3');
            SecurityManager.removeServer('server-3');
            expect(SecurityManager.serverConfig['server-3']).toBeUndefined();
        });
    });

    describe('getServerConfig', () => {
        test('should return server config', () => {
            SecurityManager.addServer('server-4', {SiteName: 'Server Four'} as ClientConfig);
            expect(SecurityManager.getServerConfig('server-4')?.siteName).toBe('Server Four');
        });

        test('should return undefined if server config does not exist', () => {
            expect(SecurityManager.getServerConfig('server-5')).toBeUndefined();
        });
    });

    describe('setActiveServer', () => {
        test('should set active server and update lastAccessed', () => {
            SecurityManager.addServer('server-5');
            const before = Date.now();
            SecurityManager.setActiveServer('server-5');
            const after = Date.now();
            expect(SecurityManager.activeServer).toBe('server-5');
            expect(SecurityManager.serverConfig['server-5'].lastAccessed).toBeGreaterThanOrEqual(before);
            expect(SecurityManager.serverConfig['server-5'].lastAccessed).toBeLessThanOrEqual(after);
        });

        test('should not set active server if server does not exist', () => {
            SecurityManager.setActiveServer('server-6');
            expect(SecurityManager.activeServer).toBeUndefined();
        });

        test('should update active server and lastAccessed if a different server is set', () => {
            SecurityManager.addServer('server-7');
            SecurityManager.addServer('server-8');
            SecurityManager.setActiveServer('server-7');
            const before = Date.now();
            SecurityManager.setActiveServer('server-8');
            const after = Date.now();
            expect(SecurityManager.activeServer).toBe('server-8');
            expect(SecurityManager.serverConfig['server-8'].lastAccessed).toBeGreaterThanOrEqual(before);
            expect(SecurityManager.serverConfig['server-8'].lastAccessed).toBeLessThanOrEqual(after);
        });

        test('should not change active server or lastAccessed if the same server is set', async () => {
            SecurityManager.addServer('server-9');
            SecurityManager.setActiveServer('server-9');
            const lastAccessed = SecurityManager.serverConfig['server-9'].lastAccessed;
            SecurityManager.setActiveServer('server-9');
            expect(SecurityManager.activeServer).toBe('server-9');
            expect(SecurityManager.serverConfig['server-9'].lastAccessed).toBe(lastAccessed);
        });
    });

    describe('isScreenCapturePrevented', () => {
        test('should return true if screen capture prevention is enabled', () => {
            SecurityManager.addServer('server-1', {SiteName: 'Server One', MobilePreventScreenCapture: 'true'} as ClientConfig);
            expect(SecurityManager.isScreenCapturePrevented('server-1')).toBe(true);
        });

        test('should return false if screen capture prevention is disabled', () => {
            SecurityManager.addServer('server-2', {SiteName: 'Server Two', MobilePreventScreenCapture: 'false'} as ClientConfig);
            expect(SecurityManager.isScreenCapturePrevented('server-2')).toBe(false);
        });

        test('should return false if server configuration does not exist', () => {
            expect(SecurityManager.isScreenCapturePrevented('server-3')).toBe(false);
        });

        test('should return false if PreventScreenCapture property is not set', () => {
            SecurityManager.addServer('server-4', {SiteName: 'Server Four'} as ClientConfig);
            expect(SecurityManager.isScreenCapturePrevented('server-4')).toBe(false);
        });
    });

    describe('authenticateWithBiometricsIfNeeded', () => {
        test('should handle biometric authentication if biometrics enabled and device secured', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(true);
            SecurityManager.addServer('server-6', {MobileEnableBiometrics: 'true'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-6')).resolves.toBe(true);
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).toHaveBeenCalled();
        });

        test('should not prompt for biometric authentication if biometrics enabled but device is not secured', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(false);
            const showNotSecuredAlertSpy = jest.spyOn(SecurityManager, 'showNotSecuredAlert');
            SecurityManager.addServer('server-6', {MobileEnableBiometrics: 'true'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-6')).resolves.toBe(false);
            expect(showNotSecuredAlertSpy).toHaveBeenCalled();
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });

        test('should not attempt biometric authentication if biometrics not enabled', async () => {
            SecurityManager.addServer('server-8', {MobileEnableBiometrics: 'false'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-8')).resolves.toBe(true);
            expect(Emm.isDeviceSecured).not.toHaveBeenCalled();
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });

        test('should resolve with true if biometric authentication succeeds', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(true);
            SecurityManager.addServer('server-9', {MobileEnableBiometrics: 'true'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-9')).resolves.toBe(true);
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).toHaveBeenCalled();
        });

        test('should log error and resolve with false if biometric authentication fails', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(false);
            SecurityManager.addServer('server-10', {MobileEnableBiometrics: 'true'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-10')).resolves.toBe(false);
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).toHaveBeenCalled();
            expect(SecurityManager.getServerConfig('server-10')?.authenticated).toBe(false);
            expect(logError).toHaveBeenCalled();
        });

        test('should log error and resolve with false if biometric authentication throws an error', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockRejectedValue(new Error('Authorization cancelled'));
            SecurityManager.addServer('server-11', {MobileEnableBiometrics: 'true'} as ClientConfig);
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-11')).resolves.toBe(false);
            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).toHaveBeenCalled();
            expect(logError).toHaveBeenCalled();
        });

        test('should not attempt biometric authentication if server was previously authenticated within 5 mins', async () => {
            SecurityManager.addServer('server-12', {MobileEnableBiometrics: 'true'} as ClientConfig, true);
            SecurityManager.serverConfig['server-12'].lastAccessed = Date.now() - toMilliseconds({minutes: 1});
            await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-12')).resolves.toBe(true);
            expect(Emm.isDeviceSecured).not.toHaveBeenCalled();
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });

        test('should not attempt biometric authentication if server was previously failed authentication even though lastAccess is less than 5 mins', async () => {
            SecurityManager.addServer('server-13', {MobileEnableBiometrics: 'true'} as ClientConfig);
            SecurityManager.serverConfig['server-13'].authenticated = false;
            SecurityManager.serverConfig['server-13'].lastAccessed = Date.now() - toMilliseconds({minutes: 1});
            await SecurityManager.authenticateWithBiometricsIfNeeded('server-13');
            expect(SecurityManager.serverConfig['server-13'].authenticated).toBe(false);
            await expect(Emm.authenticate).toHaveBeenCalled();
        });
    });

    describe('onAppStateChange', () => {
        test('should handle app state changes', async () => {
            SecurityManager.addServer('server-8', {MobileEnableBiometrics: 'true'} as ClientConfig);
            SecurityManager.setActiveServer('server-8');
            await SecurityManager.onAppStateChange('background' as AppStateStatus);
            expect(SecurityManager.backgroundSince).toBeGreaterThan(0);
            await SecurityManager.onAppStateChange('active' as AppStateStatus);
            expect(SecurityManager.backgroundSince).toBe(0);
        });

        test('should call biometric authentication app state changes', async () => {
            const authenticateWithBiometrics = jest.spyOn(SecurityManager, 'authenticateWithBiometrics');
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);
            SecurityManager.addServer('server-8', {MobileEnableBiometrics: 'true'} as ClientConfig);
            SecurityManager.setActiveServer('server-8');
            SecurityManager.onAppStateChange('background' as AppStateStatus);
            SecurityManager.backgroundSince = Date.now() - toMilliseconds({minutes: 5, seconds: 1});
            SecurityManager.onAppStateChange('active' as AppStateStatus);
            await TestHelper.wait(300);
            expect(authenticateWithBiometrics).toHaveBeenCalledWith('server-8');
        });
    });

    describe('showNotSecuredAlert', () => {
        test('should show not secured alert', async () => {
            SecurityManager.addServer('server-9');
            SecurityManager.showNotSecuredAlert('server-9', 'Test Site', getTranslations(DEFAULT_LOCALE));
            await TestHelper.wait(300);
            expect(Alert.alert).toHaveBeenCalled();
        });
    });

    describe('goToPreviousServer', () => {
        afterAll(() => {
            jest.clearAllMocks();
        });

        test('should switch to previous server', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(true);
            jest.mocked(switchToServer).mockImplementation((serverUrl: string) => {
                SecurityManager.setActiveServer(serverUrl);
                return Promise.resolve();
            });
            SecurityManager.activeServer = undefined;
            SecurityManager.addServer('server-10', {MobileEnableBiometrics: 'true'} as ClientConfig);
            SecurityManager.setActiveServer('server-10');
            SecurityManager.addServer('server-11', {MobileEnableBiometrics: 'true'} as ClientConfig);
            SecurityManager.setActiveServer('server-11');
            await SecurityManager.goToPreviousServer(['server-10', 'server-11']);
            expect(switchToServer).toHaveBeenCalledWith('server-10', expect.anything(), expect.anything());
            expect(SecurityManager.activeServer).toBe('server-10');
        });
    });

    describe('buildAlertOptions', () => {
        test('should build alert options with logout', async () => {
            jest.mocked(getServerCredentials).mockResolvedValue({token: 'some-token', serverUrl: 'server-12', userId: 'me'});
            SecurityManager.addServer('server-12', {MobileEnableBiometrics: 'true'} as ClientConfig);
            SecurityManager.setActiveServer('server-12');
            const translations = getTranslations(DEFAULT_LOCALE);
            const buttons = await SecurityManager.buildAlertOptions('server-12', translations);
            expect(buttons.length).toBeGreaterThan(0);
            const logoutButton = buttons.find((button) => button.text === translations[t('mobile.managed.logout')]);
            expect(logoutButton).toBeDefined();
            logoutButton?.onPress?.();
            expect(logout).toHaveBeenCalledWith('server-12', undefined);
        });
    });

    describe('showDeviceNotTrustedAlert', () => {
        test('should show device not trusted alert', async () => {
            const server = 'server-13';
            const siteName = 'Site Name';
            const translations = getTranslations(DEFAULT_LOCALE);

            await SecurityManager.showDeviceNotTrustedAlert(server, siteName, translations);

            expect(Alert.alert).toHaveBeenCalledWith(
                translations[t('mobile.managed.blocked_by')].replace('{vendor}', siteName),
                translations[t('mobile.managed.jailbreak')].replace('{vendor}', siteName),
                expect.any(Array),
                {cancelable: false},
            );
        });
    });

    describe('showBiometricFailureAlert', () => {
        test('should show biometric failure alert', async () => {
            const server = 'server-14';
            const siteName = 'Site Name';
            const translations = getTranslations(DEFAULT_LOCALE);

            await SecurityManager.showBiometricFailureAlert(server, false, siteName, translations);

            expect(Alert.alert).toHaveBeenCalledWith(
                translations[t('mobile.managed.blocked_by')].replace('{vendor}', siteName),
                translations[t('mobile.managed.biometric_failed')],
                expect.any(Array),
                {cancelable: false},
            );
        });
    });

    describe('isDeviceJailbroken', () => {
        test('should check if device is jailbroken', async () => {
            const server = 'server-15';
            const siteName = 'Site Name';
            SecurityManager.addServer(server, {MobileJailbreakProtection: 'true'} as ClientConfig);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);
            const translations = getTranslations(DEFAULT_LOCALE);

            const result = await SecurityManager.isDeviceJailbroken(server, siteName);
            expect(result).toBe(true);
            await TestHelper.wait(300);
            expect(Alert.alert).toHaveBeenCalledWith(
                translations[t('mobile.managed.blocked_by')].replace('{vendor}', siteName),
                translations[t('mobile.managed.jailbreak')].replace('{vendor}', siteName),
                expect.any(Array),
                {cancelable: false},
            );
        });

        test('should return false if device is not jailbroken', async () => {
            const server = 'server-16';
            const siteName = 'Site Name';
            SecurityManager.addServer(server, {MobileJailbreakProtection: 'true'} as ClientConfig);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);

            const result = await SecurityManager.isDeviceJailbroken(server, siteName);

            expect(result).toBe(false);
            expect(Alert.alert).not.toHaveBeenCalled();
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
});
