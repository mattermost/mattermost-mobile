// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Navigation, Screens} from '@constants';
import Channel from '@screens/channel';
import GlobalDraftsAndScheduledPosts from '@screens/global_drafts';
import GlobalThreads from '@screens/global_threads';

import type {AvailableScreens} from '@typings/screens/navigation';

type SelectedView = {
    id: string;
    Component: any;
    params?: unknown;
}

type SelectedScreens = Extract<AvailableScreens, 'CHANNEL' | 'GLOBAL_DRAFTS' | 'GLOBAL_THREADS'>;

type Props = {
    onTeam: boolean;
    intialView: SelectedScreens;
}

const ComponentsList: Record<string, React.ComponentType<any>> = {
    [Screens.CHANNEL]: Channel,
    [Screens.GLOBAL_THREADS]: GlobalThreads,
    [Screens.GLOBAL_DRAFTS]: GlobalDraftsAndScheduledPosts,
};

const channelScreen: SelectedView = {id: Screens.CHANNEL, Component: Channel};
const globalThreadsScreen: SelectedView = {id: Screens.GLOBAL_THREADS, Component: GlobalThreads};
const globalDraftsScreen: SelectedView = {id: Screens.GLOBAL_DRAFTS, Component: GlobalDraftsAndScheduledPosts};

const views = new Map([
    [Screens.CHANNEL, channelScreen],
    [Screens.GLOBAL_THREADS, globalThreadsScreen],
    [Screens.GLOBAL_DRAFTS, globalDraftsScreen],
]);

const AdditionalTabletView = ({onTeam, intialView}: Props) => {
    const [selected, setSelected] = useState<SelectedView>(views.get(intialView) || channelScreen);
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
