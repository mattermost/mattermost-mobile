// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import Exception from 'react-native-exception-handler';

import {dismissAllRoutesAndResetToRootRoute} from '@screens/navigation';
import * as Sentry from '@utils/sentry';

import errorHandling from './error_handling';
import * as Log from './log';

jest.mock('react-native-exception-handler', () => ({
    setJSExceptionHandler: jest.fn((callback: () => void, allowInDevMode: boolean) => {
        if (!allowInDevMode) {
            callback();
        }
    }),
}));

jest.mock('@utils/log', () => ({
    logWarning: jest.fn(() => ''),
}));

jest.mock('@screens/navigation');

describe('JavascriptAndNativeErrorHandler', () => {
    const warning = jest.spyOn(Log, 'logWarning');
    const error = 'some error';

    test('Initialization', () => {
        const setJSExceptionHandler = jest.spyOn(Exception, 'setJSExceptionHandler');
        const initializeSentry = jest.spyOn(Sentry, 'initializeSentry');
        errorHandling.initializeErrorHandling();
        expect(setJSExceptionHandler).toHaveBeenCalledTimes(1);
        expect(initializeSentry).toHaveBeenCalledTimes(1);
        expect(setJSExceptionHandler).toHaveBeenCalledWith(errorHandling.errorHandler, false);
    });

    test('nativeErrorHander', () => {
        const captureException = jest.spyOn(Sentry, 'captureException');
        errorHandling.nativeErrorHandler(error);
        expect(warning).toHaveBeenCalledTimes(1);
        expect(warning).toHaveBeenCalledWith(`Handling native error ${error}`);
        expect(captureException).toHaveBeenCalledTimes(1);
        expect(captureException).toHaveBeenCalledWith(error);
    });

    test('errorHandler', async () => {
        const captureJSException = jest.spyOn(Sentry, 'captureJSException');

        errorHandling.errorHandler(null, false);
        expect(warning).toHaveBeenCalledTimes(0);

        errorHandling.errorHandler(error, true);
        expect(warning).toHaveBeenCalledTimes(1);
        expect(warning).toHaveBeenCalledWith('Handling Javascript error', error, true);
        expect(captureJSException).toHaveBeenCalledTimes(1);
        expect(captureJSException).toHaveBeenCalledWith(error, true);

        const throwError = new Error(error);
        const alert = jest.spyOn(Alert, 'alert');
        errorHandling.errorHandler(throwError, true);
        expect(alert?.mock?.calls?.[0]?.length).toBe(4);
        alert?.mock.calls?.[0]?.[2]?.[0]?.onPress?.();
        expect(dismissAllRoutesAndResetToRootRoute).toHaveBeenCalledTimes(1);
    });
});
