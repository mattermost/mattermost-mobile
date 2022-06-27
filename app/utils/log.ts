// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function logError(...args: any[]) {
    // eslint-disable-next-line no-console
    console.error('Error:', ...args);
}

export function logWarning(...args: any[]) {
    // eslint-disable-next-line no-console
    console.warn('Warning:', ...args);
}

export function logInfo(...args: any[]) {
    // eslint-disable-next-line no-console
    console.log('Info:', ...args);
}

export function logDebug(...args: any[]) {
    // eslint-disable-next-line no-console
    console.debug('Debug:', ...args);
}
