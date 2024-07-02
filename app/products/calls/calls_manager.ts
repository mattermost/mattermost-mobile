// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, Platform} from 'react-native';

import {callsOnAppStateChange} from '@calls/state';

const initialize = () => {
    if (Platform.OS === 'android') {
        AppState.addEventListener('blur', () => {
            callsOnAppStateChange('inactive');
        });
        AppState.addEventListener('focus', () => {
            callsOnAppStateChange('active');
        });
    } else {
        AppState.addEventListener('change', callsOnAppStateChange);
    }
};

export const CallsManager = {
    initialize,
};
