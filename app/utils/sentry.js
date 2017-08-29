// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Platform} from 'react-native';
import {Sentry} from 'react-native-sentry';

import Config from 'assets/config';

import {ErrorTypes} from 'mattermost-redux/action_types';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

export const LOGGER_JAVASCRIPT = 'javascript';
export const LOGGER_NATIVE = 'native';
export const LOGGER_REDUX = 'redux';

let store;

export function initializeSentry(reduxStore) {
    store = reduxStore;

    if (!Config.SentryEnabled) {
        console.warn('Sentry NOT enabled');

        // Still allow Sentry to configure itself in case other code tries to call it
        Sentry.config('');

        return;
    }

    let dsn = '';
    if (Platform.OS === 'android') {
        dsn = Config.SentryDsnAndroid;
    } else if (Platform.OS === 'ios') {
        dsn = Config.SentryDsnIos;
    }

    if (!dsn) {
        console.warn('Sentry is enabled, but not configured on this platform');
    }

    Sentry.config(dsn, Config.SentryOptions).install();

    EventEmitter.on(ErrorTypes.LOG_ERROR, logReduxError);
}

function logReduxError(error) {
    captureException(error, LOGGER_REDUX);
}

export function captureException(error, logger) {
    capture(() => {
        Sentry.captureException(error, {logger});
    });
}

export function captureMessage(message, logger) {
    capture(() => {
        Sentry.captureMessage(message, {logger});
    });
}

// Wrapper function to any calls to Sentry so that we can gather any necessary extra data
// before sending.
function capture(captureFunc) {
    if (!Config.SentryEnabled) {
        console.warn('Not capturing because Sentry is disabled');
        return;
    }

    try {
        const config = getConfig(store.getState());

        // Don't contact Sentry if we're connected to a server with diagnostics disabled. Note that this will
        // still log if we're not connected to any server.
        if (config.EnableDiagnostics != null && config.EnableDiagnostics !== 'true') {
            console.warn('Not capturing because diagnostics are disabled');
            return;
        }

        console.warn('Capturing with Sentry...');

        captureFunc();
    } catch (e) {
        // Don't want this to get into an infinite loop again...
        console.warn('Exception occured while sending to Sentry');
        console.warn(e);
    }
}
