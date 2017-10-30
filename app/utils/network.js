import {NetInfo} from 'react-native';

export async function checkConnection() {
    // If the websocket cannot connect probably is because the Mattermost server
    // is down and we don't want to make the app think the device is offline
    const server = 'https://www.google.com';

    try {
        await fetch(server);
        return true;
    } catch (error) {
        return false;
    }
}

function handleConnectionChange(onChange) {
    return async () => {
        const result = await checkConnection();
        onChange(result);
    };
}

export default function networkConnectionListener(onChange) {
    const connectionChanged = handleConnectionChange(onChange);

    NetInfo.isConnected.addEventListener('connectionChange', connectionChanged);
    NetInfo.isConnected.fetch().then(connectionChanged);

    const removeEventListener = () => NetInfo.isConnected.removeEventListener('connectionChange', connectionChanged); // eslint-disable-line

    return {
        removeEventListener
    };
}
