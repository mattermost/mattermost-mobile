// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter, EventSubscription, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import NavigationTypes from '@constants/navigation';

import DrawerLayout from './drawer_layout';

export const DRAWER_INITIAL_OFFSET = 40;
export const TABLET_WIDTH = 250;

interface DrawerLayoutAdapterProps {
    children: any;
    drawerBackgroundColor?: string;
    drawerLockMode?: 'unlocked' | 'locked-closed' | 'locked-open';
    drawerPosition?: 'left' | 'right';
    drawerWidth: number;
    keyboardDismissMode?: 'none' | 'on-drag';
    forwardRef: any;
    isTablet: boolean;
    onDrawerClose?: () => void;
    onDrawerOpen?: () => void;
    onDrawerSlide?: (event: {nativeEvent: {offset: number}}) => void;
    onDrawerStateChanged?: () => 'Idle' | 'Dragging' | 'Settling';
    renderNavigationView: (drawerWidth: number) => any;
    statusBarBackgroundColor?: string;
    testID?: string;
}

const DrawerLayoutAdapter = (props: DrawerLayoutAdapterProps) => {
    const insets = useSafeAreaInsets();
    const horizontal = insets.left + insets.right;
    const [drawerLockMode, setDrawerLockMode] = useState(props.drawerLockMode || 'unlocked');

    useEffect(() => {
        let listener: EventSubscription | undefined;
        if (Platform.OS === 'ios') {
            listener = DeviceEventEmitter.addListener(NavigationTypes.DRAWER, (value) => {
                setDrawerLockMode(value);
            });
        }

        return () => listener?.remove();
    });

    return (
        <DrawerLayout
            drawerBackgroundColor={props.drawerBackgroundColor}
            drawerLockMode={drawerLockMode}
            drawerPosition={props.drawerPosition}
            drawerWidth={props.drawerWidth - horizontal}
            isTablet={props.isTablet}
            keyboardDismissMode={props.keyboardDismissMode}
            onDrawerClose={props.onDrawerClose}
            onDrawerOpen={props.onDrawerOpen}
            onDrawerSlide={props.onDrawerSlide}
            onDrawerStateChanged={props.onDrawerStateChanged}
            ref={props.forwardRef}
            renderNavigationView={props.renderNavigationView}
            statusBarBackgroundColor={props.statusBarBackgroundColor}
            testID={props.testID}
            useNativeAnimations={true}
        >
            {props.children}
        </DrawerLayout>
    );
};

export default DrawerLayoutAdapter;
