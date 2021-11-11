// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
import {View, Platform} from 'react-native';

import {ViewTypes} from '@constants';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {makeStyleSheetFromTheme} from '@utils/theme';

const {
    IOS_TOP_PORTRAIT,
    STATUS_BAR_HEIGHT,
} = ViewTypes;

const getStyleSheet = makeStyleSheetFromTheme(() => {
    const topBarHeight = Platform.select({android: 9, ios: IOS_TOP_PORTRAIT - STATUS_BAR_HEIGHT}) || 0;

    return {
        wrapper: {
            position: 'absolute',
            top: topBarHeight + ViewTypes.STATUS_BAR_HEIGHT + 27,
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
        withIndicatorBar: {
            top: topBarHeight + ViewTypes.STATUS_BAR_HEIGHT + 27 + ViewTypes.INDICATOR_BAR_HEIGHT,
        },
    };
});

type Props = {
    children: React.ReactNodeArray;
}

const FloatingCallContainer = (props: Props) => {
    const style = getStyleSheet(props);
    const [indicatorBarVisible, setIndicatorBarVisible] = useState(false);
    useEffect(() => {
        EventEmitter.on(ViewTypes.INDICATOR_BAR_VISIBLE, setIndicatorBarVisible);
        return () => EventEmitter.off(ViewTypes.INDICATOR_BAR_VISIBLE, setIndicatorBarVisible);
    }, []);
    return (
        <View style={[style.wrapper, indicatorBarVisible ? style.withIndicatorBar : undefined]}>
            {props.children}
        </View>
    );
};

export default FloatingCallContainer;
