// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {DeviceEventEmitter, LayoutChangeEvent, Platform, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ViewTypes from '@constants/view';
import {Config} from '@typings/database/models/servers/config';
import {General} from '@constants';
import {getUserIdFromChannelName} from '@utils/user';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ChannelTitle from '../channel_title';
import {useTheme} from '../theme_provider';

import type ChannelModel from '@typings/database/models/servers/channel';

type ChannelNavBar = {
    channel: ChannelModel;
    currentUserId: string;
    onPress: () => void;
    config: Config;
}

const ChannelNavBar = ({currentUserId, channel, onPress, config}: ChannelNavBar) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    let height = 0;

    //todo: Read Messages - Include MainSidebarDrawerButton, ChannelSearchButton, SettingsSidebarDrawerButton

    const onLayout = ({nativeEvent}: LayoutChangeEvent) => {
        const {height: layouHeight} = nativeEvent.layout;
        if (height !== layouHeight && Platform.OS === 'ios') {
            height = layouHeight;
        }

        DeviceEventEmitter.emit(ViewTypes.CHANNEL_NAV_BAR_CHANGED, layouHeight);
    };

    let teammateId: string | undefined;
    if (channel?.type === General.DM_CHANNEL) {
        teammateId = getUserIdFromChannelName(currentUserId, channel.name);
    }
    return (
        <View
            onLayout={onLayout}
            style={[style.header, {height: height + insets.top, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right}]}
        >
            <ChannelTitle
                currentUserId={currentUserId}
                channel={channel}
                onPress={onPress}
                canHaveSubtitle={true}
                config={config}
                teammateId={teammateId}
            />
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
