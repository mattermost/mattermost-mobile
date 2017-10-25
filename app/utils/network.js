import {NetInfo} from 'react-native';

import {Client4} from 'mattermost-redux/client';

export async function checkConnection() {
    const server = Client4.getUrl() || 'https://www.google.com';

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
