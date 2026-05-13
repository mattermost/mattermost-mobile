// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as ExpoModulesCore from 'expo-modules-core';
import {Alert} from 'react-native';

import * as Sentry from '@utils/sentry';

import errorHandling from './error_handling';
import * as Log from './log';

jest.mock('expo-modules-core', () => ({
    reloadAppAsync: jest.fn(),
}));

jest.mock('@utils/general', () => ({
    isBetaApp: false,
}));

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
    logWarning: jest.fn(),
    logDebug: jest.fn(),
    logInfo: jest.fn(),
}));

describe('JavascriptAndNativeErrorHandler', () => {
    const logError = jest.spyOn(Log, 'logError');
    const error = 'some error';

    beforeEach(() => {
        jest.clearAllMocks();
        (global as any).ErrorUtils = {
            setGlobalHandler: jest.fn(),
            getGlobalHandler: jest.fn(),
        };
    });

    it('should initialize sentry and register the global error handler', () => {
        const initializeSentry = jest.spyOn(Sentry, 'initializeSentry');
        errorHandling.initializeErrorHandling();
        expect(initializeSentry).toHaveBeenCalledTimes(1);
        expect((global as any).ErrorUtils.setGlobalHandler).toHaveBeenCalledTimes(1);
        expect((global as any).ErrorUtils.setGlobalHandler).toHaveBeenCalledWith(errorHandling.errorHandler);
    });

    it('should log and capture non-fatal errors', () => {
        const captureJSException = jest.spyOn(Sentry, 'captureJSException');

        errorHandling.errorHandler(error, false);
        expect(logError).toHaveBeenCalledTimes(1);
        expect(logError).toHaveBeenCalledWith('Handling Javascript error', error, false);
        expect(captureJSException).not.toHaveBeenCalled();
    });

    it('should capture and show alert for fatal errors', () => {
        const captureJSException = jest.spyOn(Sentry, 'captureJSException');
        const reloadAppAsync = jest.spyOn(ExpoModulesCore, 'reloadAppAsync');
        const alert = jest.spyOn(Alert, 'alert');

        const originalDev = (global as any).__DEV__;
        (global as any).__DEV__ = false;
        try {
            const throwError = new Error(error);
            errorHandling.errorHandler(throwError, true);

            expect(logError).toHaveBeenCalledWith('Handling Javascript error', throwError, true);
            expect(captureJSException).toHaveBeenCalledWith(throwError, true);
            expect(alert).toHaveBeenCalledTimes(1);
            expect(alert.mock.calls[0].length).toBe(4);

            alert.mock.calls[0][2]?.[0]?.onPress?.();
            expect(reloadAppAsync).toHaveBeenCalledWith('Fatal error recovery');
        } finally {
            (global as any).__DEV__ = originalDev;
        }
    });
});
