// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CookieManager from '@react-native-cookies/cookies';
import {AppState, DeviceEventEmitter, Platform} from 'react-native';

import {cancelAllSessionNotifications} from '@actions/local/session';
import {logout, scheduleSessionNotification} from '@actions/remote/session';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import {getAllServerCredentials, removeServerCredentials} from '@init/credentials';
import {determineRouteFromLaunchProps} from '@init/launch';
import PushNotifications from '@init/push_notifications';
import IntuneManager from '@managers/intune_manager';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import WebsocketManager from '@managers/websocket_manager';
import {queryGlobalValue} from '@queries/app/global';
import {getAllServers, getServerDisplayName} from '@queries/app/servers';
import TestHelper from '@test/test_helper';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
import {isMainActivity} from '@utils/helpers';

import {SessionManagerSingleton as SessionManagerClass} from './session_manager';

import type {Query} from '@nozbe/watermelondb';
import type GlobalModel from '@typings/database/models/app/global';

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
jest.mock('@actions/local/session', () => {
    const actual = jest.requireActual('@actions/local/session');
    return {
        ...actual,
        cancelAllSessionNotifications: jest.fn(),
    };
});
jest.mock('@init/credentials');
jest.mock('@init/launch');
jest.mock('@init/push_notifications');
jest.mock('@managers/intune_manager', () => ({
    __esModule: true,
    default: {
        unenrollServer: jest.fn().mockResolvedValue(undefined),
        subscribeToPolicyChanges: jest.fn().mockReturnValue({remove: jest.fn()}),
        subscribeToEnrollmentChanges: jest.fn().mockReturnValue({remove: jest.fn()}),
        subscribeToWipeRequests: jest.fn().mockReturnValue({remove: jest.fn()}),
        subscribeToAuthRequired: jest.fn().mockReturnValue({remove: jest.fn()}),
        subscribeToConditionalLaunchBlocked: jest.fn().mockReturnValue({remove: jest.fn()}),
        subscribeToIdentitySwitchRequired: jest.fn().mockReturnValue({remove: jest.fn()}),
    },
}));
jest.mock('@managers/network_manager');
jest.mock('@managers/security_manager');
jest.mock('@managers/websocket_manager');
jest.mock('@queries/app/global', () => ({
    queryGlobalValue: jest.fn(),
    storeGlobal: jest.fn(),
}));
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
    jest.mocked(getAllServers).mockResolvedValue([]);
    jest.mocked(getServerDisplayName).mockResolvedValue(mockServerDisplayName);

    // Mock queryGlobalValue to return a resolved promise for cache migration check
    jest.mocked(queryGlobalValue).mockReturnValue({
        fetch: jest.fn().mockResolvedValue([{value: true}]),
    } as unknown as Query<GlobalModel>);

    beforeEach(() => {
        jest.clearAllMocks();

        AppState.currentState = 'active';
        Platform.OS = 'ios';

        // Reset queryGlobalValue mock to return cache migration as done
        jest.mocked(queryGlobalValue).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([{value: true}]),
        } as unknown as Query<GlobalModel>);

        (AppState.addEventListener as jest.Mock).mockImplementation((event, callback) => {
            if (event === 'change' || event === 'focus' || event === 'blur') {
                appStateCallback = callback;
            }
            return {remove: jest.fn()};
        });

        SessionManager = new SessionManagerClass();
    });

    afterEach(() => {
        // Clear all timers to prevent Jest from hanging
        jest.clearAllTimers();

        // Remove all event listeners
        DeviceEventEmitter.removeAllListeners(Events.SERVER_LOGOUT);
        DeviceEventEmitter.removeAllListeners(Events.SESSION_EXPIRED);
    });

    describe('constructor', () => {
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
            SessionManager.init();
            expect(cancelAllSessionNotifications).toHaveBeenCalled();
        });

        it('should delete legacy cache on first init', async () => {
            // Mock cache migration as not done
            jest.mocked(queryGlobalValue).mockReturnValueOnce({
                fetch: jest.fn().mockResolvedValue([]),
            } as unknown as Query<GlobalModel>);

            SessionManager.init();

            // Wait for the async promise chain to complete
            await new Promise((resolve) => setImmediate(resolve));

            expect(deleteFileCacheByDir).toHaveBeenCalledWith('com.hackemist.SDImageCache');
        });

        it('should not delete legacy cache if migration already done', async () => {
            // Mock cache migration as already done
            jest.mocked(queryGlobalValue).mockReturnValueOnce({
                fetch: jest.fn().mockResolvedValue([{value: true}]),
            } as unknown as Query<GlobalModel>);

            SessionManager.init();

            // Wait for the async promise chain to complete
            await new Promise((resolve) => setImmediate(resolve));
            await new Promise((resolve) => setImmediate(resolve));

            expect(deleteFileCacheByDir).not.toHaveBeenCalledWith('com.hackemist.SDImageCache');
        });
    });

    describe('session termination', () => {
        it('should handle logout correctly', async () => {
            const event = {serverUrl: mockServerUrl, removeServer: true};
            DeviceEventEmitter.emit(Events.SERVER_LOGOUT, event);

            await TestHelper.wait(50);

            expect(removeServerCredentials).toHaveBeenCalledWith(mockServerUrl);
            expect(PushNotifications.removeServerNotifications).toHaveBeenCalledWith(mockServerUrl);
            expect(NetworkManager.invalidateClient).toHaveBeenCalledWith(mockServerUrl);
            expect(WebsocketManager.invalidateClient).toHaveBeenCalledWith(mockServerUrl);
            expect(SecurityManager.removeServer).toHaveBeenCalledWith(mockServerUrl);
            expect(IntuneManager.unenrollServer).toHaveBeenCalledWith(mockServerUrl, false);
        });

        it('should handle session expiration', async () => {
            DeviceEventEmitter.emit(Events.SESSION_EXPIRED, mockServerUrl);

            await TestHelper.wait(50);

            expect(logout).toHaveBeenCalledWith(mockServerUrl, undefined, {skipEvents: true, skipServerLogout: true});
            expect(SecurityManager.removeServer).toHaveBeenCalledWith(mockServerUrl);
            expect(IntuneManager.unenrollServer).toHaveBeenCalledWith(mockServerUrl, true);
            expect(determineRouteFromLaunchProps).toHaveBeenCalled();
        });
    });

    describe('app state changes', () => {
        beforeEach(() => {
            SessionManager.init();
        });

        it('should handle active state', async () => {
            expect(appStateCallback).toBeDefined();
            if (appStateCallback) {
                jest.useFakeTimers();
                appStateCallback('active');
                expect(cancelAllSessionNotifications).toHaveBeenCalled();
                jest.useRealTimers();
            }
        });

        it('should handle inactive state', async () => {
            expect(appStateCallback).toBeDefined();
            if (appStateCallback) {
                appStateCallback('inactive');
                await TestHelper.wait(50);
                expect(scheduleSessionNotification).toHaveBeenCalled();
            }
        });
    });

    describe('cleanup operations', () => {
        beforeEach(() => {
            const mockCookies = {
                cookie1: {name: 'cookie1'},
                cookie2: {name: 'cookie2'},
            };
            (CookieManager.get as jest.Mock).mockResolvedValue(mockCookies);
            SessionManager.init();
        });

        it('should clear cookies correctly - iOS', async () => {
            Platform.OS = 'ios';
            DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {
                serverUrl: mockServerUrl,
                removeServer: true,
            });

            await TestHelper.wait(450);

            expect(CookieManager.clearByName).toHaveBeenCalledWith(mockServerUrl, 'cookie1', false);
            expect(CookieManager.clearByName).toHaveBeenCalledWith(mockServerUrl, 'cookie2', false);
        });

        it('should clear cookies correctly - Android', async () => {
            Platform.OS = 'android';
            DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {
                serverUrl: mockServerUrl,
                removeServer: true,
            });

            await TestHelper.wait(50);

            expect(CookieManager.flush).toHaveBeenCalled();
        });

        it('should clear file caches', async () => {
            DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {
                serverUrl: mockServerUrl,
                removeServer: true,
            });

            await TestHelper.wait(50);

            expect(deleteFileCache).toHaveBeenCalledWith(mockServerUrl);
            expect(deleteFileCacheByDir).toHaveBeenCalledWith('mmPasteInput');
            expect(deleteFileCacheByDir).toHaveBeenCalledWith('thumbnails');
        });
    });
});
