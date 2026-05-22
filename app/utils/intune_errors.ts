// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessage, type IntlShape} from 'react-intl';

import {isErrorWithMessage} from '@utils/errors';

// MSAL Error Domain and Codes
const MSAL_ERROR_DOMAIN = 'MSALErrorDomain';
const MSAL_ERROR_CODE_USER_CANCELED = -50005;

// Intune Error Domain and Codes
const INTUNE_ERROR_DOMAIN = 'Intune';
const INTUNE_ERROR_CODE_PROTECTION_POLICY_REQUIRED = 1004;

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
    complianceNotCompliant: defineMessage({
        id: 'mobile.intune.compliance.not_compliant',
        defaultMessage: "Your device doesn't meet the required app protection policy.",
    }),
    complianceNetworkFailure: defineMessage({
        id: 'mobile.intune.compliance.network_failure',
        defaultMessage: 'Could not reach the Intune service. Check your network and try again.',
    }),
    complianceServiceFailure: defineMessage({
        id: 'mobile.intune.compliance.service_failure',
        defaultMessage: 'Intune service error. Please try again later.',
    }),
    complianceUserCancelled: defineMessage({
        id: 'mobile.intune.compliance.user_cancelled',
        defaultMessage: 'Login was canceled. Please try again.',
    }),
};

// RN serializes NSError.domain onto the JS error object, but NSError.code may be
// replaced by the string reject-code passed to reject(). We accept both for robustness
// and also extract the numeric code from the message string when needed.
type NSError = {domain: string; code: number | string; message?: string; userInfo?: Record<string, string>};

function isNSError(error: unknown): error is NSError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'domain' in error &&
        'code' in error &&
        typeof (error as {domain: unknown}).domain === 'string'
    );
}

// Extracts the numeric NSError code from the sanitized message: "Error in <domain> (code: <number>)"
function extractNativeCode(error: NSError): number | null {
    if (typeof error.code === 'number') {
        return error.code;
    }

    if (/^-?\d+$/.test(error.code)) {
        return parseInt(error.code, 10);
    }

    const match = error.message?.match(/\(code: (-?\d+)\)/);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Check if error is MSAL user cancellation
 */
export function isMSALUserCancellation(error: unknown): boolean {
    if (!isNSError(error) || error.domain !== MSAL_ERROR_DOMAIN) {
        return false;
    }
    return extractNativeCode(error) === MSAL_ERROR_CODE_USER_CANCELED;
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

    // Handle compliance failure (domain: Intune, code: 1004)
    // SDK provides localized errorMessage in userInfo — use it directly when available
    if (isNSError(error) && error.domain === INTUNE_ERROR_DOMAIN &&
        extractNativeCode(error) === INTUNE_ERROR_CODE_PROTECTION_POLICY_REQUIRED) {
        const sdkMessage = error.userInfo?.errorMessage;
        if (sdkMessage) {
            return sdkMessage;
        }
        switch (error.userInfo?.reason) {
            case 'not_compliant':
                return intl.formatMessage(intuneErrorMessages.complianceNotCompliant);
            case 'network_failure':
                return intl.formatMessage(intuneErrorMessages.complianceNetworkFailure);
            case 'service_failure':
                return intl.formatMessage(intuneErrorMessages.complianceServiceFailure);
            default:
                return intl.formatMessage(intuneErrorMessages.complianceUserCancelled);
        }
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
