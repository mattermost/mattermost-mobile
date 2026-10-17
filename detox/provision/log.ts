// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */

import {LOG_PREFIX} from './constants';

// Info and debug go to stderr, like warn and error, so stdout carries only machine output (--verify JSON).
export function logInfo(message: string): void {
    console.error(`${LOG_PREFIX} ${message}`);
}

export function logWarn(message: string): void {
    console.warn(`${LOG_PREFIX} ${message}`);
}

export function logError(message: string): void {
    console.error(`${LOG_PREFIX} ${message}`);
}

/** Debug-level provision log for non-PII Detox/Maestro diagnostics. */
export function logDebug(message: string): void {
    console.error(`${LOG_PREFIX} ${message}`);
}
