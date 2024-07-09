// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';

import {logError, logWarning, logInfo, logDebug} from './log';

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
    addBreadcrumb: jest.fn(),
}));

// Mock console methods
const originalConsole = global.console;

// @ts-expect-error global not in TS def
global.console = {
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
};

describe('Logging functions', () => {
    const Sentry = require('@sentry/react-native');
    const SentryLevels = keyMirror({debug: null, info: null, warning: null, error: null});

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        global.console = originalConsole;
    });

    test('logError logs error and adds breadcrumb', () => {
        const args = ['Error message'];
        logError(...args);
        expect(console.error).toHaveBeenCalledWith(...args);
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
            level: SentryLevels.error,
            message: args.join(','),
            type: 'console-log',
        });
    });

    test('logWarning logs warning and adds breadcrumb', () => {
        const args = ['Warning message'];
        logWarning(...args);
        expect(console.warn).toHaveBeenCalledWith(...args);
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
            level: SentryLevels.warning,
            message: args.join(','),
            type: 'console-log',
        });
    });

    test('logInfo logs info and adds breadcrumb', () => {
        const args = ['Info message'];
        logInfo(...args);
        expect(console.log).toHaveBeenCalledWith(...args);
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
            level: SentryLevels.info,
            message: args.join(','),
            type: 'console-log',
        });
    });

    test('logDebug logs debug and adds breadcrumb', () => {
        const args = ['Debug message'];
        logDebug(...args);
        expect(console.debug).toHaveBeenCalledWith(...args);
        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
            level: SentryLevels.debug,
            message: args.join(','),
            type: 'console-log',
        });
    });
});
