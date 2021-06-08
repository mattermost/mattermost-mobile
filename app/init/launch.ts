// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking} from 'react-native';

import {getActiveServerCredentials, getServerCredentials} from '@init/credentials';
import {resetToChannel, resetToSelectServer} from '@screens/navigation';
import {parseDeepLink} from '@utils/url';

import type {LaunchOptions} from '@typings/launch';

export const initialLaunch = async () => {
    let launchOptions;

    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
        launchOptions = parseDeepLink(initialUrl) as LaunchOptions;
        if (!launchOptions?.serverUrl) {
            // TODO: we should display an error to the user that the
            // deeplink is not valid, but we can't do it yet since a
            // navigation root has not been set. Maybe we need a
            // launchOption for this?
        }
    }

    launchApp(launchOptions);
}

export const launchApp = async (options?: LaunchOptions) => {
    const credentials = options?.serverUrl ? 
        await getServerCredentials(options.serverUrl) :
        await getActiveServerCredentials();

    if (credentials) {
        launchToChannel(options);
        return;
    }
    
    launchToServer(options);
};

// TODO: This func is probably not needed. A PushNotification func can just call
// launchApp with the appropriate launchOptions.
export const launchFromPushNotification = () => {
    // TODO: the same will be needed for launching from push notification, however,
    // with push notifications the current payload does not include the server URL.
    // We'll do the following on the native side:
    // 1. Payload includes server URL (need server change), proceed to process push notif
    // 2. Only one server DB exists: add the server URL to the payload, proceed to process push notif
    // 3. Multiple servers exist: override payload with warning, proceed to process push notif
    // On the JS side, once the push notification is opened if there is no server URL do nothing
}

const launchToChannel = (options: LaunchOptions = {}) => {
    // TODO: Use LaunchOptions to fetch posts for channel and then load user profile, etc...

    // eslint-disable-next-line no-console
    console.log('Launch app in Channel screen');
    const passProps = {skipMetrics: true};
    resetToChannel(passProps);
}

const launchToServer = (options: LaunchOptions = {}) => {
    // TODO: Do we need to do anythin with LaunchOptions prior
    // to resetting navigation?
    resetToSelectServer(options);
}