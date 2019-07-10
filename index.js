// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import 'react-native/Libraries/Core/InitializeCore';
import {AppRegistry, DeviceEventEmitter, Platform, Text, YellowBox} from 'react-native';
import 'react-native-gesture-handler';

import LocalConfig from 'assets/config';

import telemetry from 'app/telemetry';

import 'app/mattermost';

if (__DEV__) {
    YellowBox.ignoreWarnings([
        'Warning: componentWillMount is deprecated',
        'Warning: componentWillUpdate is deprecated',
        'Warning: componentWillReceiveProps is deprecated',

        // Hide warnings caused by React Native (https://github.com/facebook/react-native/issues/20841)
        'Require cycle: node_modules/react-native/Libraries/Network/fetch.js',
    ]);
}

const setFontFamily = () => {
    // Set a global font for Android
    const defaultFontFamily = {
        style: {
            fontFamily: 'Roboto',
        },
    };
    const TextRender = Text.render;
    const initialDefaultProps = Text.defaultProps;
    Text.defaultProps = {
        ...initialDefaultProps,
        ...defaultFontFamily,
    };
    Text.render = function render(props, ...args) {
        const oldProps = props;
        let newProps = {...props, style: [defaultFontFamily.style, props.style]};
        try {
            return Reflect.apply(TextRender, this, [newProps, ...args]);
        } finally {
            newProps = oldProps;
        }
    };
};

if (Platform.OS === 'android') {
    const ShareExtension = require('share_extension/android').default;
    AppRegistry.registerComponent('MattermostShare', () => ShareExtension);
    setFontFamily();

    if (LocalConfig.TelemetryEnabled) {
        const metricsSubscription = DeviceEventEmitter.addListener('nativeMetrics', (metrics) => {
            telemetry.setAppStartTime(metrics.appReload);
            telemetry.include([
                {name: 'start:process_packages', startTime: metrics.processPackagesStart, endTime: metrics.processPackagesEnd},
                {name: 'start:content_appeared', startTime: metrics.appReload, endTime: metrics.appContentAppeared},
            ]);
            telemetry.start(['start:overall'], metrics.appReload);

            DeviceEventEmitter.removeSubscription(metricsSubscription);
        });
    }
}

// Uncomment the snippet below if you want to update the modules
// defined in packager/modulePaths.js so they are included in the main bundle.

/*
/!* eslint-disable no-console *!/
if (__DEV__) {
    const modules = require.getModules();
    const moduleIds = Object.keys(modules);
    const loadedModuleNames = moduleIds.
        filter((moduleId) => modules[moduleId].isInitialized).
        map((moduleId) => modules[moduleId].verboseName);

    const waitingModuleNames = moduleIds.
        filter((moduleId) => !modules[moduleId].isInitialized).
        map((moduleId) => modules[moduleId].verboseName);

    // make sure that the modules you expect to be waiting are actually waiting
    console.log(
        'loaded:',
        loadedModuleNames,
        'waiting:',
        waitingModuleNames
    );

    // grab this text blob, and put it in a file named packager/moduleNames.js
    console.log(`module.exports = ${JSON.stringify(loadedModuleNames.sort())};`);
}
*/
