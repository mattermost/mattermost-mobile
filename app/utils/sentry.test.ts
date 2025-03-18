// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Import necessary dependencies and functions
import Sentry from '@sentry/react-native'; // Importing Sentry as module mock

import DatabaseManager from '@database/manager';

import * as log from './log';
import {addSentryContext} from './sentry';

// Mocks
jest.mock('@sentry/react-native', () => ({
    init: jest.fn(),
    captureException: jest.fn(),
    addBreadcrumb: jest.fn(),
    setContext: jest.fn(),
    ReactNativeTracing: jest.fn(),
    reactNativeNavigationIntegration: jest.fn().mockImplementation(() => ({
        name: 'reactNativeNavigation',
    })),
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

    it('should log an error if an exception occurs', async () => {
        (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockImplementation(() => {
            throw new Error('Database error');
        });

        await addSentryContext('https://example.com');

        expect(log.logError).toHaveBeenCalledWith('addSentryContext for serverUrl https://example.com', expect.any(Error));
        expect(Sentry.setContext).not.toHaveBeenCalled();
    });
});
