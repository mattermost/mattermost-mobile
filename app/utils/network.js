import {NetInfo} from 'react-native';

import {Client4} from 'mattermost-redux/client';

export async function checkConnection(isConnected) {
    if (Client4.getBaseRoute() === '/api/v4') {
        // If we don't have a server yet, return the default implementation
        return isConnected;
    }

    // Ping the Mattermost server to detect if the we have network connection even if the websocket cannot connect
    const server = `${Client4.getBaseRoute()}/system/ping?time=${Date.now()}`;

    try {
        await fetch(server, {method: 'get'});
        return true;
    } catch (error) {
        return false;
    }
}

function handleConnectionChange(onChange) {
    return async (isConnected) => {
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
