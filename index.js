// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable no-new */

// initialize core so unbundling has setTimeout defined
import 'react-native/Libraries/Core/InitializeCore';
import {AppRegistry, DeviceEventEmitter, Platform} from 'react-native';

import Mattermost from 'app/mattermost';
import ShareExtension from 'share_extension/android';

import telemetry from './telemetry';

const jsBundleMetrics = 'JS_BUNDLE_METRICS';
const metricsSubscription = DeviceEventEmitter.addListener(jsBundleMetrics, (metrics) => {
    telemetry.capture('jsBundleRun', metrics.jsBundleRunStartTime, metrics.jsBundleRunEndTime);
    DeviceEventEmitter.removeSubscription(metricsSubscription);
});

if (Platform.OS === 'android') {
    AppRegistry.registerComponent('MattermostShare', () => ShareExtension);
}

if (__DEV__) { //eslint-disable-line no-undef
    const modules = require.getModules();
    const moduleIds = Object.keys(modules);
    const loadedModuleNames = moduleIds.
        filter((moduleId) => modules[moduleId].isInitialized).
        map((moduleId) => modules[moduleId].verboseName);

    const waitingModuleNames = moduleIds.
        filter((moduleId) => !modules[moduleId].isInitialized).
        map((moduleId) => modules[moduleId].verboseName);

    // make sure that the modules you expect to be waiting are actually waiting
    console.log( //eslint-disable-line no-console
        'loaded:',
        loadedModuleNames,
        'waiting:',
        waitingModuleNames
    );

    // grab this text blob, and put it in a file named packager/moduleNames.js
    console.log(`module.exports = ${JSON.stringify(loadedModuleNames.sort())};`); //eslint-disable-line no-console
}

new Mattermost();
