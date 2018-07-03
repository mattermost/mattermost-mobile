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
    initializeSentry,
    LOGGER_JAVASCRIPT,
    LOGGER_NATIVE,
} from 'app/utils/sentry';

import {app, store} from 'app/mattermost';

const errorHandler = (e, isFatal) => {
    console.warn('Handling Javascript error ', e); // eslint-disable-line no-console
    const {dispatch} = store;

    captureException(e, LOGGER_JAVASCRIPT, store);

    const translations = app.getTranslations();
    dispatch(closeWebSocket());

    if (Client4.getUrl()) {
        dispatch(logError(e));
    }

    if (isFatal) {
        Alert.alert(
            translations['mobile.error_handler.title'],
            translations['mobile.error_handler.description'],
            [{
                text: translations['mobile.error_handler.button'],
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
