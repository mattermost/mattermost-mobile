// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Import necessary dependencies and functions
import * as Sentry from '@sentry/react-native'; // Importing Sentry as module mock
import {Platform} from 'react-native';

import Config from '@assets/config.json';
import ClientError from '@client/rest/error';
import DatabaseManager from '@database/manager';
import {getConfig} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';

import * as log from './log';
import {initializeSentry, captureException, captureJSException, addSentryContext} from './sentry';

// Mocks
jest.mock('@sentry/react-native', () => ({
    init: jest.fn(),
    captureException: jest.fn(),
    addBreadcrumb: jest.fn(),
    setContext: jest.fn(),
    ReactNativeTracing: jest.fn(),
    ReactNativeNavigationInstrumentation: jest.fn(),
}));

jest.mock('@assets/config.json', () => ({
    SentryEnabled: true,
    SentryDsnAndroid: 'YOUR_ANDROID_DSN_HERE',
    SentryDsnIos: 'YOUR_IOS_DSN_HERE',
    SentryOptions: {
        severityLevelFilter: ['error', 'warning'],
    },
}));

jest.mock('./log', () => ({
    logWarning: jest.fn(),
    logError: jest.fn(),
}));

jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn().mockReturnValue({
        database: {} as any, // Mocking database object
    }),
}));

jest.mock('@queries/servers/system', () => ({
    getConfig: jest.fn().mockResolvedValue({
        BuildDate: '2024-06-24',
        BuildEnterpriseReady: true,
        BuildHash: 'HASH',
        BuildHashEnterprise: 'HASH_ENTERPRISE',
        BuildNumber: '1234',
    }),
}));

jest.mock('@queries/servers/user', () => ({
    getCurrentUser: jest.fn().mockResolvedValue({
        id: 'userId',
        locale: 'en-US',
        roles: ['user'],
    }),
}));

jest.mock('@utils/errors', () => ({
    getFullErrorMessage: jest.fn().mockReturnValue('Full error message'),
}));

describe('initializeSentry function', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear all mock calls after each test
    });

    it('should not initialize Sentry if SentryEnabled is false', () => {
        Config.SentryEnabled = false;

        initializeSentry();

        expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('should log a warning if DSN is missing', () => {
        Config.SentryEnabled = true;
        Config.SentryDsnAndroid = '';
        Config.SentryDsnIos = '';

        initializeSentry();

        expect(log.logWarning).toHaveBeenCalledWith('Sentry is enabled, but not configured on this platform');
    });

    it('should initialize Sentry correctly', () => {
        Config.SentryEnabled = true;
        Config.SentryDsnAndroid = 'YOUR_ANDROID_DSN_HERE';
        Config.SentryDsnIos = 'YOUR_IOS_DSN_HERE';

        initializeSentry();

        expect(Sentry.init).toHaveBeenCalled();
        Platform.OS = 'ios';
        expect(Sentry.init).toHaveBeenCalledWith({
            dsn: 'YOUR_IOS_DSN_HERE',
            sendDefaultPii: false,
            environment: 'beta', // Assuming isBetaApp() returns true in this test
            tracesSampleRate: 1.0,
            sampleRate: 1.0,
            attachStacktrace: true, // Adjust based on your actual logic
            enableCaptureFailedRequests: false,
            integrations: [
                expect.any(Sentry.ReactNativeTracing),
            ],
            beforeSend: expect.any(Function),
        });

        // @ts-expect-error mock not in definition
        const beforeSendFn = Sentry.init.mock.calls[0][0].beforeSend;
        const event = {level: 'error'};
        const result = beforeSendFn(event as any); // Simulate a call to beforeSend function

        expect(result).toEqual(event);
    });
});

describe('captureException function', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear all mock calls after each test
    });

    it('should not capture exception if Sentry is disabled', () => {
        Config.SentryEnabled = false;

        captureException(new Error('Test error'));

        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should log a warning if error is missing', () => {
        Config.SentryEnabled = true;

        captureException(undefined);

        expect(log.logWarning).toHaveBeenCalledWith('captureException called with missing arguments', undefined);
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should capture exception correctly', () => {
        captureException(new Error('Test error'));

        expect(Sentry.captureException).toHaveBeenCalled();
        expect(Sentry.captureException).toHaveBeenCalledWith(new Error('Test error'));
    });
});

describe('captureJSException function', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear all mock calls after each test
    });

    it('should not capture exception if Sentry is disabled', () => {
        Config.SentryEnabled = false;

        captureJSException(new Error('Test error'), true);

        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should log a warning if error is missing', () => {
        Config.SentryEnabled = true;

        captureJSException(undefined, true);

        expect(log.logWarning).toHaveBeenCalledWith('captureJSException called with missing arguments', undefined);
        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should capture ClientError as breadcrumb', () => {
        const errorData: ClientErrorProps = {
            url: 'https://example.com',
            status_code: 400,
            message: 'some error from server',
            server_error_id: 'server_error_id',
        };
        const clientError = new ClientError('Client error', errorData);

        captureJSException(clientError, true);

        expect(Sentry.addBreadcrumb).toHaveBeenCalled();
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
            category: 'uncaught-app-error',
            data: {
                isFatal: 'true',
                server_error_id: 'server_error_id',
                status_code: 400,
            },
            level: 'warning',
            message: 'Full error message',
        });
    });

    it('should capture other exceptions', () => {
        const error = new Error('Test error');

        captureJSException(error, true);

        expect(Sentry.captureException).toHaveBeenCalled();
        expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
});

describe('addSentryContext function', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear all mock calls after each test
    });

    it('should not add context if Sentry is disabled', async () => {
        Config.SentryEnabled = false;

        await addSentryContext('https://example.com');

        expect(Sentry.setContext).not.toHaveBeenCalled();
    });

    it('should add user, build, and server context', async () => {
        Config.SentryEnabled = true;

        await addSentryContext('https://example.com');

        expect(DatabaseManager.getServerDatabaseAndOperator).toHaveBeenCalledWith('https://example.com');
        expect(getCurrentUser).toHaveBeenCalled();
        expect(getConfig).toHaveBeenCalled();
        expect(Sentry.setContext).toHaveBeenCalledWith('User-Information', {
            userID: 'userId',
            email: '',
            username: '',
            locale: 'en-US',
            roles: ['user'],
        });
        expect(Sentry.setContext).toHaveBeenCalledWith('App-Build Information', {
            serverBuildHash: 'HASH',
            serverBuildNumber: '1234',
        });
        expect(Sentry.setContext).toHaveBeenCalledWith('Server-Information', {
            config: {
                BuildDate: '2024-06-24',
                BuildEnterpriseReady: true,
                BuildHash: 'HASH',
                BuildHashEnterprise: 'HASH_ENTERPRISE',
                BuildNumber: '1234',
            },
            currentChannel: {},
            currentTeam: {},
        });
    });

    it('should log an error if an exception occurs', async () => {
        (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockImplementation(() => {
            throw new Error('Database error');
        });

        await addSentryContext('https://example.com');

        expect(log.logError).toHaveBeenCalledWith('addSentryContext for serverUrl https://example.com', expect.any(Error));
        expect(Sentry.setContext).not.toHaveBeenCalled();
    });
});
