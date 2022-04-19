// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Events, Screens} from '@constants';
import CustomStatus from '@screens/custom_status';
import EditProfile from '@screens/edit_profile';
import SavedPosts from '@screens/saved_posts';

type SelectedView = {
    id: string;
    Component: any;
}

const TabletView: Record<string, React.ReactNode> = {
    [Screens.CUSTOM_STATUS]: CustomStatus,
    [Screens.EDIT_PROFILE]: EditProfile,
    [Screens.SAVED_POSTS]: SavedPosts,
};

const AccountTabletView = () => {
    const [selected, setSelected] = useState<SelectedView | undefined>();

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.ACCOUNT_SELECT_TABLET_VIEW, (id: string) => {
            const component = TabletView[id];
            let tabletView: SelectedView | undefined;
            if (component) {
                tabletView = {
                    Component: component,
                    id,
                };
            }
            setSelected(tabletView);
        });

        return () => listener.remove();
    }, []);

    if (!selected) {
        return null;
    }

    return React.createElement(selected.Component, {componentId: selected.id, isTablet: true});
};

export default AccountTabletView;
