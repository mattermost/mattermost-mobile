// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, Platform, type NativeEventSubscription} from 'react-native';

import {callsOnAppStateChange} from '@calls/state';
import {logDebug} from '@utils/log';

let appStateChangeListener: NativeEventSubscription | undefined;
let appStateBlurListener: NativeEventSubscription | undefined;
let appStateFocusListener: NativeEventSubscription | undefined;

const initialize = () => {
    logDebug('CallsManager: Initializing');
    if (Platform.OS === 'android') {
        appStateBlurListener = AppState.addEventListener('blur', () => {
            callsOnAppStateChange('inactive');
        });
        appStateFocusListener = AppState.addEventListener('focus', () => {
            callsOnAppStateChange('active');
        });
    } else {
        appStateChangeListener = AppState.addEventListener('change', callsOnAppStateChange);
    }
};

const cleanup = () => {
    appStateChangeListener?.remove();
    appStateBlurListener?.remove();
    appStateFocusListener?.remove();
};

export const CallsManager = {
    initialize,
    cleanup,
};
