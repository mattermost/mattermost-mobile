// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RUNNING_E2E} from '@env';
import TurboLogger from '@mattermost/react-native-turbo-log';
import {ExpoRoot} from 'expo-router';
import React from 'react';
import {AppRegistry, LogBox, Platform} from 'react-native';
import {BackgroundTimer} from 'react-native-nitro-bg-timer-plus';

import {logInfo} from './app/utils/log';

// Opt out of the nitro-bg-timer-plus foreground service — we removed its manifest
// entries, so we also disable it at runtime to prevent the library from attempting
// startForegroundService() and hitting an exception.
if (Platform.OS === 'android') {
    BackgroundTimer.disableForegroundService();
}

// eslint-disable-next-line no-process-env
process.env.EXPO_OS = Platform.OS;

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
    ]);

    // Ignore all notifications if running e2e
    const isRunningE2e = RUNNING_E2E === 'true';
    logInfo(`RUNNING_E2E: ${RUNNING_E2E}, isRunningE2e: ${isRunningE2e}`);
    if (isRunningE2e) {
        LogBox.ignoreAllLogs(true);
    }
}

if (global.HermesInternal) {
    // Polyfills required to use Intl with Hermes engine
    require('@formatjs/intl-getcanonicallocales/polyfill-force.js');
    require('@formatjs/intl-locale/polyfill-force.js');
    require('@formatjs/intl-pluralrules/polyfill-force.js');
    require('@formatjs/intl-numberformat/polyfill-force.js');
    require('@formatjs/intl-datetimeformat/polyfill-force.js');
    require('@formatjs/intl-datetimeformat/add-all-tz.js');
    require('@formatjs/intl-listformat/polyfill-force.js');
    require('@formatjs/intl-relativetimeformat/polyfill-force.js');
    require('@formatjs/intl-displaynames/polyfill-force.js');
}

if (Platform.OS === 'android') {
    const ShareExtension = require('./share_extension/index.tsx').default;
    AppRegistry.registerComponent('MattermostShare', () => ShareExtension);
}

// Must be exported or Fast Refresh won't update the context
export function App() {
    const ctx = require.context('./app/routes');
    return <ExpoRoot context={ctx}/>;
}

// Register with the name that iOS AppDelegate expects
AppRegistry.registerComponent('Mattermost', () => App);
