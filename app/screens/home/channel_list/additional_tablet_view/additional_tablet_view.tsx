// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Events, Navigation, Screens} from '@constants';
import Channel from '@screens/channel';
import GlobalThreads from '@screens/global_threads';

type SelectedView = {
    id: string;
    Component: any;
}

type Props = {
    onTeam: boolean;
    currentChannelId: string;
    isCRTEnabled: boolean;
}

const ComponentsList: Record<string, React.ReactNode> = {
    [Screens.CHANNEL]: Channel,
    [Screens.GLOBAL_THREADS]: GlobalThreads,
};

const channelScreen: SelectedView = {id: Screens.CHANNEL, Component: Channel};
const globalScreen: SelectedView = {id: Screens.GLOBAL_THREADS, Component: GlobalThreads};

const AdditionalTabletView = ({onTeam, currentChannelId, isCRTEnabled}: Props) => {
    const [selected, setSelected] = useState<SelectedView>(isCRTEnabled && !currentChannelId ? globalScreen : channelScreen);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, (id: string) => {
            const component = ComponentsList[id];
            if (component) {
                setSelected({
                    Component: component,
                    id,
                });
            }
        });

        return () => listener.remove();
    }, []);

    useEffect(() => {
        let time: NodeJS.Timeout | undefined;
        const l = DeviceEventEmitter.addListener(Events.TEAM_SWITCH, (switching) => {
            if (time) {
                clearTimeout(time);
            }
            if (switching) {
                setLoading(true);
            } else {
                // eslint-disable-next-line max-nested-callbacks
                time = setTimeout(() => setLoading(false), 200);
            }
        });
        return () => {
            l.remove();
            if (time) {
                clearTimeout(time);
            }
        };
    }, []);

    if (!selected || !onTeam || loading) {
        return null;
    }

    return React.createElement(selected.Component, {componentId: selected.id, isTablet: true});
};

export default AdditionalTabletView;
