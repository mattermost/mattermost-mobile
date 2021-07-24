// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {DeviceEventEmitter, LayoutChangeEvent, Platform, useWindowDimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {Device, View as ViewConstants} from '@constants';
import {MM_TABLES} from '@constants/database';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ChannelTitle from './channel_title';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';

type ChannelNavBar = {
    channel: ChannelModel;
    onPress: () => void;
}

const ChannelNavBar = ({channel, onPress}: ChannelNavBar) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const dimensions = useWindowDimensions();
    const isLandscape = dimensions.width > dimensions.height;

    let height = 0;
    let canHaveSubtitle = true;

    const onLayout = ({nativeEvent}: LayoutChangeEvent) => {
        const {height: layoutHeight} = nativeEvent.layout;
        if (height !== layoutHeight && Platform.OS === 'ios') {
            height = layoutHeight;
        }

        DeviceEventEmitter.emit(ViewConstants.CHANNEL_NAV_BAR_CHANGED, layoutHeight);
    };

    switch (Platform.OS) {
        case 'android':
            height = ViewConstants.ANDROID_TOP_PORTRAIT;
            if (Device.IS_TABLET) {
                height = ViewConstants.ANDROID_TOP_LANDSCAPE;
            }
            break;
        case 'ios':
            height = ViewConstants.IOS_TOP_PORTRAIT - ViewConstants.STATUS_BAR_HEIGHT;
            if (Device.IS_TABLET && isLandscape) {
                height -= 1;
            } else if (isLandscape) {
                height = ViewConstants.IOS_TOP_LANDSCAPE;
                canHaveSubtitle = false;
            }

            if (Device.IS_IPHONE_WITH_INSETS && isLandscape) {
                canHaveSubtitle = false;
            }
            break;
    }

    return (
        <View
            onLayout={onLayout}
            style={[style.header, {height: height + insets.top, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right}]}
        >
            <ChannelTitle
                channel={channel}
                onPress={onPress}
                canHaveSubtitle={canHaveSubtitle}
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

const withChannel = withObservables(['channelId'], ({channelId, database}: {channelId: string } & WithDatabaseArgs) => ({
    channel: database.get(MM_TABLES.SERVER.CHANNEL).findAndObserve(channelId),
}));

export default withDatabase(withChannel(ChannelNavBar));
