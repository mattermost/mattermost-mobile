// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CookieManager from '@react-native-cookies/cookies';
import {AppState, DeviceEventEmitter, Platform} from 'react-native';

import {cancelSessionNotification, logout, scheduleSessionNotification} from '@actions/remote/session';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import {getAllServerCredentials, removeServerCredentials} from '@init/credentials';
import {relaunchApp} from '@init/launch';
import PushNotifications from '@init/push_notifications';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import WebsocketManager from '@managers/websocket_manager';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
import {isMainActivity} from '@utils/helpers';

import {SessionManagerSingleton as SessionManagerClass} from './session_manager';

jest.mock('@react-native-cookies/cookies', () => ({
    get: jest.fn(),
    clearByName: jest.fn(),
    flush: jest.fn(),
}));
jest.mock('expo-image');
jest.mock('@actions/app/global');
jest.mock('@actions/remote/session');
jest.mock('@database/manager', () => ({
    getActiveServerUrl: jest.fn(),
    getActiveServerDisplayName: jest.fn(),
    destroyServerDatabase: jest.fn(),
    deleteServerDatabase: jest.fn(),
    serverDatabases: {},
}));
jest.mock('@i18n');
jest.mock('@init/credentials');
jest.mock('@init/launch');
jest.mock('@init/push_notifications');
jest.mock('@managers/network_manager');
jest.mock('@managers/security_manager');
jest.mock('@managers/websocket_manager');
jest.mock('@queries/app/servers');
jest.mock('@queries/servers/user');
jest.mock('@screens/navigation');
jest.mock('@store/ephemeral_store');
jest.mock('@utils/file');
jest.mock('@utils/helpers');

describe('SessionManager', () => {
    const mockServerUrl = 'https://example.com';
    const mockServerDisplayName = 'Example Server';
    let appStateCallback: ((state: string) => void) | undefined;
    let SessionManager: SessionManagerClass;

    jest.mocked(isMainActivity).mockReturnValue(true);

    jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(mockServerUrl);
    jest.mocked(DatabaseManager.getActiveServerDisplayName).mockResolvedValue(mockServerDisplayName);

    (CookieManager.get as jest.Mock).mockResolvedValue({
        cookie1: {name: 'cookie1'},
        cookie2: {name: 'cookie2'},
    });

    jest.mocked(getAllServerCredentials).mockResolvedValue([{serverUrl: mockServerUrl, userId: 'user_id', token: 'token'}]);

    beforeEach(() => {
        jest.clearAllMocks();

        AppState.currentState = 'active';
        Platform.OS = 'ios';

        (AppState.addEventListener as jest.Mock).mockImplementation((event, callback) => {
            if (event === 'change' || event === 'focus' || event === 'blur') {
                appStateCallback = callback;
            }
            return {remove: jest.fn()};
        });

        SessionManager = new SessionManagerClass();
    });

    describe('initialization', () => {
        it('should construct with Android correctly', async () => {
            Platform.OS = 'android';
            const manager = new SessionManagerClass();
            expect(manager).toBeDefined();
            expect(AppState.addEventListener).toHaveBeenCalledWith('blur', expect.any(Function));
            expect(AppState.addEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
        });
    });

    describe('initialization', () => {
        it('should initialize correctly', async () => {
            await SessionManager.init();
            expect(cancelSessionNotification).toHaveBeenCalled();
        });
    });

    describe('session termination', () => {
        it('should handle logout correctly', async () => {
            const event = {serverUrl: mockServerUrl, removeServer: true};
            DeviceEventEmitter.emit(Events.SERVER_LOGOUT, event);

            await new Promise((resolve) => setImmediate(resolve));

            expect(removeServerCredentials).toHaveBeenCalledWith(mockServerUrl);
            expect(PushNotifications.removeServerNotifications).toHaveBeenCalledWith(mockServerUrl);
            expect(NetworkManager.invalidateClient).toHaveBeenCalledWith(mockServerUrl);
            expect(WebsocketManager.invalidateClient).toHaveBeenCalledWith(mockServerUrl);
            expect(SecurityManager.removeServer).toHaveBeenCalledWith(mockServerUrl);
        });

        it('should handle session expiration', async () => {
            DeviceEventEmitter.emit(Events.SESSION_EXPIRED, mockServerUrl);

            await new Promise((resolve) => setImmediate(resolve));

            expect(logout).toHaveBeenCalledWith(mockServerUrl, undefined, {skipEvents: true, skipServerLogout: true});
            expect(relaunchApp).toHaveBeenCalled();
        });
    });

    describe('app state changes', () => {
        beforeEach(async () => {
            await SessionManager.init();
        });

        it('should handle active state', async () => {
            expect(appStateCallback).toBeDefined();
            if (appStateCallback) {
                jest.useFakeTimers();
                appStateCallback('active');
                jest.runAllTimers();
                expect(cancelSessionNotification).toHaveBeenCalled();
                jest.useRealTimers();
            }
        });

        it('should handle inactive state', async () => {
            expect(appStateCallback).toBeDefined();
            if (appStateCallback) {
                jest.useFakeTimers();
                appStateCallback('inactive');
                jest.runAllTimers();
                expect(scheduleSessionNotification).toHaveBeenCalled();
                jest.useRealTimers();
            }
        });
    });

    describe('cleanup operations', () => {
        beforeEach(async () => {
            const mockCookies = {
                cookie1: {name: 'cookie1'},
                cookie2: {name: 'cookie2'},
            };
            (CookieManager.get as jest.Mock).mockResolvedValue(mockCookies);
            await SessionManager.init();
        });

        it('should clear cookies correctly - iOS', async () => {
            Platform.OS = 'ios';
            jest.useFakeTimers();
            DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {
                serverUrl: mockServerUrl,
                removeServer: true,
            });

            jest.runAllTimers();

            expect(CookieManager.clearByName).toHaveBeenCalledWith(mockServerUrl, 'cookie1', false);
            expect(CookieManager.clearByName).toHaveBeenCalledWith(mockServerUrl, 'cookie2', false);
            jest.useRealTimers();
        });

        it('should clear cookies correctly - Android', async () => {
            Platform.OS = 'android';
            jest.useFakeTimers();
            DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {
                serverUrl: mockServerUrl,
                removeServer: true,
            });

            jest.runAllTimers();

            expect(CookieManager.flush).toHaveBeenCalled();
            jest.useRealTimers();
        });

        it('should clear file caches', async () => {
            jest.useFakeTimers();
            DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {
                serverUrl: mockServerUrl,
                removeServer: true,
            });

            jest.runAllTimers();

            expect(deleteFileCache).toHaveBeenCalledWith(mockServerUrl);
            expect(deleteFileCacheByDir).toHaveBeenCalledWith('mmPasteInput');
            expect(deleteFileCacheByDir).toHaveBeenCalledWith('thumbnails');
            jest.useRealTimers();
        });
    });
});
