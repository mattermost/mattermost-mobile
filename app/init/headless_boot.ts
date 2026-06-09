// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Install WinterCG globals needed by the calls stack (TextDecoder for
// msgpack/WebRTC negotiation, URL for the WS client). The foreground path
// gets these via Expo's `Expo.fx`;
import {installGlobal} from 'expo/src/winter/installGlobal';
import {AppRegistry, DeviceEventEmitter} from 'react-native';

import Calls from '@constants/calls';
import {initialize} from '@init/app';
import {logError} from '@utils/log';

installGlobal('TextDecoder', () => require('expo/src/winter/TextDecoder').TextDecoder);
installGlobal('URL', () => require('expo/src/winter/url').URL);
installGlobal('URLSearchParams', () => require('expo/src/winter/url').URLSearchParams);

// Headless task started by `MMCallsBootTaskService` when an incoming-call
// FCM arrives while the app is killed. The task runs `initialize()` —
// same as MainActivity — so WS subscriptions and calls-native listeners
// attach before the user reacts to the ringing surface.
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
        await initialize();
    } catch (e) {
        logError('MMCallsBootTask: initialize failed', e);
    }

    await waitForAllCallsEnded();
};

AppRegistry.registerHeadlessTask('MMCallsBootTask', () => headlessBootHandler);
