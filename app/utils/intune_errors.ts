// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessage, type IntlShape} from 'react-intl';

import {isErrorWithMessage} from '@utils/errors';

// MSAL Error Domain and Codes
const MSAL_ERROR_DOMAIN = 'MSALErrorDomain';
const MSAL_ERROR_CODE_USER_CANCELED = -50005;

// i18n message definitions
const intuneErrorMessages = {
    loginCanceled: defineMessage({
        id: 'mobile.intune.login.canceled',
        defaultMessage: 'Login was canceled. Please try again',
    }),
    authFailed: defineMessage({
        id: 'mobile.intune.login.failed',
        defaultMessage: 'Authentication failed. Please try again',
    }),
};

/**
 * Check if error is an NSError with domain and code
 */
function isNSError(error: unknown): error is {domain: string; code: number; message?: string} {
    return (
        typeof error === 'object' &&
        error !== null &&
        'domain' in error &&
        'code' in error &&
        typeof (error as {domain: unknown}).domain === 'string' &&
        typeof (error as {code: unknown}).code === 'number'
    );
}

/**
 * Check if error is MSAL user cancellation
 */
export function isMSALUserCancellation(error: unknown): boolean {
    return isNSError(error) &&
           error.domain === MSAL_ERROR_DOMAIN &&
           error.code === MSAL_ERROR_CODE_USER_CANCELED;
}

/**
 * Map Intune/MSAL error to user-friendly i18n message
 * Handles:
 * - Server errors (400, 409, 428)
 * - MSAL cancellation errors (-50005)
 * - Generic MSAL errors
 *
 * @param error - The error object from nativeEntraLogin
 * @param intl - IntlShape for formatting messages
 * @returns User-friendly error message
 */
export function getIntuneErrorMessage(error: unknown, intl: IntlShape): string {
    // Handle MSAL user cancellation (domain: MSALErrorDomain, code: -50005)
    if (isMSALUserCancellation(error)) {
        return intl.formatMessage(intuneErrorMessages.loginCanceled);
    }

    // Handle generic MSAL errors (other MSALErrorDomain codes)
    if (isNSError(error) && error.domain === MSAL_ERROR_DOMAIN) {
        return intl.formatMessage(intuneErrorMessages.authFailed);
    }

    // Handle any other error with message
    if (isErrorWithMessage(error)) {
        // Check for raw MSAL error strings in message
        if (error.message.includes(MSAL_ERROR_DOMAIN) || error.message.includes('code:')) {
            return intl.formatMessage(intuneErrorMessages.authFailed);
        }
        return error.message;
    }

    // Fallback for unknown errors
    return intl.formatMessage(intuneErrorMessages.authFailed);
}
