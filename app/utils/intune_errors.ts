// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessage, type IntlShape, type MessageDescriptor} from 'react-intl';

import {isErrorWithMessage, isServerError, isErrorWithStatusCode} from '@utils/errors';

// MSAL Error Domain and Codes
const MSAL_ERROR_DOMAIN = 'MSALErrorDomain';
const MSAL_ERROR_CODE_USER_CANCELED = -50005;

// Server error IDs from Intune Implementation Plan
const SERVER_ERROR_LDAP_USER_MISSING = 'ent.intune.login.ldap_user_missing.app_error';
const SERVER_ERROR_ACCOUNT_CREATION_BLOCKED = 'ent.intune.login.account_creation_blocked.app_error';

// i18n message definitions
const intuneErrorMessages = {
    ldapUserMissing: defineMessage({
        id: 'mobile.intune.login.ldap_user_missing',
        defaultMessage: 'We couldn\'t sign you in. Please contact your system administrator for assistance.',
    }),
    accountCreationBlocked: defineMessage({
        id: 'mobile.intune.login.account_creation_blocked',
        defaultMessage: 'Your account isn\'t fully set up yet. Please sign in to Mattermost via the web or desktop app first.',
    }),
    userDeactivated: defineMessage({
        id: 'mobile.intune.login.user_locked',
        defaultMessage: 'Your account has been deactivated. Please contact your system administrator.',
    }),
    loginCanceled: defineMessage({
        id: 'mobile.intune.login.canceled',
        defaultMessage: 'Login was canceled. Please try again.',
    }),
    authFailed: defineMessage({
        id: 'mobile.intune.login.failed',
        defaultMessage: 'Authentication failed. Please try again.',
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

    // Handle server errors with status codes
    if (isErrorWithStatusCode(error)) {
        // HTTP 409: User locked/disabled
        if (error.status_code === 409) {
            return intl.formatMessage(intuneErrorMessages.userDeactivated);
        }

        // HTTP 400: LDAP user missing
        if (error.status_code === 400 && isServerError(error) && error.server_error_id === SERVER_ERROR_LDAP_USER_MISSING) {
            return intl.formatMessage(intuneErrorMessages.ldapUserMissing);
        }

        // HTTP 428: Account creation blocked by Custom Profile Attributes
        if (error.status_code === 428 && isServerError(error) && error.server_error_id === SERVER_ERROR_ACCOUNT_CREATION_BLOCKED) {
            return intl.formatMessage(intuneErrorMessages.accountCreationBlocked);
        }
    }

    // Handle generic MSAL errors (other MSALErrorDomain codes)
    if (isNSError(error) && error.domain === MSAL_ERROR_DOMAIN) {
        return intl.formatMessage(intuneErrorMessages.authFailed);
    }

    // Handle any other error with message
    if (isErrorWithMessage(error)) {
        // Check for raw MSAL error strings in message
        if (error.message.includes('MSALErrorDomain') || error.message.includes('code:')) {
            return intl.formatMessage(intuneErrorMessages.authFailed);
        }
        return error.message;
    }

    // Fallback for unknown errors
    return intl.formatMessage(intuneErrorMessages.authFailed);
}

/**
 * Export message descriptors for direct use without intl
 */
export const IntuneErrorMessages = intuneErrorMessages;

/**
 * Get raw message descriptor for specific error type
 * Useful for scenarios where intl is not yet available
 */
export function getIntuneErrorMessageDescriptor(error: unknown): MessageDescriptor {
    if (isMSALUserCancellation(error)) {
        return intuneErrorMessages.loginCanceled;
    }

    if (isErrorWithStatusCode(error)) {
        if (error.status_code === 409) {
            return intuneErrorMessages.userDeactivated;
        }

        if (error.status_code === 400 && isServerError(error) && error.server_error_id === SERVER_ERROR_LDAP_USER_MISSING) {
            return intuneErrorMessages.ldapUserMissing;
        }

        if (error.status_code === 428 && isServerError(error) && error.server_error_id === SERVER_ERROR_ACCOUNT_CREATION_BLOCKED) {
            return intuneErrorMessages.accountCreationBlocked;
        }
    }

    if (isNSError(error) && error.domain === MSAL_ERROR_DOMAIN) {
        return intuneErrorMessages.authFailed;
    }

    if (isErrorWithMessage(error) && (error.message.includes('MSALErrorDomain') || error.message.includes('code:'))) {
        return intuneErrorMessages.authFailed;
    }

    return intuneErrorMessages.authFailed;
}
