// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Platform} from 'react-native';

import {ViewTypes} from '@constants';
import {makeStyleSheetFromTheme} from '@utils/theme';

const {
    IOS_TOP_PORTRAIT,
    STATUS_BAR_HEIGHT,
} = ViewTypes;

const getStyleSheet = makeStyleSheetFromTheme(() => {
    let topBarHeight = 0;

    switch (Platform.OS) {
    case 'android':
        topBarHeight = 9;
        break;
    case 'ios':
        topBarHeight = IOS_TOP_PORTRAIT - STATUS_BAR_HEIGHT;
        break;
    }

    return {
        wrapper: {
            position: 'absolute',
            top: topBarHeight + ViewTypes.STATUS_BAR_HEIGHT + 27,
            width: '100%',
            height: '100%',
            ...Platform.select({
                android: {
                    elevation: 9,
                },
                ios: {
                    zIndex: 3,
                },
            }),
        },
    };
});

type Props = {
    children: React.ReactNodeArray;
}

const FloatingVoiceCallContainer = (props: Props) => {
    const style = getStyleSheet(props);
    return (
        <View style={style.wrapper}>
            {props.children}
        </View>
    );
};

export default FloatingVoiceCallContainer;
