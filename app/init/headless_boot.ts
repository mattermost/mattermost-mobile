// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Install WinterCG globals needed by the calls stack (TextDecoder for
// msgpack/WebRTC negotiation, URL for the WebSocket client). The foreground
// path receives these through Expo's `Expo.fx`.
import {installGlobal} from 'expo/src/winter/installGlobal';
import {AppRegistry, DeviceEventEmitter} from 'react-native';

import Calls from '@constants/calls';
import {initialize} from '@init/app';
import {logError} from '@utils/log';

installGlobal('TextDecoder', () => require('expo/src/winter/TextDecoder').TextDecoder);
installGlobal('URL', () => require('expo/src/winter/url').URL);
installGlobal('URLSearchParams', () => require('expo/src/winter/url').URLSearchParams);

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
