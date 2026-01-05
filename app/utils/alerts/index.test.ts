// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {Alert, Platform, type AlertButton} from 'react-native';

import {switchToServer} from '@actions/app/server';
import {logout} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import {getTranslations} from '@i18n';
import {getServerCredentials} from '@init/credentials';
import {queryAllActiveServers} from '@queries/app/servers';
import {getConfigValue} from '@queries/servers/system';

import {
    buildSecurityAlertOptions,
    showDeviceNotTrustedAlert,
    showNotSecuredAlert,
    showBiometricFailureAlert,
    messages,
} from '.';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database, Query} from '@nozbe/watermelondb';
import type ServersModel from '@typings/database/models/app/servers';

jest.mock('@mattermost/react-native-emm', () => ({
    __esModule: true,
    default: {
        exitApp: jest.fn(),
        openSecuritySettings: jest.fn(),
        removeBlurEffect: jest.fn(),
        addListener: jest.fn(),
        getManagedConfig: jest.fn(() => ({})),
        setAppGroupId: jest.fn(),
    },
}));
jest.mock('@actions/remote/session');
jest.mock('@actions/app/server');
jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(),
    getActiveServerUrl: jest.fn(),
}));
jest.mock('@init/credentials');
jest.mock('@queries/app/servers');
jest.mock('@queries/servers/system');
jest.mock('@i18n', () => ({
    DEFAULT_LOCALE: 'en',
    getTranslations: jest.fn(),
}));

describe('buildSecurityAlertOptions', () => {
    const serverUrl = 'https://example.com';
    const mockTranslations = {
        [messages.logout.id]: 'Logout',
        [messages.okay.id]: 'Okay',
        [messages.switchServer.id]: 'Switch server',
        [messages.exit.id]: 'Exit',
        [messages.retry.id]: 'Retry',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getTranslations).mockReturnValue(mockTranslations);
    });

    it('should return logout button when server has session', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue({
            serverUrl,
            token: 'token',
            userId: 'user_id',
        } as ServerCredential);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([{url: serverUrl}]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);

        const buttons = await buildSecurityAlertOptions(serverUrl, mockTranslations);

        expect(buttons).toHaveLength(1);
        expect(buttons[0].text).toBe('Logout');
        expect(buttons[0].style).toBe('destructive');
    });

    it('should call logout when logout button is pressed', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue({
            serverUrl,
            token: 'token',
            userId: 'user_id',
        } as ServerCredential);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([{url: serverUrl}]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);

        const mockCallback = jest.fn();
        const buttons = await buildSecurityAlertOptions(serverUrl, mockTranslations, mockCallback);

        await buttons[0].onPress?.();

        expect(logout).toHaveBeenCalledWith(serverUrl, undefined);
        expect(mockCallback).toHaveBeenCalledWith(true);
    });

    it('should return Exit button when there is only one server', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue(null);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([{url: serverUrl}]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);

        const buttons = await buildSecurityAlertOptions(serverUrl, mockTranslations);

        // When there's only one server total, otherServers will be empty, so Exit button is shown
        expect(buttons).toHaveLength(1);
        expect(buttons[0].text).toBe('Exit');
        expect(buttons[0].style).toBe('destructive');
    });

    it('should return switch server button when there are multiple servers', async () => {
        const otherServerUrl = 'https://other.example.com';
        jest.mocked(getServerCredentials).mockResolvedValue(null);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([
                {url: serverUrl},
                {url: otherServerUrl},
            ]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);

        const buttons = await buildSecurityAlertOptions(serverUrl, mockTranslations);

        expect(buttons).toHaveLength(1);
        expect(buttons[0].text).toBe('Switch server');
        expect(buttons[0].style).toBe('cancel');
    });

    it('should call switchToServer when switch server button is pressed', async () => {
        const otherServerUrl = 'https://other.example.com';
        jest.mocked(getServerCredentials).mockResolvedValue(null);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([
                {url: serverUrl},
                {url: otherServerUrl},
            ]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);

        const mockCallback = jest.fn();
        const buttons = await buildSecurityAlertOptions(serverUrl, mockTranslations, mockCallback);

        buttons[0].onPress?.();

        expect(switchToServer).toHaveBeenCalledWith(otherServerUrl, expect.anything(), expect.anything());
        expect(mockCallback).toHaveBeenCalledWith(true);
    });

    it('should return retry button when retryCallback is provided', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue(null);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([{url: serverUrl}]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);

        const mockRetryCallback = jest.fn();
        const buttons = await buildSecurityAlertOptions(serverUrl, mockTranslations, undefined, mockRetryCallback);

        expect(buttons.length).toBeGreaterThanOrEqual(1);
        const retryButton = buttons.find((b) => b.text === 'Retry');
        expect(retryButton).toBeDefined();
        expect(retryButton?.style).toBe('default');
    });

    it('should call retryCallback when retry button is pressed', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue(null);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([{url: serverUrl}]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);

        const mockRetryCallback = jest.fn();
        const buttons = await buildSecurityAlertOptions(serverUrl, mockTranslations, undefined, mockRetryCallback);

        const retryButton = buttons.find((b) => b.text === 'Retry');
        retryButton?.onPress?.();

        expect(mockRetryCallback).toHaveBeenCalled();
    });

    it('should return exit button when there are no other options', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue(null);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue('');

        const buttons = await buildSecurityAlertOptions(serverUrl, mockTranslations);

        expect(buttons).toHaveLength(1);
        expect(buttons[0].text).toBe('Exit');
        expect(buttons[0].style).toBe('destructive');
    });

    it('should call Emm.exitApp when exit button is pressed', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue(null);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue('');

        const buttons = await buildSecurityAlertOptions(serverUrl, mockTranslations);

        buttons[0].onPress?.();

        expect(Emm.exitApp).toHaveBeenCalled();
    });

    it('should handle logout and retry buttons together', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue({
            serverUrl,
            token: 'token',
            userId: 'user_id',
        } as ServerCredential);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([{url: serverUrl}]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);

        const mockRetryCallback = jest.fn();
        const buttons = await buildSecurityAlertOptions(serverUrl, mockTranslations, undefined, mockRetryCallback);

        expect(buttons).toHaveLength(2);
        expect(buttons[0].text).toBe('Logout');
        expect(buttons[1].text).toBe('Retry');
    });
});

describe('showDeviceNotTrustedAlert', () => {
    const serverUrl = 'https://example.com';
    const mockDatabase = {} as unknown as Database;
    const mockTranslations = {
        [messages.blocked_by.id]: 'Blocked by {vendor}',
        [messages.jailbreak.id]: 'Jailbroken or rooted devices are not trusted by {vendor}.',
        [messages.logout.id]: 'Logout',
        [messages.exit.id]: 'Exit',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({
            database: mockDatabase,
            operator: {} as unknown as ServerDataOperator,
        });
        jest.mocked(getTranslations).mockReturnValue(mockTranslations);
        jest.mocked(getConfigValue).mockResolvedValue('TestSite');
        jest.mocked(getServerCredentials).mockResolvedValue(null);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue('');
        jest.spyOn(Alert, 'alert');
    });

    it('should show alert with site name from parameter', async () => {
        await showDeviceNotTrustedAlert(serverUrl, 'CustomSite', 'en');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Blocked by CustomSite',
            'Jailbroken or rooted devices are not trusted by CustomSite.',
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should show alert with site name from server config when parameter not provided', async () => {
        await showDeviceNotTrustedAlert(serverUrl, undefined, 'en');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Blocked by TestSite',
            'Jailbroken or rooted devices are not trusted by TestSite.',
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should show alert with Mattermost as default when no site name available', async () => {
        jest.mocked(getConfigValue).mockResolvedValue(undefined);

        await showDeviceNotTrustedAlert(serverUrl, undefined, 'en');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Blocked by Mattermost',
            'Jailbroken or rooted devices are not trusted by Mattermost.',
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should build security alert buttons', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue({
            serverUrl,
            token: 'token',
            userId: 'user_id',
        } as ServerCredential);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([{url: serverUrl}]),
        } as unknown as Query<ServersModel>);

        await showDeviceNotTrustedAlert(serverUrl, undefined, 'en');

        expect(Alert.alert).toHaveBeenCalled();
        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementation(() => {
            throw new Error('Database error');
        });

        // Should not throw
        await expect(showDeviceNotTrustedAlert(serverUrl, undefined, 'en')).resolves.not.toThrow();
    });
});

describe('showNotSecuredAlert', () => {
    const serverUrl = 'https://example.com';
    const mockDatabase = {} as unknown as Database;
    const mockTranslations = {
        [messages.blocked_by.id]: 'Blocked by {vendor}',
        [messages.not_secured_vendor_ios.id]: 'This device must be secured with biometrics or passcode to use {vendor}.\n\nGo to Settings > Face ID & Passcode.',
        [messages.not_secured_vendor_android.id]: 'This device must be secured with a screen lock to use {vendor}.',
        [messages.not_secured_ios.id]: 'This device must be secured with biometrics or passcode to use Mattermost.\n\nGo to Settings > Face ID & Passcode.',
        [messages.not_secured_android.id]: 'This device must be secured with a screen lock to use Mattermost.',
        [messages.androidSettings.id]: 'Go to settings',
        [messages.logout.id]: 'Logout',
        [messages.exit.id]: 'Exit',
    };
    const originalSelect = Platform.select;

    beforeAll(() => {
        Platform.select = ({android, ios, default: dft}: any) => {
            if (Platform.OS === 'android' && android) {
                return android;
            } else if (Platform.OS === 'ios' && ios) {
                return ios;
            }

            return dft || ios;
        };
    });

    afterAll(() => {
        Platform.select = originalSelect;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({
            database: mockDatabase,
            operator: {} as ServerDataOperator,
        });
        jest.mocked(getTranslations).mockReturnValue(mockTranslations);
        jest.mocked(getConfigValue).mockResolvedValue('TestSite');
        jest.mocked(getServerCredentials).mockResolvedValue(null);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue('');
        jest.spyOn(Alert, 'alert');
        Platform.OS = 'ios';
    });

    it('should show iOS-specific message with vendor name', async () => {
        Platform.OS = 'ios';

        await showNotSecuredAlert(serverUrl, 'CustomSite', 'en');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Blocked by CustomSite',
            expect.stringContaining('biometrics or passcode'),
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should show Android-specific message with vendor name', async () => {
        Platform.OS = 'android';

        await showNotSecuredAlert(serverUrl, 'CustomSite', 'en');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Blocked by CustomSite',
            expect.stringContaining('screen lock'),
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should show iOS-specific message without vendor name', async () => {
        Platform.OS = 'ios';
        jest.mocked(getConfigValue).mockResolvedValue(undefined);

        await showNotSecuredAlert(serverUrl, undefined, 'en');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Blocked by Mattermost',
            expect.stringContaining('Mattermost'),
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should show Android-specific message without vendor name', async () => {
        Platform.OS = 'android';
        jest.mocked(getConfigValue).mockResolvedValue(undefined);

        await showNotSecuredAlert(serverUrl, undefined, 'en');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Blocked by Mattermost',
            expect.stringContaining('Mattermost'),
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should add Android settings button on Android platform', async () => {
        Platform.OS = 'android';

        await showNotSecuredAlert(serverUrl, undefined, 'en');

        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
        const settingsButton = buttons.find((b: AlertButton) => b.text === 'Go to settings');
        expect(settingsButton).toBeDefined();
    });

    it('should call Emm.openSecuritySettings when Android settings button is pressed', async () => {
        Platform.OS = 'android';

        await showNotSecuredAlert(serverUrl, undefined, 'en');

        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
        const settingsButton = buttons.find((b: AlertButton) => b.text === 'Go to settings');
        settingsButton?.onPress();

        expect(Emm.openSecuritySettings).toHaveBeenCalled();
    });

    it('should not add Android settings button on iOS platform', async () => {
        Platform.OS = 'ios';

        await showNotSecuredAlert(serverUrl, undefined, 'en');

        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
        const settingsButton = buttons.find((b: AlertButton) => b.text === 'Go to settings');
        expect(settingsButton).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementation(() => {
            throw new Error('Database error');
        });

        // Should not throw
        await expect(showNotSecuredAlert(serverUrl, undefined, 'en')).resolves.not.toThrow();
    });
});

describe('showBiometricFailureAlert', () => {
    const serverUrl = 'https://example.com';
    const mockDatabase = {} as unknown as Database;
    const mockTranslations = {
        [messages.blocked_by.id]: 'Blocked by {vendor}',
        [messages.biometric_failed.id]: 'Biometric or Passcode authentication failed.',
        [messages.logout.id]: 'Logout',
        [messages.exit.id]: 'Exit',
        [messages.retry.id]: 'Retry',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({
            database: mockDatabase,
            operator: {} as ServerDataOperator,
        });
        jest.mocked(getTranslations).mockReturnValue(mockTranslations);
        jest.mocked(getConfigValue).mockResolvedValue('TestSite');
        jest.mocked(getServerCredentials).mockResolvedValue(null);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([]),
        } as unknown as Query<ServersModel>);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue('');
        jest.spyOn(Alert, 'alert');
    });

    it('should show alert with correct title and message', async () => {
        await showBiometricFailureAlert(serverUrl, false, 'CustomSite', 'en');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Blocked by CustomSite',
            'Biometric or Passcode authentication failed.',
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should include retry button when retryCallback is provided', async () => {
        const mockRetryCallback = jest.fn();

        await showBiometricFailureAlert(serverUrl, false, undefined, 'en', mockRetryCallback);

        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
        const retryButton = buttons.find((b: AlertButton) => b.text === 'Retry');
        expect(retryButton).toBeDefined();
    });

    it('should call retryCallback when retry button is pressed', async () => {
        const mockRetryCallback = jest.fn();

        await showBiometricFailureAlert(serverUrl, false, undefined, 'en', mockRetryCallback);

        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
        const retryButton = buttons.find((b: AlertButton) => b.text === 'Retry');
        retryButton?.onPress();

        expect(mockRetryCallback).toHaveBeenCalled();
    });

    it('should remove blur effect when callback is invoked with blurOnAuthenticate=true', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue({
            serverUrl,
            token: 'token',
            userId: 'user_id',
        } as ServerCredential);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([{url: serverUrl}]),
        } as unknown as Query<ServersModel>);

        await showBiometricFailureAlert(serverUrl, true, undefined, 'en');

        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
        const logoutButton = buttons.find((b: AlertButton) => b.text === 'Logout');
        await logoutButton?.onPress();

        expect(Emm.removeBlurEffect).toHaveBeenCalled();
    });

    it('should not remove blur effect when blurOnAuthenticate=false', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue({
            serverUrl,
            token: 'token',
            userId: 'user_id',
        } as ServerCredential);
        jest.mocked(queryAllActiveServers).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([{url: serverUrl}]),
        } as unknown as Query<ServersModel>);

        await showBiometricFailureAlert(serverUrl, false, undefined, 'en');

        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
        const logoutButton = buttons.find((b: AlertButton) => b.text === 'Logout');
        await logoutButton?.onPress();

        expect(Emm.removeBlurEffect).not.toHaveBeenCalled();
    });

    it('should use site name from server config when not provided', async () => {
        await showBiometricFailureAlert(serverUrl, false, undefined, 'en');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Blocked by TestSite',
            'Biometric or Passcode authentication failed.',
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should use Mattermost as default when no site name available', async () => {
        jest.mocked(getConfigValue).mockResolvedValue(undefined);

        await showBiometricFailureAlert(serverUrl, false, undefined, 'en');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Blocked by Mattermost',
            'Biometric or Passcode authentication failed.',
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should handle errors gracefully', async () => {
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementation(() => {
            throw new Error('Database error');
        });

        // Should not throw
        await expect(showBiometricFailureAlert(serverUrl, false, undefined, 'en')).resolves.not.toThrow();
    });
});
