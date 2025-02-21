// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {Alert, type AppStateStatus} from 'react-native';

import {switchToServer} from '@actions/app/server';
import {logout} from '@actions/remote/session';
import {DEFAULT_LOCALE, getTranslations, t} from '@i18n';
import {getServerCredentials} from '@init/credentials';
import {toMilliseconds} from '@utils/datetime';
import {logError} from '@utils/log';

import SecurityManager from '.';

jest.mock('@mattermost/react-native-emm', () => ({
    isDeviceSecured: jest.fn(),
    authenticate: jest.fn(),
    openSecuritySettings: jest.fn(),
    exitApp: jest.fn(),
}));
jest.mock('react-native', () => ({
    AppState: {
        addEventListener: jest.fn(),
    },
    Alert: {
        alert: jest.fn(),
    },
    Platform: {
        OS: 'ios',
        select: jest.fn((dict) => dict.ios || dict.default),
    },
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
    });

    test('should initialize with servers', () => {
        const servers: Record<string, any> = {
            'server-1': {SiteName: 'Server One', MobileEnableBiometrics: 'true'},
        };
        SecurityManager.init(servers, 'server-1');
        expect(SecurityManager.serverConfig['server-1']).toBeDefined();
        expect(SecurityManager.activeServer).toBe('server-1');
    });

    test('should add server config', () => {
        SecurityManager.addServer('server-2', {SiteName: 'Server Two', MobileEnableBiometrics: 'true'} as ClientConfig);
        expect(SecurityManager.serverConfig['server-2'].Biometrics).toBe(true);
    });

    test('should remove server config', () => {
        SecurityManager.addServer('server-3');
        SecurityManager.removeServer('server-3');
        expect(SecurityManager.serverConfig['server-3']).toBeUndefined();
    });

    test('should return server config', () => {
        SecurityManager.addServer('server-4', {SiteName: 'Server Four'} as ClientConfig);
        expect(SecurityManager.getServerConfig('server-4')?.siteName).toBe('Server Four');
    });

    test('should set active server', () => {
        SecurityManager.addServer('server-5');
        SecurityManager.setActiveServer('server-5');
        expect(SecurityManager.activeServer).toBe('server-5');
    });

    test('should handle biometric authentication if needed', async () => {
        (Emm.isDeviceSecured as jest.Mock).mockResolvedValue(true);
        (Emm.authenticate as jest.Mock).mockResolvedValue(true);
        SecurityManager.addServer('server-6', {MobileEnableBiometrics: 'true'} as ClientConfig);
        await expect(SecurityManager.authenticateWithBiometricsIfNeeded('server-6')).resolves.toBe(true);
    });

    test('should log error on biometric failure', async () => {
        (Emm.authenticate as jest.Mock).mockRejectedValue(new Error('Authorization cancelled'));
        SecurityManager.addServer('server-7', {MobileEnableBiometrics: 'true'} as ClientConfig);
        await SecurityManager.authenticateWithBiometrics('server-7');
        expect(logError).toHaveBeenCalled();
    });

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
        SecurityManager.addServer('server-8', {MobileEnableBiometrics: 'true'} as ClientConfig);
        SecurityManager.setActiveServer('server-8');
        SecurityManager.onAppStateChange('background' as AppStateStatus);
        SecurityManager.backgroundSince = Date.now() - toMilliseconds({minutes: 5, seconds: 1});
        SecurityManager.onAppStateChange('active' as AppStateStatus);
        expect(authenticateWithBiometrics).toHaveBeenCalledWith('server-8');
    });

    test('should show not secured alert', async () => {
        SecurityManager.addServer('server-9');
        SecurityManager.showNotSecuredAlert('server-9', 'Test Site', getTranslations(DEFAULT_LOCALE));
        const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));
        await wait(300);
        expect(Alert.alert).toHaveBeenCalled();
    });

    test('should switch to previous server', async () => {
        SecurityManager.activeServer = undefined;
        SecurityManager.addServer('server-10', {MobileEnableBiometrics: 'true'} as ClientConfig);
        SecurityManager.setActiveServer('server-10');
        SecurityManager.addServer('server-11', {MobileEnableBiometrics: 'true'} as ClientConfig);
        SecurityManager.setActiveServer('server-11');
        await SecurityManager.goToPreviousServer(['server-10', 'server-11']);
        expect(switchToServer).toHaveBeenCalledWith('server-10', expect.anything(), expect.anything());
    });

    test('should build alert options with logout', async () => {
        (getServerCredentials as jest.Mock).mockResolvedValue(true);
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
