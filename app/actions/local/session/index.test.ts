// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {Platform} from 'react-native';

import {removePushDisabledInServerAcknowledged} from '@actions/app/global';
import DatabaseManager from '@database/manager';
import {resetMomentLocale} from '@i18n';
import {getAllServerCredentials, removeServerCredentials} from '@init/credentials';
import PushNotifications from '@init/push_notifications';
import NetworkManager from '@managers/network_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getDeviceToken} from '@queries/app/global';
import {getExpiredSession} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
import {clearCookiesForServer, getCSRFFromCookie, urlSafeBase64Encode} from '@utils/security';

import {cancelAllSessionNotifications, cancelSessionNotification, findSession, terminateSession} from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type {ServerDatabase, ServerDatabases} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

// Mock all dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('expo-image', () => ({
    Image: {
        clearDiskCache: jest.fn(),
    },
}));
jest.mock('@actions/app/global');
jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(),
    getActiveServerDatabase: jest.fn(),
    destroyServerDatabase: jest.fn(),
    deleteServerDatabase: jest.fn(),
    serverDatabases: {},
}));
jest.mock('@i18n', () => ({
    resetMomentLocale: jest.fn(),
}));
jest.mock('@init/credentials');
jest.mock('@init/push_notifications', () => ({
    removeServerNotifications: jest.fn(),
    cancelScheduleNotification: jest.fn(),
}));
jest.mock('@managers/network_manager', () => ({
    invalidateClient: jest.fn(),
}));
jest.mock('@managers/websocket_manager', () => ({
    invalidateClient: jest.fn(),
}));
jest.mock('@queries/app/global');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/user');
jest.mock('@utils/file');
jest.mock('@utils/log');
jest.mock('@utils/security');

describe('session actions', () => {
    const mockServerUrl = 'https://example.com';
    const mockDatabase = {database: 'mockDb'};
    const mockOperator = {
        handleSystem: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findSession', () => {
        const mockSessions: Session[] = [
            {id: 'session1', device_id: 'device123', props: {csrf: 'csrf123', os: 'ios'}} as Session,
            {id: 'session2', device_id: 'device456', props: {csrf: 'csrf456', os: 'android'}} as Session,
            {id: 'session3', device_id: 'device789', props: {csrf: 'csrf789', os: 'ios'}} as Session,
        ];

        beforeEach(() => {
            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({
                database: mockDatabase as unknown as Database,
                operator: mockOperator as unknown as ServerDataOperator,
            });
        });

        it('should find session by expired session ID', async () => {
            const expiredSession = {id: 'session2', notificationId: '123'};
            jest.mocked(getExpiredSession).mockResolvedValue(expiredSession as SessionExpiration);
            jest.mocked(getDeviceToken).mockResolvedValue('device999');
            jest.mocked(getCSRFFromCookie).mockResolvedValue('csrf999');

            const result = await findSession(mockServerUrl, mockSessions);

            expect(result).toEqual(mockSessions[1]);
            expect(getExpiredSession).toHaveBeenCalledWith(mockDatabase);
        });

        it('should find session by device token', async () => {
            jest.mocked(getExpiredSession).mockResolvedValue(undefined);
            jest.mocked(getDeviceToken).mockResolvedValue('device456');
            jest.mocked(getCSRFFromCookie).mockResolvedValue('csrf999');

            const result = await findSession(mockServerUrl, mockSessions);

            expect(result).toEqual(mockSessions[1]);
            expect(getDeviceToken).toHaveBeenCalled();
        });

        it('should find session by CSRF token', async () => {
            jest.mocked(getExpiredSession).mockResolvedValue(undefined);
            jest.mocked(getDeviceToken).mockResolvedValue('device999');
            jest.mocked(getCSRFFromCookie).mockResolvedValue('csrf789');

            const result = await findSession(mockServerUrl, mockSessions);

            expect(result).toEqual(mockSessions[2]);
            expect(getCSRFFromCookie).toHaveBeenCalledWith(mockServerUrl);
        });

        it('should find session by platform OS', async () => {
            Platform.OS = 'android';
            jest.mocked(getExpiredSession).mockResolvedValue(undefined);
            jest.mocked(getDeviceToken).mockResolvedValue('device999');
            jest.mocked(getCSRFFromCookie).mockResolvedValue('csrf999');

            const result = await findSession(mockServerUrl, mockSessions);

            expect(result).toEqual(mockSessions[1]);
        });

        it('should return undefined when no session matches', async () => {
            jest.mocked(getExpiredSession).mockResolvedValue(undefined);
            jest.mocked(getDeviceToken).mockResolvedValue('device999');
            jest.mocked(getCSRFFromCookie).mockResolvedValue('csrf999');
            Platform.OS = 'web';

            const result = await findSession(mockServerUrl, mockSessions);

            expect(result).toBeUndefined();
        });

        it('should handle errors gracefully and return undefined', async () => {
            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementation(() => {
                throw new Error('Database error');
            });

            const result = await findSession(mockServerUrl, mockSessions);

            expect(result).toBeUndefined();
        });
    });

    describe('cancelAllSessionNotifications', () => {
        it('should cancel notifications for all servers with credentials', async () => {
            const mockCredentials = [
                {serverUrl: 'https://server1.com', userId: 'user1', token: 'token1'},
                {serverUrl: 'https://server2.com', userId: 'user2', token: 'token2'},
            ];
            jest.mocked(getAllServerCredentials).mockResolvedValue(mockCredentials);
            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({
                database: mockDatabase as unknown as Database,
                operator: mockOperator as unknown as ServerDataOperator,
            });
            jest.mocked(getExpiredSession).mockResolvedValue({
                id: 'session1',
                notificationId: '123',
            } as SessionExpiration);
            jest.mocked(NetInfo.fetch).mockResolvedValue({
                isInternetReachable: true,
            } as NetInfoState);

            await cancelAllSessionNotifications();

            expect(getAllServerCredentials).toHaveBeenCalled();
            expect(DatabaseManager.getServerDatabaseAndOperator).toHaveBeenCalledTimes(2);
        });

        it('should handle empty credentials list', async () => {
            jest.mocked(getAllServerCredentials).mockResolvedValue([]);

            await cancelAllSessionNotifications();

            expect(getAllServerCredentials).toHaveBeenCalled();
            expect(DatabaseManager.getServerDatabaseAndOperator).not.toHaveBeenCalled();
        });
    });

    describe('cancelSessionNotification', () => {
        beforeEach(() => {
            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({
                database: mockDatabase as unknown as Database,
                operator: mockOperator as unknown as ServerDataOperator,
            });
        });

        it('should cancel notification when expired session has notification ID and internet is reachable', async () => {
            const expiredSession = {id: 'session1', notificationId: '123'};
            jest.mocked(getExpiredSession).mockResolvedValue(expiredSession as SessionExpiration);
            jest.mocked(NetInfo.fetch).mockResolvedValue({
                isInternetReachable: true,
            } as NetInfoState);

            const result = await cancelSessionNotification(mockServerUrl);

            expect(PushNotifications.cancelScheduleNotification).toHaveBeenCalledWith(123);
            expect(mockOperator.handleSystem).toHaveBeenCalledWith({
                systems: [{
                    id: 'sessionExpiration',
                    value: '',
                }],
                prepareRecordsOnly: false,
            });
            expect(result).toEqual({});
        });

        it('should not cancel notification when no notification ID', async () => {
            const expiredSession = {id: 'session1', notificationId: ''};
            jest.mocked(getExpiredSession).mockResolvedValue(expiredSession as SessionExpiration);
            jest.mocked(NetInfo.fetch).mockResolvedValue({
                isInternetReachable: true,
            } as NetInfoState);

            const result = await cancelSessionNotification(mockServerUrl);

            expect(PushNotifications.cancelScheduleNotification).not.toHaveBeenCalled();
            expect(mockOperator.handleSystem).not.toHaveBeenCalled();
            expect(result).toEqual({});
        });

        it('should not cancel notification when internet not reachable', async () => {
            const expiredSession = {id: 'session1', notificationId: '123'};
            jest.mocked(getExpiredSession).mockResolvedValue(expiredSession as SessionExpiration);
            jest.mocked(NetInfo.fetch).mockResolvedValue({
                isInternetReachable: false,
            } as NetInfoState);

            const result = await cancelSessionNotification(mockServerUrl);

            expect(PushNotifications.cancelScheduleNotification).not.toHaveBeenCalled();
            expect(mockOperator.handleSystem).not.toHaveBeenCalled();
            expect(result).toEqual({});
        });

        it('should handle errors gracefully and return error object', async () => {
            const error = new Error('Database error');
            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementation(() => {
                throw error;
            });

            const result = await cancelSessionNotification(mockServerUrl);

            expect(result).toEqual({error});
        });
    });

    describe('terminateSession', () => {
        const encodedServerUrl = 'aHR0cHM6Ly9leGFtcGxlLmNvbQ==';

        beforeEach(() => {
            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({
                database: mockDatabase as unknown as Database,
                operator: mockOperator as unknown as ServerDataOperator,
            });
            jest.mocked(getExpiredSession).mockResolvedValue(undefined);
            jest.mocked(NetInfo.fetch).mockResolvedValue({
                isInternetReachable: false,
            } as NetInfoState);
            jest.mocked(urlSafeBase64Encode).mockReturnValue(encodedServerUrl);
            jest.mocked(getCurrentUser).mockResolvedValue(undefined);
            (DatabaseManager.serverDatabases as ServerDatabases) = {};
        });

        it('should call all cleanup functions in correct order for removeServer=true', async () => {
            await terminateSession(mockServerUrl, true);

            // Verify all cleanup functions called
            expect(removeServerCredentials).toHaveBeenCalledWith(mockServerUrl);
            expect(PushNotifications.removeServerNotifications).toHaveBeenCalledWith(mockServerUrl);
            expect(NetworkManager.invalidateClient).toHaveBeenCalledWith(mockServerUrl);
            expect(WebsocketManager.invalidateClient).toHaveBeenCalledWith(mockServerUrl);
            expect(removePushDisabledInServerAcknowledged).toHaveBeenCalledWith(encodedServerUrl);
            expect(DatabaseManager.destroyServerDatabase).toHaveBeenCalledWith(mockServerUrl);
            expect(resetMomentLocale).toHaveBeenCalled();
            expect(clearCookiesForServer).toHaveBeenCalledWith(mockServerUrl);
            expect(deleteFileCache).toHaveBeenCalledWith(mockServerUrl);
            expect(deleteFileCacheByDir).toHaveBeenCalledWith('mmPasteInput');
            expect(deleteFileCacheByDir).toHaveBeenCalledWith('thumbnails');
        });

        it('should call deleteServerDatabase when removeServer=false', async () => {
            await terminateSession(mockServerUrl, false);

            expect(DatabaseManager.deleteServerDatabase).toHaveBeenCalledWith(mockServerUrl);
            expect(DatabaseManager.destroyServerDatabase).not.toHaveBeenCalled();
            expect(removePushDisabledInServerAcknowledged).not.toHaveBeenCalled();
        });

        it('should clear cookies for server', async () => {
            await terminateSession(mockServerUrl, true);

            expect(clearCookiesForServer).toHaveBeenCalledWith(mockServerUrl);
        });

        it('should clear image cache with URL-safe encoded server URL', async () => {
            await terminateSession(mockServerUrl, true);

            expect(urlSafeBase64Encode).toHaveBeenCalledWith(mockServerUrl);
        });

        it('should delete file caches for server and common directories', async () => {
            await terminateSession(mockServerUrl, true);

            expect(deleteFileCache).toHaveBeenCalledWith(mockServerUrl);
            expect(deleteFileCacheByDir).toHaveBeenCalledWith('mmPasteInput');
            expect(deleteFileCacheByDir).toHaveBeenCalledWith('thumbnails');
        });

        it('should reset locale with user locale when active server database exists', async () => {
            const mockUser = {locale: 'es'};
            const mockServerDatabase = {database: 'serverDb'} as unknown as ServerDatabase;

            (DatabaseManager.serverDatabases as ServerDatabases) = {[mockServerUrl]: mockServerDatabase};
            jest.mocked(DatabaseManager.getActiveServerDatabase).mockResolvedValue(mockServerDatabase as unknown as Database);
            jest.mocked(getCurrentUser).mockResolvedValue(mockUser as unknown as UserModel);

            await terminateSession(mockServerUrl, true);

            // Wait for the async resetLocale to complete (not awaited in implementation)
            await new Promise((resolve) => setImmediate(resolve));

            expect(resetMomentLocale).toHaveBeenCalledWith('es');
        });

        it('should reset locale to default when no active server database', async () => {
            (DatabaseManager.serverDatabases as ServerDatabases) = {};

            await terminateSession(mockServerUrl, true);

            // Wait for the async resetLocale to complete (not awaited in implementation)
            await new Promise((resolve) => setImmediate(resolve));

            expect(resetMomentLocale).toHaveBeenCalledWith();
        });
    });
});
