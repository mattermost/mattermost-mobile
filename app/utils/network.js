// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NetInfo, Platform} from 'react-native';

import RNFetchBlob from 'rn-fetch-blob';

import {Client4} from 'mattermost-redux/client';

import mattermostBucket from 'app/mattermost_bucket';

const PING_TIMEOUT = 3000;

let certificate = '';
let previousState;
export async function checkConnection(isConnected) {
    if (!Client4.getBaseRoute().startsWith('http')) {
        // If we don't have a server yet, return the default implementation
        return {hasInternet: isConnected, serverReachable: false};
    }

    // Ping the Mattermost server to detect if the we have network connection even if the websocket cannot connect
    const server = `${Client4.getBaseRoute()}/system/ping?time=${Date.now()}`;

    const config = {
        timeout: PING_TIMEOUT,
        auto: true,
        waitsForConnectivity: true,
    };

    if (Platform.OS === 'ios' && certificate === '') {
        certificate = await mattermostBucket.getPreference('cert');
        config.certificate = certificate;
    }

    try {
        await RNFetchBlob.config(config).fetch('GET', server);
        return {hasInternet: isConnected, serverReachable: true};
    } catch (error) {
        return {hasInternet: isConnected, serverReachable: false};
    }
}

function handleConnectionChange(onChange) {
    return async (isConnected) => {
        if (isConnected !== previousState) {
            previousState = isConnected;

            // Check if connected to server
            const result = await checkConnection(isConnected);
            onChange(result);
        }
    };
}

export default function networkConnectionListener(onChange) {
    const connectionChanged = handleConnectionChange(onChange);

    NetInfo.isConnected.fetch().then((isConnected) => {
        NetInfo.isConnected.addEventListener('connectionChange', connectionChanged);
        connectionChanged(isConnected);
    });

    const removeEventListener = () => NetInfo.isConnected.removeEventListener('connectionChange', connectionChanged);

    return {
        removeEventListener,
    };
}
