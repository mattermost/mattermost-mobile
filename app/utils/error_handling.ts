// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import {setJSExceptionHandler} from 'react-native-exception-handler';

import {DEFAULT_LOCALE, getTranslations, t} from '@i18n';
import {dismissAllModals, dismissAllOverlays} from '@screens/navigation';
import {isBetaApp} from '@utils/general';
import {
    captureException,
    captureJSException,
    initializeSentry,
} from '@utils/sentry';

import {logWarning} from './log';

class JavascriptAndNativeErrorHandlerSingleton {
    initializeErrorHandling = () => {
        initializeSentry();
        setJSExceptionHandler(this.errorHandler, false);

        // setNativeExceptionHandler(this.nativeErrorHandler, false);
    };

    nativeErrorHandler = (e: string) => {
        logWarning('Handling native error ' + e);
        captureException(e);
    };

    errorHandler = (e: unknown, isFatal: boolean) => {
        if (__DEV__ && !e && !isFatal) {
            // react-native-exception-handler redirects console.error to call this, and React calls
            // console.error without an exception when prop type validation fails, so this ends up
            // being called with no arguments when the error handler is enabled in dev mode.
            return;
        }

        logWarning('Handling Javascript error', e, isFatal);

        if (isBetaApp || isFatal) {
            captureJSException(e, isFatal);
        }

        if (isFatal && e instanceof Error) {
            const translations = getTranslations(DEFAULT_LOCALE);

            Alert.alert(
                translations[t('mobile.error_handler.title')],
                translations[t('mobile.error_handler.description')] + `\n\n${e.message}\n\n${e.stack}`,
                [{
                    text: translations[t('mobile.error_handler.button')],
                    onPress: async () => {
                        await dismissAllModals();
                        await dismissAllOverlays();
                    },
                }],
                {cancelable: false},
            );
        }
    };
}

const JavascriptAndNativeErrorHandler = new JavascriptAndNativeErrorHandlerSingleton();
export default JavascriptAndNativeErrorHandler;
