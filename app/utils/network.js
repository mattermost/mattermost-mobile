import {NetInfo} from 'react-native';

import RNFetchBlob from 'react-native-fetch-blob';

import {Client4} from 'mattermost-redux/client';

const PING_TIMEOUT = 10000;

export async function checkConnection(isConnected) {
    if (Client4.getBaseRoute() === '/api/v4') {
        // If we don't have a server yet, return the default implementation
        return isConnected;
    }

    // Ping the Mattermost server to detect if the we have network connection even if the websocket cannot connect
    const server = `${Client4.getBaseRoute()}/system/ping?time=${Date.now()}`;

    try {
        await RNFetchBlob.config({timeout: PING_TIMEOUT}).fetch('GET', server);
        return true;
    } catch (error) {
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
