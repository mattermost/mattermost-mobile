import {
    Alert,
} from 'react-native';

import {
    setJSExceptionHandler,
    setNativeExceptionHandler
} from 'react-native-exception-handler';

import {Client4} from 'mattermost-redux/client';
import {logError} from 'mattermost-redux/actions/errors';
import {close as closeWebSocket} from 'mattermost-redux/actions/websocket';

import {purgeOfflineStore} from 'app/actions/views/root';
import {
    captureException,
    initializeSentry,
    LOGGER_JAVASCRIPT,
    LOGGER_NATIVE
} from 'app/utils/sentry';

import {app, store} from 'app/mattermost.android.js';

const errorHandler = (e, isFatal) => {
    console.warn('Handling Javascript error ' + JSON.stringify(e)); // eslint-disable-line no-console
    const {dispatch, getState} = store;

    captureException(e, LOGGER_JAVASCRIPT, store);

    const intl = app.getIntl();
    closeWebSocket()(dispatch, getState);

    if (Client4.getUrl()) {
        logError(e)(dispatch, getState);
    }

    if (isFatal) {
        Alert.alert(
            intl.formatMessage({id: 'mobile.error_handler.title', defaultMessage: 'Unexpected error occurred'}),
            intl.formatMessage({id: 'mobile.error_handler.description', defaultMessage: '\nClick relaunch to open the app again. After restart, you can report the problem from the settings menu.\n'}),
            [{
                text: intl.formatMessage({id: 'mobile.error_handler.button', defaultMessage: 'Relaunch'}),
                onPress: () => {
                    // purge the store
                    purgeOfflineStore()(dispatch, getState);
                }
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
