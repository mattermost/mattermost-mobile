// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppRegistry, DeviceEventEmitter} from 'react-native';

import Calls from '@constants/calls';
import {logError} from '@utils/log';

// Started by MMCallsBootTaskService when an incoming-call FCM arrives while
// the process is killed. Initialization attaches the normal WebSocket and
// calls-native listeners before the user reacts to the native call surface.
let bootedOnce = false;

const waitForAllCallsEnded = (): Promise<void> => new Promise((resolve) => {
    const sub = DeviceEventEmitter.addListener(Calls.ALL_NATIVE_CALLS_ENDED_EVENT, () => {
        sub.remove();
        resolve();
    });
});

const headlessBootHandler = async () => {
    if (bootedOnce) {
        return;
    }
    bootedOnce = true;
    try {
        // Keep WinterCG and the full initialization graph out of ordinary
        // foreground startup. They are needed only when native Calls wakes JS.
        // The foreground path receives these globals through Expo's `Expo.fx`.
        const {installGlobal} = require('expo/src/winter/installGlobal');
        installGlobal('TextDecoder', () => require('expo/src/winter/TextDecoder').TextDecoder);
        installGlobal('URL', () => require('expo/src/winter/url').URL);
        installGlobal('URLSearchParams', () => require('expo/src/winter/url').URLSearchParams);
        const {initialize} = require('@init/app');
        await initialize();
    } catch (error) {
        // The native ring has its own timeout and teardown. Do not keep a
        // failed server/VPN initialization alive waiting for an event whose
        // JS listeners were never installed. A later call may retry boot.
        bootedOnce = false;
        logError('MMCallsBootTask: initialize failed', error);
        return;
    }

    // Keep the JS runtime alive for the answered call as well as the initial
    // ring. Native teardown emits this after the final call mapping is gone.
    await waitForAllCallsEnded();
};

AppRegistry.registerHeadlessTask('MMCallsBootTask', () => headlessBootHandler);
