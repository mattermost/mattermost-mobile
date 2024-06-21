// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';

import {DEFAULT_LOCALE, getTranslations} from '@i18n';

import {
    isServerError,
    isErrorWithMessage,
    isErrorWithDetails,
    isErrorWithIntl,
    isErrorWithStatusCode,
    isErrorWithUrl,
    getFullErrorMessage,
} from './errors';

describe('Errors', () => {
    test('isServerError', () => {
        expect(isServerError('error')).toBe(false);
        expect(isServerError({message: 'some error'})).toBe(false);
        expect(isServerError({server_error_id: 'error_id'})).toBe(true);
    });

    test('isErrorWithMessage', () => {
        expect(isErrorWithMessage('error')).toBe(false);
        expect(isErrorWithMessage({message: 'some error'})).toBe(true);
        expect(isErrorWithMessage({server_error_id: 'error_id'})).toBe(false);
    });

    test('isErrorWithDetails', () => {
        expect(isErrorWithDetails('error')).toBe(false);
        expect(isErrorWithDetails({message: 'some error'})).toBe(false);
        expect(isErrorWithDetails({details: 'more info'})).toBe(true);
    });

    test('isErrorWithIntl', () => {
        expect(isErrorWithIntl('error')).toBe(false);
        expect(isErrorWithIntl({message: 'some error'})).toBe(false);
        expect(isErrorWithIntl({intl: {id: 'some_error_id', defaultMessage: 'message text'}})).toBe(true);
    });

    test('isErrorWithStatusCode', () => {
        expect(isErrorWithStatusCode('error')).toBe(false);
        expect(isErrorWithStatusCode({message: 'some error'})).toBe(false);
        expect(isErrorWithStatusCode({status_code: 95})).toBe(true);
    });

    test('isErrorWithUrl', () => {
        expect(isErrorWithUrl('error')).toBe(false);
        expect(isErrorWithUrl({message: 'some error'})).toBe(false);
        expect(isErrorWithUrl({url: 'http://localhost:8065'})).toBe(true);
    });

    test('getFullErrorMessage', () => {
        const locale = DEFAULT_LOCALE;
        const intl = createIntl({locale, messages: getTranslations(locale)});
        expect(getFullErrorMessage('error', intl)).toBe('error');
        expect(getFullErrorMessage({details: 'more info', message: 'error message'}, intl)).toBe('error message; more info');
        expect(getFullErrorMessage({details: 'more info', message: 'error message'}, intl, 3)).toBe('error message; error message');
        expect(getFullErrorMessage({
            details: 'more info',
            message: 'error message',
            intl: {id: 'some_error_id', defaultMessage: 'message text'},
        }, intl)).toBe('message text; more info');
        expect(getFullErrorMessage({
            details: 'more info',
            message: 'error message',
            intl: {id: 'some_error_id', defaultMessage: 'default message text'},
        })).toBe('default message text; more info');

        expect(getFullErrorMessage({
            details: 'more info',
        })).toBe('Unknown error; more info');
    });
});
