// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import type {Theme} from '@mm-redux/types/preferences';

type SafeAreaProps = {
    backgroundColor?: string;
    children: Array<React.ReactChild> | React.ReactChild;
    excludeHeader?: boolean;
    excludeFooter?: boolean;
    excludeLeft?: boolean;
    excludeRight?: boolean;
    headerComponent?: React.ReactElement;
    footerColor?: string;
    footerComponent?: React.ReactElement;
    navBarBackgroundColor?: string;
    theme: Theme;
}

const SafeArea = (props: SafeAreaProps) => {
    const {
        backgroundColor,
        excludeFooter,
        excludeHeader,
        excludeLeft,
        excludeRight,
        footerColor,
        footerComponent,
        headerComponent,
        navBarBackgroundColor,
        theme,
    } = props;
    const insets = useSafeAreaInsets();

    const renderTop = useCallback(() => {
        if (excludeHeader) {
            return null;
        }

        let topColor = theme.sidebarHeaderBg;
        if (navBarBackgroundColor) {
            topColor = navBarBackgroundColor;
        }

        return (
            <View style={{backgroundColor: topColor, zIndex: 10, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right}}>
                {headerComponent}
            </View>
        );
    }, [insets, props.theme]);

    let bgColor = theme.centerChannelBg;
    if (backgroundColor) {
        bgColor = backgroundColor;
    }

    let bottomColor = theme.centerChannelBg;
    if (footerColor) {
        bottomColor = footerColor;
    }

    let bottomInset = insets.bottom;
    if (excludeFooter) {
        bottomInset = 0;
    }

    return (
        <View style={{flex: 1, backgroundColor: bgColor}}>
            {renderTop()}
            <View style={{flex: 1, marginLeft: excludeLeft ? 0 : insets.left, marginRight: excludeRight ? 0 : insets.right}}>
                {props.children}
            </View>
            <View style={{marginBottom: bottomInset, backgroundColor: bottomColor}}>
                {footerComponent}
            </View>
        </View>
    );
};

export default SafeArea;
