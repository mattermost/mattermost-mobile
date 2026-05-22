// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';

import {DEFAULT_LOCALE, getTranslations} from '@i18n';

import {getIntuneErrorMessage, isMSALUserCancellation} from './intune_errors';

const intl = createIntl({locale: DEFAULT_LOCALE, defaultLocale: DEFAULT_LOCALE, messages: getTranslations(DEFAULT_LOCALE)});

describe('isMSALUserCancellation', () => {
    it('should return true for MSALErrorDomain error with numeric code -50005', () => {
        const error = {domain: 'MSALErrorDomain', code: -50005};
        expect(isMSALUserCancellation(error)).toBe(true);
    });

    it('should return true when code is the string "-50005"', () => {
        const error = {domain: 'MSALErrorDomain', code: '-50005'};
        expect(isMSALUserCancellation(error)).toBe(true);
    });

    it('should return true when numeric code is encoded in the message string', () => {
        // RN bridge serializes NSError.code as a string reject-code; numeric code is in message
        const error = {domain: 'MSALErrorDomain', code: 'intune_login_failed', message: 'Error in MSALErrorDomain (code: -50005)'};
        expect(isMSALUserCancellation(error)).toBe(true);
    });

    it('should return false for a different MSAL error code', () => {
        const error = {domain: 'MSALErrorDomain', code: -50004};
        expect(isMSALUserCancellation(error)).toBe(false);
    });

    it('should return false for a different error domain', () => {
        const error = {domain: 'Intune', code: -50005};
        expect(isMSALUserCancellation(error)).toBe(false);
    });

    it('should return false for a plain Error object (no domain property)', () => {
        expect(isMSALUserCancellation(new Error('canceled'))).toBe(false);
    });

    it('should return false for null', () => {
        expect(isMSALUserCancellation(null)).toBe(false);
    });

    it('should return false for a string', () => {
        expect(isMSALUserCancellation('canceled')).toBe(false);
    });

    it('should return false when code is a non-numeric string and message has no code pattern', () => {
        const error = {domain: 'MSALErrorDomain', code: 'intune_login_failed'};
        expect(isMSALUserCancellation(error)).toBe(false);
    });
});

describe('getIntuneErrorMessage', () => {
    describe('MSAL user cancellation (code -50005)', () => {
        it('should return login canceled message for NSError with numeric code -50005', () => {
            const error = {domain: 'MSALErrorDomain', code: -50005};
            expect(getIntuneErrorMessage(error, intl)).toBe('Login was canceled. Please try again');
        });

        it('should return login canceled message when -50005 is encoded in message', () => {
            const error = {domain: 'MSALErrorDomain', code: 'intune_login_failed', message: 'Error in MSALErrorDomain (code: -50005)'};
            expect(getIntuneErrorMessage(error, intl)).toBe('Login was canceled. Please try again');
        });

        it('should return authFailed when -50005 appears in a plain message string', () => {
            // Plain Error (no domain) with MSAL cancellation encoded in message
            const error = {message: 'Error in MSALErrorDomain (code: -50005)'};
            expect(getIntuneErrorMessage(error, intl)).toBe('Authentication failed. Please try again');
        });
    });

    describe('Intune compliance failure (domain Intune, code 1004)', () => {
        it('should return SDK-provided errorMessage from userInfo when present', () => {
            const error = {
                domain: 'Intune',
                code: 1004,
                userInfo: {errorMessage: 'Device is not compliant per Intune policy.', reason: 'not_compliant'},
            };
            expect(getIntuneErrorMessage(error, intl)).toBe('Device is not compliant per Intune policy.');
        });

        it('should return the compliance message when code is the string "1004"', () => {
            const error = {domain: 'Intune', code: '1004', userInfo: {reason: 'network_failure'}};
            expect(getIntuneErrorMessage(error, intl)).toBe('Could not reach the Intune service. Check your network and try again.');
        });

        it('should return not_compliant i18n message when reason is not_compliant and no SDK message', () => {
            const error = {domain: 'Intune', code: 1004, userInfo: {reason: 'not_compliant'}};
            expect(getIntuneErrorMessage(error, intl)).toBe("Your device doesn't meet the required app protection policy.");
        });

        it('should return network_failure i18n message when reason is network_failure', () => {
            const error = {domain: 'Intune', code: 1004, userInfo: {reason: 'network_failure'}};
            expect(getIntuneErrorMessage(error, intl)).toBe('Could not reach the Intune service. Check your network and try again.');
        });

        it('should return service_failure i18n message when reason is service_failure', () => {
            const error = {domain: 'Intune', code: 1004, userInfo: {reason: 'service_failure'}};
            expect(getIntuneErrorMessage(error, intl)).toBe('Intune service error. Please try again later.');
        });

        it('should return user_cancelled i18n message when reason is user_cancelled', () => {
            const error = {domain: 'Intune', code: 1004, userInfo: {reason: 'user_cancelled'}};
            expect(getIntuneErrorMessage(error, intl)).toBe('Login was canceled. Please try again.');
        });

        it('should return user_cancelled i18n message when no userInfo', () => {
            const error = {domain: 'Intune', code: 1004};
            expect(getIntuneErrorMessage(error, intl)).toBe('Login was canceled. Please try again.');
        });

        it('should handle code 1004 encoded in message string (RN bridge serialization)', () => {
            const error = {domain: 'Intune', code: 'intune_login_failed', message: 'Error in Intune (code: 1004)'};
            expect(getIntuneErrorMessage(error, intl)).toBe('Login was canceled. Please try again.');
        });
    });

    describe('generic MSAL errors (MSALErrorDomain, code other than -50005)', () => {
        it('should return authFailed for a non-cancellation MSAL error with numeric code', () => {
            const error = {domain: 'MSALErrorDomain', code: -50004};
            expect(getIntuneErrorMessage(error, intl)).toBe('Authentication failed. Please try again');
        });

        it('should return authFailed for a MSAL error with string code and no specific message', () => {
            const error = {domain: 'MSALErrorDomain', code: 'intune_login_failed', message: 'Error in MSALErrorDomain (code: -50001)'};
            expect(getIntuneErrorMessage(error, intl)).toBe('Authentication failed. Please try again');
        });
    });

    describe('plain error messages (isErrorWithMessage path)', () => {
        it('should return authFailed when message contains MSALErrorDomain', () => {
            const error = new Error('Error in MSALErrorDomain (code: -99999)');
            expect(getIntuneErrorMessage(error, intl)).toBe('Authentication failed. Please try again');
        });

        it('should return authFailed when message contains "code:"', () => {
            const error = new Error('Some error (code: 500)');
            expect(getIntuneErrorMessage(error, intl)).toBe('Authentication failed. Please try again');
        });

        it('should return the raw message when it does not match any known pattern', () => {
            const error = new Error('Connection refused');
            expect(getIntuneErrorMessage(error, intl)).toBe('Connection refused');
        });
    });

    describe('unknown error fallback', () => {
        it('should return authFailed for null', () => {
            expect(getIntuneErrorMessage(null, intl)).toBe('Authentication failed. Please try again');
        });

        it('should return authFailed for a number', () => {
            expect(getIntuneErrorMessage(42, intl)).toBe('Authentication failed. Please try again');
        });

        it('should return authFailed for an empty object without domain or message', () => {
            expect(getIntuneErrorMessage({}, intl)).toBe('Authentication failed. Please try again');
        });
    });
});
