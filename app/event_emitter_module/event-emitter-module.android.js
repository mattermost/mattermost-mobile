// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

const listeners = [];

export default {
    addEventListener: (name, callback) => {
        const listener = DeviceEventEmitter.addListener(name, callback);
        listeners.push(listener);
        return listener;
    },
    clearListeners: () => {
        listeners.forEach((listener) => {
            listener.remove();
        });
    },
    removeEventListener: (listenerId) => {
        const index = listeners.findIndex((listener) => listener === listenerId);
        if (index !== -1) {
            listenerId.remove();
            listeners.splice(index, 1);
        }
    },
};
