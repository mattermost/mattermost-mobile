// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {reloadAppAsync} from 'expo-modules-core';
import {defineMessages} from 'react-intl';
import {Alert} from 'react-native';

import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import {isBetaApp} from '@utils/general';
import {
    captureJSException,
    initializeSentry,
} from '@utils/sentry';

import {logError} from './log';

const messages = defineMessages({
    title: {
        id: 'mobile.error_handler.title',
        defaultMessage: 'Unexpected error occurred',
    },
    description: {
        id: 'mobile.error_handler.description',
        defaultMessage: '\nTap relaunch to open the app again. After restart, you can report the problem from the settings menu.\n',
    },
    button: {
        id: 'mobile.error_handler.button',
        defaultMessage: 'Relaunch',
    },
});

class JavascriptAndNativeErrorHandlerSingleton {
    initializeErrorHandling = () => {
        initializeSentry();
        ErrorUtils.setGlobalHandler(this.errorHandler);
    };

    errorHandler = (e: unknown, isFatal: boolean) => {
        logError('Handling Javascript error', e, isFatal);

        if (!__DEV__) {
            if (isBetaApp || isFatal) {
                captureJSException(e, isFatal);
            }

            if (isFatal && e instanceof Error) {
                const translations = getTranslations(DEFAULT_LOCALE);

                Alert.alert(
                    translations[messages.title.id],
                    translations[messages.description.id] + `\n\n${e.message}\n\n${e.stack}`,
                    [{
                        text: translations[messages.button.id],
                        onPress: () => reloadAppAsync('Fatal error recovery'),
                    }],
                    {cancelable: false},
                );
            }
        }
    };
}

const JavascriptAndNativeErrorHandler = new JavascriptAndNativeErrorHandlerSingleton();
export default JavascriptAndNativeErrorHandler;
