// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    isServerError,
    isErrorWithMessage,
    isErrorWithDetails,
    isErrorWithIntl,
    isErrorWithStatusCode,
    isErrorWithUrl,
    getFullErrorMessage,
    getServerError,
} from './errors';
import {getIntlShape} from './general';

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
        const intl = getIntlShape();
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

    test('getServerError', () => {
        expect(getServerError({message: 'error message'})).toBe(undefined);
        expect(getServerError({details: 'more info', message: 'error message'})).toBe(undefined);
        expect(getServerError({server_error_id: 'server error', message: 'error message'})).toBe('server error');
        expect(getServerError({details: {server_error_id: 'deep error'}, message: 'error message'})).toBe('deep error');
        expect(getServerError({details: {details: {server_error_id: 'deeper error'}}, message: 'error message'})).toBe('deeper error');
        expect(getServerError({details: {details: {details: {details: {server_error_id: 'too deep error'}}}}, message: 'error message'})).toBe(undefined);
        expect(getServerError({server_error_id: 'server error', details: {server_error_id: 'not this'}, message: 'error message'})).toBe('server error');
    });
});
