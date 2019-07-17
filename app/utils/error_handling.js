// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {
    Alert,
} from 'react-native';

import {
    setJSExceptionHandler,
    setNativeExceptionHandler,
} from 'react-native-exception-handler';

import {Client4} from 'mattermost-redux/client';
import {logError} from 'mattermost-redux/actions/errors';
import {close as closeWebSocket} from 'mattermost-redux/actions/websocket';

import {purgeOfflineStore} from 'app/actions/views/root';
import {
    captureException,
    captureJSException,
    initializeSentry,
    LOGGER_NATIVE,
} from 'app/utils/sentry';

import {app, store} from 'app/mattermost';

import {t} from 'app/utils/i18n';

const errorHandler = (e, isFatal) => {
    if (__DEV__ && !e && !isFatal) {
        // react-native-exception-handler redirects console.error to call this, and React calls
        // console.error without an exception when prop type validation fails, so this ends up
        // being called with no arguments when the error handler is enabled in dev mode.
        return;
    }

    console.warn('Handling Javascript error', e, isFatal); // eslint-disable-line no-console
    captureJSException(e, isFatal, store);

    const {dispatch} = store;

    dispatch(closeWebSocket());

    if (Client4.getUrl()) {
        dispatch(logError(e));
    }

    if (isFatal && e instanceof Error) {
        const translations = app.getTranslations();

        Alert.alert(
            translations[t('mobile.error_handler.title')],
            translations[t('mobile.error_handler.description')],
            [{
                text: translations[t('mobile.error_handler.button')],
                onPress: () => {
                    // purge the store
                    dispatch(purgeOfflineStore());
                },
            }],
            {cancelable: false}
        );
    }
};

const nativeErrorHandler = (e) => {
    console.warn('Handling native error ' + JSON.stringify(e)); // eslint-disable-line no-console
    captureException(e, LOGGER_NATIVE, store);
};

export function initializeErrorHandling() {
    initializeSentry();
    setJSExceptionHandler(errorHandler, false);
    setNativeExceptionHandler(nativeErrorHandler, false);
}
