// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules, Platform} from 'react-native';

import {storeGlobal} from '@actions/app/global';
import DatabaseManager from '@database/manager';
import {getDeviceToken, getVoIPDeviceToken, queryGlobalValue} from '@queries/app/global';

import {
    getNotificationDeliveryMode,
    getNotificationDeliveryModeKey,
    getNotificationDeviceToken,
    getNotificationVoIPDeviceToken,
    loadNotificationDeliveryModes,
    NotificationDeliveryMode,
    normalizeNotificationDeliveryMode,
    persistNotificationDeliveryMode,
    removeNotificationDeliveryMode,
    resetNotificationDeliveryModeCache,
} from './mode';

jest.mock('@actions/app/global', () => ({
    storeGlobal: jest.fn(),
}));
jest.mock('@database/manager', () => ({
    __esModule: true,
    default: {
        getAppDatabaseAndOperator: jest.fn(),
    },
}));
jest.mock('@queries/app/global', () => ({
    getDeviceToken: jest.fn(),
    getVoIPDeviceToken: jest.fn(),
    queryGlobalValue: jest.fn(),
}));

const serverUrl = 'https://direct.example.com';
const nativeModule = {
    setMode: jest.fn(),
    removeServer: jest.fn(),
};

describe('Direct notification delivery modes', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
        Platform.OS = 'android';
        NativeModules.ENCMADirectNotifications = nativeModule;
        nativeModule.setMode.mockResolvedValue(undefined);
        nativeModule.removeServer.mockResolvedValue(undefined);
        jest.mocked(storeGlobal).mockResolvedValue([]);
        jest.mocked(getDeviceToken).mockResolvedValue('fcm-token');
        jest.mocked(getVoIPDeviceToken).mockResolvedValue('voip-token');
        resetNotificationDeliveryModeCache();
    });

    afterEach(() => {
        Platform.OS = originalPlatform;
        delete NativeModules.ENCMADirectNotifications;
        jest.clearAllMocks();
    });

    it('normalizes missing and unknown values to Server push', () => {
        expect(normalizeNotificationDeliveryMode(undefined)).toBe(NotificationDeliveryMode.SERVER_PUSH);
        expect(normalizeNotificationDeliveryMode('unexpected')).toBe(NotificationDeliveryMode.SERVER_PUSH);
        expect(normalizeNotificationDeliveryMode(NotificationDeliveryMode.DIRECT)).toBe(NotificationDeliveryMode.DIRECT);
        expect(normalizeNotificationDeliveryMode(NotificationDeliveryMode.OFF)).toBe(NotificationDeliveryMode.OFF);
    });

    it('persists per-server modes and synchronizes native suppression storage', async () => {
        await persistNotificationDeliveryMode(serverUrl, NotificationDeliveryMode.DIRECT);

        expect(nativeModule.setMode).toHaveBeenCalledWith(serverUrl, NotificationDeliveryMode.DIRECT);
        expect(storeGlobal).toHaveBeenCalledWith(getNotificationDeliveryModeKey(serverUrl), NotificationDeliveryMode.DIRECT, false);
        await expect(getNotificationDeliveryMode(serverUrl)).resolves.toBe(NotificationDeliveryMode.DIRECT);
    });

    it('never exposes FCM or VoIP tokens for Direct or Off, but preserves Server push', async () => {
        await persistNotificationDeliveryMode(serverUrl, NotificationDeliveryMode.DIRECT);
        await expect(getNotificationDeviceToken(serverUrl)).resolves.toBe('');
        await expect(getNotificationVoIPDeviceToken(serverUrl)).resolves.toBe('');

        await persistNotificationDeliveryMode(serverUrl, NotificationDeliveryMode.OFF);
        await expect(getNotificationDeviceToken(serverUrl)).resolves.toBe('');
        await expect(getNotificationVoIPDeviceToken(serverUrl)).resolves.toBe('');

        await persistNotificationDeliveryMode(serverUrl, NotificationDeliveryMode.SERVER_PUSH);
        await expect(getNotificationDeviceToken(serverUrl)).resolves.toBe('fcm-token');
        await expect(getNotificationVoIPDeviceToken(serverUrl)).resolves.toBe('voip-token');
        expect(getDeviceToken).toHaveBeenCalledTimes(1);
        expect(getVoIPDeviceToken).toHaveBeenCalledTimes(1);
    });

    it('loads all saved modes before WebSocket decisions and updates native storage', async () => {
        const records = [
            {id: getNotificationDeliveryModeKey(serverUrl), value: NotificationDeliveryMode.OFF},
            {id: getNotificationDeliveryModeKey('https://other.example.com'), value: NotificationDeliveryMode.DIRECT},
            {id: 'unrelated', value: 'ignored'},
        ];
        const fetch = jest.fn().mockResolvedValue(records);
        const query = jest.fn().mockReturnValue({fetch});
        const get = jest.fn().mockReturnValue({query});
        jest.mocked(DatabaseManager.getAppDatabaseAndOperator).mockReturnValue({database: {get}} as never);

        await loadNotificationDeliveryModes();

        await expect(getNotificationDeliveryMode(serverUrl)).resolves.toBe(NotificationDeliveryMode.OFF);
        await expect(getNotificationDeliveryMode('https://other.example.com')).resolves.toBe(NotificationDeliveryMode.DIRECT);
        expect(nativeModule.setMode).toHaveBeenCalledWith(serverUrl, NotificationDeliveryMode.OFF);
        expect(nativeModule.setMode).toHaveBeenCalledWith('https://other.example.com', NotificationDeliveryMode.DIRECT);
    });

    it('removes both native and persisted per-server state', async () => {
        await persistNotificationDeliveryMode(serverUrl, NotificationDeliveryMode.OFF);
        await removeNotificationDeliveryMode(serverUrl);

        expect(nativeModule.removeServer).toHaveBeenCalledWith(serverUrl);
        expect(storeGlobal).toHaveBeenLastCalledWith(getNotificationDeliveryModeKey(serverUrl), null, false);
        jest.mocked(queryGlobalValue).mockReturnValue({fetch: jest.fn().mockResolvedValue([])} as never);
        await expect(getNotificationDeliveryMode(serverUrl)).resolves.toBe(NotificationDeliveryMode.SERVER_PUSH);
    });
});
