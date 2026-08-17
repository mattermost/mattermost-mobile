// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils, {type SplitViewResult} from '@mattermost/rnutils';
import React, {createContext, useEffect, useState} from 'react';
import {NativeEventEmitter} from 'react-native';

type Props = {
    children: React.ReactNode;
}

const emitter = new NativeEventEmitter(RNUtils);

const DEFAULT_DEVICE_INFO: SplitViewResult = {isSplit: false, isTablet: false};

// Native can return nil before window metrics exist.
const raw = RNUtils.isRunningInSplitView() as SplitViewResult | null;
let info = raw ?? DEFAULT_DEVICE_INFO;

export const DeviceContext = createContext(info);
const {Provider} = DeviceContext;

const DeviceInfoProvider = ({children}: Props) => {
    const [deviceInfo, setDeviceInfo] = useState(info);
    useEffect(() => {
        const listener = emitter.addListener('SplitViewChanged', (result: SplitViewResult | null) => {
            if (result == null) {
                return;
            }
            setDeviceInfo(result);
            info = result;
        });

        return () => listener.remove();
    }, []);

    return (
        <Provider value={deviceInfo}>
            {children}
        </Provider>);
};

export default DeviceInfoProvider;
