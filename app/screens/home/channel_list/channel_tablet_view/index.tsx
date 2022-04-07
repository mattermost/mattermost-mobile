// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Navigation, Screens} from '@constants';
import Channel from '@screens/channel';
import GlobalThreads from '@screens/global_threads';

type SelectedView = {
    id: string;
    Component: any;
}

const TabletView: Record<string, React.ReactNode> = {
    [Screens.CHANNEL]: Channel,
    [Screens.GLOBAL_THREADS]: GlobalThreads,
};

const ChannelTabletView = () => {
    const [selected, setSelected] = useState<SelectedView>();

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, (id: string) => {
            const component = TabletView[id];
            if (component) {
                const tabletView = {
                    Component: component,
                    id,
                };
                setSelected(tabletView);
            }
        });

        return () => listener.remove();
    }, []);

    if (!selected) {
        return null;
    }

    return React.createElement(selected.Component, {componentId: selected.id, isTablet: true});
};

export default ChannelTabletView;
