// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Navigation, Screens} from '@constants';
import Channel from '@screens/channel';
import GlobalDraftsAndScheduledPosts from '@screens/global_drafts';
import GlobalThreads from '@screens/global_threads';

type SelectedView = {
    id: string;
    Component: any;
    params?: unknown;
}

type Props = {
    onTeam: boolean;
    currentChannelId: string;
    isCRTEnabled: boolean;
}

const ComponentsList: Record<string, React.ComponentType<any>> = {
    [Screens.CHANNEL]: Channel,
    [Screens.GLOBAL_THREADS]: GlobalThreads,
    [Screens.GLOBAL_DRAFTS_AND_SCHEDULED_POSTS]: GlobalDraftsAndScheduledPosts,
};

const channelScreen: SelectedView = {id: Screens.CHANNEL, Component: Channel};
const globalScreen: SelectedView = {id: Screens.GLOBAL_THREADS, Component: GlobalThreads};

const AdditionalTabletView = ({onTeam, currentChannelId, isCRTEnabled}: Props) => {
    const [selected, setSelected] = useState<SelectedView>(isCRTEnabled && !currentChannelId ? globalScreen : channelScreen);
    const [initiaLoad, setInitialLoad] = useState(true);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, (id: string, params?: unknown) => {
            const component = ComponentsList[id];
            if (component) {
                setSelected({
                    Component: component,
                    id,
                    params,
                });
            }
        });

        return () => listener.remove();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            setInitialLoad(false);
        }, 0);

        return () => clearTimeout(t);
    }, []);

    if (!selected || !onTeam || initiaLoad) {
        return null;
    }

    return React.createElement(selected.Component, {componentId: selected.id, isTabletView: true, ...(selected.params || {})});
};

export default AdditionalTabletView;
