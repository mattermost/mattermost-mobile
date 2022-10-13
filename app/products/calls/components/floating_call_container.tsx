// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect, useMemo} from 'react';
import {View, Platform, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ViewTypes} from '@constants';
import EventEmitter from '@mm-redux/utils/event_emitter';

const {
    IOS_TOP_PORTRAIT,
    STATUS_BAR_HEIGHT,
    ANDROID_TOP_PORTRAIT,
} = ViewTypes;

let topBarHeight = ANDROID_TOP_PORTRAIT;
if (Platform.OS === 'ios') {
    topBarHeight = (IOS_TOP_PORTRAIT - STATUS_BAR_HEIGHT);
}

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
}

const FloatingCallContainer = (props: Props) => {
    const insets = useSafeAreaInsets();
    const [indicatorBarVisible, setIndicatorBarVisible] = useState(false);
    useEffect(() => {
        EventEmitter.on(ViewTypes.INDICATOR_BAR_VISIBLE, setIndicatorBarVisible);
        return () => EventEmitter.off(ViewTypes.INDICATOR_BAR_VISIBLE, setIndicatorBarVisible);
    }, []);

    const wrapperTop = useMemo(() => ({
        top: topBarHeight + insets.top,
    }), [insets]);

    const withIndicatorBar = useMemo(() => ({
        top: wrapperTop.top + ViewTypes.INDICATOR_BAR_HEIGHT,
    }), [wrapperTop]);

    return (
        <View style={[style.wrapper, wrapperTop, indicatorBarVisible ? withIndicatorBar : undefined]}>
            {props.children}
        </View>
    );
};

export default FloatingCallContainer;
