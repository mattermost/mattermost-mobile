// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Platform, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {DEFAULT_HEADER_HEIGHT} from '@constants/view';

const topBarHeight = DEFAULT_HEADER_HEIGHT;

const style = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        width: '100%',
        ...Platform.select({
            android: {
                elevation: 9,
            },
            ios: {
                zIndex: 9,
            },
        }),
    },
});

type Props = {
    children: React.ReactNode;
    threadScreen?: boolean;
}

const FloatingCallContainer = ({threadScreen, ...props}: Props) => {
    const insets = useSafeAreaInsets();
    const wrapperTop = {
        top: insets.top + (threadScreen ? 0 : topBarHeight),
    };

    return (
        <View style={[style.wrapper, wrapperTop]}>
            {props.children}
        </View>
    );
};

export default FloatingCallContainer;
