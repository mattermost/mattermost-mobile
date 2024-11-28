// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {Platform} from 'react-native';

import {GLOBAL_IDENTIFIERS, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {
    addPushProxyVerificationStateFromLogin,
    forceLogoutIfNecessary,
    fetchSessions,
    login,
    logout,
    cancelSessionNotification,
    scheduleSessionNotification,
    sendPasswordResetEmail,
    ssoLogin,
    findSession,
} from './session';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {LoginArgs} from '@typings/database/database';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const user1 = {id: 'userid1', username: 'user1', email: 'user1@mattermost.com', roles: ''} as UserProfile;

const session1 = {id: 'sessionid1', user_id: user1.id, device_id: 'deviceid', props: {csrf: 'csrfid'}} as Session;

const throwFunc = () => {
    throw Error('error');
};

const mockClient = {
    login: jest.fn(() => user1),
    setCSRFToken: jest.fn(),
    setBearerToken: jest.fn(),
    getClientConfigOld: jest.fn(() => ({})),
    getClientLicenseOld: jest.fn(() => ({})),
    getSessions: jest.fn(() => [session1]),
    sendPasswordResetEmail: jest.fn(() => ({status: 200})),
    getMe: jest.fn(() => user1),
};

let mockGetPushProxyVerificationState: jest.Mock;
jest.mock('@store/ephemeral_store', () => {
    const original = jest.requireActual('@store/ephemeral_store');
    mockGetPushProxyVerificationState = jest.fn(() => 'verified');
    return {
        ...original,
        getPushProxyVerificationState: mockGetPushProxyVerificationState,
    };
});

let mockFetch: jest.Mock;
jest.mock('@react-native-community/netinfo', () => {
    const original = jest.requireActual('@react-native-community/netinfo');
    mockFetch = jest.fn(() => ({isInternetReachable: true}));
    return {
        ...original,
        fetch: mockFetch,
    };
});

let mockCancelLocalNotification: jest.Mock;
jest.mock('react-native-notifications', () => {
    const original = jest.requireActual('react-native-notifications');
    mockCancelLocalNotification = jest.fn();
    return {
        ...original,
        Notifications: {
            ...original.Notifications,
            cancelLocalNotification: mockCancelLocalNotification,
        },
    };
});

let mockGetCSRFFromCookie: jest.Mock;
jest.mock('@utils/security', () => {
    const original = jest.requireActual('@utils/security');
    mockGetCSRFFromCookie = jest.fn(() => 'csrfid');
    return {
        ...original,
        getCSRFFromCookie: mockGetCSRFFromCookie,
    };
});

beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('sessions', () => {
    it('addPushProxyVerificationStateFromLogin - handle not found database', async () => {
        const result = await addPushProxyVerificationStateFromLogin('foo');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('addPushProxyVerificationStateFromLogin - no verification', async () => {
        mockGetPushProxyVerificationState.mockImplementationOnce(() => '');
        const result = await addPushProxyVerificationStateFromLogin(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('addPushProxyVerificationStateFromLogin - base case', async () => {
        const result = await addPushProxyVerificationStateFromLogin(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('forceLogoutIfNecessary - handle not found database', async () => {
        const result = await forceLogoutIfNecessary('foo', {});
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
        expect(result.logout).toBe(false);
    });

    it('forceLogoutIfNecessary - logout expected from 401', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await forceLogoutIfNecessary(serverUrl, {status_code: 401, url: '/api/v4/users/me'});
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(result.logout).toBe(true);
    });

    it('forceLogoutIfNecessary - logout not expected', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await forceLogoutIfNecessary(serverUrl, {status_code: 500, url: '/api/v4/users/me'});
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        expect(result.logout).toBe(false);
    });

    it('fetchSessions - handle error', async () => {
        mockClient.getSessions.mockImplementationOnce(jest.fn(throwFunc));
        const result = await fetchSessions('foo', '');
        expect(result).toBeUndefined();
    });

    it('fetchSessions - handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await fetchSessions(serverUrl, user1.id);
        expect(result).toBeUndefined();
    });

    it('fetchSessions - base case', async () => {
        const result = await fetchSessions(serverUrl, user1.id);
        expect(result).toBeDefined();
        expect(result?.length).toBe(1);
    });

    it('login - base case', async () => {
        const result = await login(serverUrl, {config: {DiagnosticId: 'diagnosticid'}} as LoginArgs);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.failed).toBe(false);
    });

    it('login - handle throw on login request', async () => {
        mockClient.login.mockImplementationOnce(jest.fn(throwFunc));

        const result = await login(serverUrl, {config: {DiagnosticId: 'diagnosticid'}} as LoginArgs);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.failed).toBe(true);
    });

    it('login - handle throw after login request', async () => {
        jest.spyOn(DatabaseManager, 'setActiveServerDatabase').mockImplementationOnce(throwFunc);

        const result = await login(serverUrl, {config: {DiagnosticId: 'diagnosticid'}} as LoginArgs);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.failed).toBe(false);
    });

    it('logout - base case', async () => {
        const result = await logout(serverUrl, true, true, true);
        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
    });

    it('cancelSessionNotification - handle not found database', async () => {
        const result = await cancelSessionNotification('foo');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('cancelSessionNotification - base case', async () => {
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.SESSION_EXPIRATION,
                value: {
                    id: 'sessionid1',
                    notificationId: 'notificationid',
                    expiresAt: 123,
                },
            }],
            prepareRecordsOnly: false,
        });

        const result = await cancelSessionNotification(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('cancelSessionNotification - no expired session', async () => {
        const result = await cancelSessionNotification(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('scheduleSessionNotification - handle not found database', async () => {
        const result = await scheduleSessionNotification('foo');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('scheduleSessionNotification - base case', async () => {
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.SESSION_EXPIRATION,
                value: {
                    id: 'sessionid1',
                    notificationId: 'notificationid',
                    expiresAt: 123,
                },
            }],
            prepareRecordsOnly: false,
        });

        const result = await scheduleSessionNotification(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('scheduleSessionNotification - no session', async () => {
        mockClient.getSessions.mockImplementationOnce(() => []);
        const result = await scheduleSessionNotification(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('scheduleSessionNotification - null sessions', async () => {
        mockClient.getSessions.mockImplementationOnce(() => null as any);
        const result = await scheduleSessionNotification(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('sendPasswordResetEmail - handle error', async () => {
        mockClient.sendPasswordResetEmail.mockImplementationOnce(jest.fn(throwFunc));
        const result = await sendPasswordResetEmail('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('sendPasswordResetEmail - base case', async () => {
        const result = await sendPasswordResetEmail(serverUrl, user1.email);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(200);
    });

    it('ssoLogin - handle error', async () => {
        mockClient.getMe.mockImplementationOnce(jest.fn(throwFunc));
        const result = await ssoLogin('foo', '', '', '', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.failed).toBe(true);
    });

    it('ssoLogin - base case', async () => {
        const result = await ssoLogin(serverUrl, 'servername', 'diagnosticid', 'authtoken', 'csrftoken');
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.failed).toBe(false);
    });

    it('ssoLogin - handle throw after login request', async () => {
        jest.spyOn(DatabaseManager, 'setActiveServerDatabase').mockImplementationOnce(throwFunc);

        const result = await ssoLogin(serverUrl, 'servername', 'diagnosticid', 'authtoken', 'csrftoken');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.failed).toBe(false);
    });

    it('findSession - handle not found database', async () => {
        const result = await findSession('foo', []);
        expect(result).toBeUndefined();
    });

    it('findSession - by id', async () => {
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.SESSION_EXPIRATION,
                value: {
                    id: 'sessionid1',
                    notificationId: 'notificationid',
                    expiresAt: 123,
                },
            }],
            prepareRecordsOnly: false,
        });

        const session = await findSession(serverUrl, [session1]);
        expect(session).toBeDefined();
    });

    it('findSession - by device', async () => {
        await DatabaseManager.appDatabase?.operator.handleGlobal({
            globals: [{id: GLOBAL_IDENTIFIERS.DEVICE_TOKEN, value: 'deviceid'}],
            prepareRecordsOnly: false,
        });

        const session = await findSession(serverUrl, [session1]);
        expect(session).toBeDefined();
    });

    it('findSession - non-match device token', async () => {
        await DatabaseManager.appDatabase?.operator.handleGlobal({
            globals: [{id: GLOBAL_IDENTIFIERS.DEVICE_TOKEN, value: 'diffdeviceid'}],
            prepareRecordsOnly: false,
        });

        const session = await findSession(serverUrl, [session1]);
        expect(session).toBeDefined();
    });

    it('findSession - by csrf', async () => {
        const session = await findSession(serverUrl, [session1]);
        expect(session).toBeDefined();
    });

    it('findSession - no csrf token', async () => {
        mockGetCSRFFromCookie.mockResolvedValueOnce('');
        const session = await findSession(serverUrl, [session1]);
        expect(session).toBeUndefined();
    });

    it('findSession - by os', async () => {
        const session = await findSession(serverUrl, [{...session1, props: {os: Platform.OS, csrf: 'diffcsrfid'}}]);
        expect(session).toBeDefined();
    });

    it('findSession - handle error', async () => {
        jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockImplementationOnce(throwFunc);
        const result = await findSession(serverUrl, []);
        expect(result).toBeUndefined();
    });
});
