// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NetInfo, Platform} from 'react-native';

import RNFetchBlob from 'rn-fetch-blob';

import {Client4} from 'mattermost-redux/client';

import mattermostBucket from 'app/mattermost_bucket';
import LocalConfig from 'assets/config';

const PING_TIMEOUT = 10000;

let certificate = '';
let checking = false;
export async function checkConnection(isConnected) {
    if (!Client4.getBaseRoute().startsWith('http') || checking) {
        // If we don't have a server yet, return the default implementation
        return isConnected;
    }

    // Ping the Mattermost server to detect if the we have network connection even if the websocket cannot connect
    checking = true;
    const server = `${Client4.getBaseRoute()}/system/ping?time=${Date.now()}`;

    const config = {
        timeout: PING_TIMEOUT,
        auto: true,
    };

    if (Platform.OS === 'ios' && certificate === '') {
        certificate = await mattermostBucket.getPreference('cert', LocalConfig.AppGroupId);
        config.certificate = certificate;
    }

    try {
        await RNFetchBlob.config(config).fetch('GET', server);
        checking = false;
        return true;
    } catch (error) {
        checking = false;
        return false;
    }
}

function handleConnectionChange(onChange) {
    return async (isConnected) => {
        // Set device internet connectivity immediately
        onChange(isConnected);

        // Check if connected to server
        const result = await checkConnection(isConnected);
        onChange(result);
    };
}

export default function networkConnectionListener(onChange) {
    const connectionChanged = handleConnectionChange(onChange);

    NetInfo.isConnected.addEventListener('connectionChange', connectionChanged);
    NetInfo.isConnected.fetch().then(connectionChanged);

    const removeEventListener = () => NetInfo.isConnected.removeEventListener('connectionChange', connectionChanged); // eslint-disable-line

    return {
        removeEventListener,
    };
}
