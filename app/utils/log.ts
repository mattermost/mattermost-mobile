// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';

const SentryLevels = keyMirror({debug: null, info: null, warning: null, error: null});

export function logError(...args: any[]) {
    // eslint-disable-next-line no-console
    console.error(...args);
    addBreadcrumb(SentryLevels.error, ...args);
}

export function logWarning(...args: any[]) {
    // eslint-disable-next-line no-console
    console.warn(...args);
    addBreadcrumb(SentryLevels.warning, ...args);
}

export function logInfo(...args: any[]) {
    // eslint-disable-next-line no-console
    console.log(...args);
    addBreadcrumb(SentryLevels.info, ...args);
}

export function logDebug(...args: any[]) {
    // eslint-disable-next-line no-console
    console.debug(...args);
    addBreadcrumb(SentryLevels.debug, ...args);
}

const addBreadcrumb = (logLevel: keyof typeof SentryLevels, ...args: any[]) => {
    const Sentry = require('@sentry/react-native');
    Sentry.addBreadcrumb({
        level: logLevel,
        message: args.join(','),
        type: 'console-log',
    });
};
