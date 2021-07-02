// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {DeviceEventEmitter, LayoutChangeEvent, Platform, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ViewTypes from '@constants/view';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {useTheme} from '../theme_provider';

// import ChannelTitle from './channel_title';

import ChannelModel from '@typings/database/models/servers/channel';

type ChannelNavBar = {
    channel: ChannelModel;
    onPress: () => void;
}

const ChannelNavBar = ({channel, onPress}: ChannelNavBar) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    let height = 0;
    const canHaveSubtitle = true;

    //todo: Read Messages - Include MainSidebarDrawerButton, ChannelSearchButton, SettingsSidebarDrawerButton

    const onLayout = ({nativeEvent}: LayoutChangeEvent) => {
        const {height: layouHeight} = nativeEvent.layout;
        if (height !== layouHeight && Platform.OS === 'ios') {
            height = layouHeight;
        }

        DeviceEventEmitter.emit(ViewTypes.CHANNEL_NAV_BAR_CHANGED, layouHeight);
    };

    return (
        <View
            onLayout={onLayout}
            style={[style.header, {height: height + insets.top, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right}]}
        >

            <Text>in channel nav bar</Text>
            {/*<ChannelTitle*/}
            {/*    channel={channel}*/}
            {/*    onPress={onPress}*/}
            {/*    canHaveSubtitle={canHaveSubtitle}*/}
            {/*/>*/}
        </View>
    );
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        header: {
            backgroundColor: theme.sidebarHeaderBg,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: '100%',
            ...Platform.select({
                android: {
                    elevation: 10,
                },
                ios: {
                    zIndex: 10,
                },
            }),
        },
    };
});

export default ChannelNavBar;
