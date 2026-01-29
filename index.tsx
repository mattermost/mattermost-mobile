// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RUNNING_E2E} from '@env';
import TurboLogger from '@mattermost/react-native-turbo-log';
import {ExpoRoot} from 'expo-router';
import React from 'react';
import {AppRegistry, LogBox, Platform, UIManager} from 'react-native';

import setFontFamily from './app/utils/font_family';
import {logInfo} from './app/utils/log';

declare const global: { HermesInternal: null | {} };

TurboLogger.configure({
    dailyRolling: false,
    logToFile: !__DEV__,
    maximumFileSize: 1024 * 1024,
    maximumNumberOfFiles: 2,
});

if (__DEV__) {
    LogBox.ignoreLogs([
        'new NativeEventEmitter',
        'Open debugger to view warnings.',
    ]);

    // Ignore all notifications if running e2e
    const isRunningE2e = RUNNING_E2E === 'true';
    logInfo(`RUNNING_E2E: ${RUNNING_E2E}, isRunningE2e: ${isRunningE2e}`);
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
    require('@formatjs/intl-relativetimeformat/polyfill-force');
}

if (Platform.OS === 'android') {
    const ShareExtension = require('share_extension/index.tsx').default;
    AppRegistry.registerComponent('MattermostShare', () => ShareExtension);
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

// Must be exported or Fast Refresh won't update the context
export function App() {
    const ctx = require.context('./app/routes');
    return <ExpoRoot context={ctx}/>;
}

// Register with the name that iOS AppDelegate expects
AppRegistry.registerComponent('Mattermost', () => App);
