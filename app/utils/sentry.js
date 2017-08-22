// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Sentry} from 'react-native-sentry';

import {getConfig} from 'mattermost-redux/selectors/entities/general';

export function captureException(e, state) {
    capture(() => {
        Sentry.captureException(e);
    }, state);
}

export function captureMessage(message, state) {
    capture(() => {
        Sentry.captureMessage(message);
    }, state);
}

// Wrapper function to any calls to Sentry so that we can gather any necessary extra data
// before sending.
function capture(captureFunc, state) {
    try {
        const config = getConfig(state);

        // Don't contact Sentry if we're connected to a server with diagnostics disabled. Note that this will
        // still log if we're not connected to any server.
        if (config.EnableDiagnostics != null && config.EnableDiagnostics !== 'true') {
            console.warn('Not capturing because diagnostics are disabled');
            return;
        }

        console.warn('Capturing with Sentry...');

        captureFunc();
    } catch (e) {
        // Don't want this to get into an infinite loop again...
        console.warn('Exception occured while sending to Sentry');
        console.warn(e);
    }
}
