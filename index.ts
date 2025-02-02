// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TurboLogger from '@mattermost/react-native-turbo-log';
import {LogBox, Platform, UIManager} from 'react-native';
import ViewReactNativeStyleAttributes from 'react-native/Libraries/Components/View/ReactNativeStyleAttributes';
import 'react-native-gesture-handler';
import {Navigation} from 'react-native-navigation';

import {start} from './app/init/app';
import setFontFamily from './app/utils/font_family';
import {logInfo} from './app/utils/log';

declare const global: { HermesInternal: null | {} };

// Add scaleY back to work around its removal in React Native 0.70.
ViewReactNativeStyleAttributes.scaleY = true;

TurboLogger.configure({
    dailyRolling: false,
    logToFile: !__DEV__,
    maximumFileSize: 1024 * 1024,
    maximumNumberOfFiles: 2,
});

if (__DEV__) {
    LogBox.ignoreLogs([
        'new NativeEventEmitter',
    ]);

    // Ignore all notifications if running e2e
    // eslint-disable-next-line no-process-env
    const isRunningE2e = process.env.RUNNING_E2E === 'true';
    // eslint-disable-next-line no-process-env
    logInfo(`RUNNING_E2E: ${process.env.RUNNING_E2E}, isRunningE2e: ${isRunningE2e}`);
    if (isRunningE2e) {
        LogBox.ignoreAllLogs(true);
    }
}

setFontFamily();

if (global.HermesInternal) {
    // Polyfills required to use Intl with Hermes engine
    require('@formatjs/intl-getcanonicallocales/polyfill-force');
    require('@formatjs/intl-locale/polyfill-force');
    require('@formatjs/intl-pluralrules/polyfill-force');
    require('@formatjs/intl-numberformat/polyfill-force');
    require('@formatjs/intl-datetimeformat/polyfill-force');
    require('@formatjs/intl-datetimeformat/add-all-tz');
    require('@formatjs/intl-listformat/polyfill-force');
}

if (Platform.OS === 'android') {
    const ShareExtension = require('share_extension/index.tsx').default;
    const AppRegistry = require('react-native/Libraries/ReactNative/AppRegistry');
    AppRegistry.registerComponent('MattermostShare', () => ShareExtension);
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

Navigation.events().registerAppLaunchedListener(async () => {
    start();
});
