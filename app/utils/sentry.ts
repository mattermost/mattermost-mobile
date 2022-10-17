// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Breadcrumb} from '@sentry/types';
import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';

import Config from '@assets/config.json';

import {ClientError} from './client_error';
import {logWarning} from './log';

export const BREADCRUMB_UNCAUGHT_APP_ERROR = 'uncaught-app-error';
export const BREADCRUMB_UNCAUGHT_NON_ERROR = 'uncaught-non-error';
export const LOGGER_EXTENSION = 'extension';
export const LOGGER_JAVASCRIPT = 'javascript';
export const LOGGER_JAVASCRIPT_WARNING = 'javascript_warning';
export const LOGGER_NATIVE = 'native';

let Sentry: any;

export function initializeSentry() {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!Sentry) {
        Sentry = require('@sentry/react-native');
    }

    const dsn = getDsn();

    if (!dsn) {
        logWarning('Sentry is enabled, but not configured on this platform');
        return;
    }

    Sentry.init({
        dsn,
        tracesSampleRate: 0.2,
        integrations: [
            new Sentry.ReactNativeTracing({

                // Pass instrumentation to be used as `routingInstrumentation`
                routingInstrumentation: new Sentry.ReactNativeNavigationInstrumentation(
                    Navigation,
                ),
            }),
        ],
        ...Config.SentryOptions,
    });
}

function getDsn() {
    if (Platform.OS === 'android') {
        return Config.SentryDsnAndroid;
    } else if (Platform.OS === 'ios') {
        return Config.SentryDsnIos;
    }

    return '';
}

export function captureException(error: Error | string, errorContext: any) {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!error || !errorContext) {
        logWarning('captureException called with missing arguments', error, errorContext);
        return;
    }

    Sentry.captureException(error, {...errorContext});
}

export function captureJSException(error: Error | ClientError, isFatal: boolean, errorContext: any) {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!error) {
        logWarning('captureJSException called with missing arguments', error);
        return;
    }

    if (error instanceof ClientError) {
        captureClientErrorAsBreadcrumb(error, isFatal);
    } else {
        captureException(error, {
            logger: LOGGER_JAVASCRIPT,
            ...errorContext,
        });
    }
}

function captureClientErrorAsBreadcrumb(error: ClientError, isFatal: boolean) {
    const isAppError = Boolean(error.server_error_id);
    const breadcrumb: Breadcrumb = {
        category: isAppError ? BREADCRUMB_UNCAUGHT_APP_ERROR : BREADCRUMB_UNCAUGHT_NON_ERROR,
        data: {
            isFatal: String(isFatal),
        },
        level: 'warning',
    };

    if (error.intl?.defaultMessage) {
        breadcrumb.message = error.intl.defaultMessage;
    } else {
        breadcrumb.message = error.message;
    }

    if (breadcrumb.data) {
        if (error.server_error_id) {
            breadcrumb.data.server_error_id = error.server_error_id;
        }

        if (error.status_code) {
            breadcrumb.data.status_code = error.status_code;
        }

        const match = (/^(?:https?:\/\/)[^/]+(\/.*)$/).exec(error.url);

        if (match && match.length >= 2) {
            breadcrumb.data.url = match[1];
        }
    }

    try {
        Sentry.addBreadcrumb(breadcrumb);
    } catch (e) {
        // Do nothing since this is only here to make sure we don't crash when handling an exception
        logWarning('Failed to capture breadcrumb of non-error', e);
    }
}

