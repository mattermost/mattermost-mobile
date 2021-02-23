// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

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

    return (
        <DrawerLayout
            drawerBackgroundColor={props.drawerBackgroundColor}
            drawerLockMode={props.drawerLockMode}
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
