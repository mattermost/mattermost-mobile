// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNetInfo} from '@react-native-community/netinfo';
import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {
    Text,
    View,
} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {ANNOUNCEMENT_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {useAppState} from '@hooks/device';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {useConnectionBanner} from './use_connection_banner';

import type {NetworkPerformanceState} from '@managers/network_performance_manager';

type Props = {
    websocketState: WebsocketConnectedState;
    networkPerformanceState: NetworkPerformanceState;
}

const getStyle = makeStyleSheetFromTheme((theme: Theme) => {
    const bannerContainer = {
        flex: 1,
        paddingHorizontal: 10,
        overflow: 'hidden' as const,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        marginHorizontal: 8,
        borderRadius: 7,
    };
    return {
        background: {
            backgroundColor: theme.sidebarBg,
            zIndex: 1,
        },
        bannerContainerNotConnected: {
            ...bannerContainer,
            backgroundColor: theme.centerChannelColor,
        },
        bannerContainerConnected: {
            ...bannerContainer,
            backgroundColor: theme.onlineIndicator,
        },
        wrapper: {
            flexDirection: 'row',
            flex: 1,
            overflow: 'hidden',
        },
        bannerTextContainer: {
            flex: 1,
            flexGrow: 1,
            marginRight: 5,
            textAlign: 'center',
            color: theme.centerChannelBg,
        },
        bannerText: {
            ...typography('Body', 100, 'SemiBold'),
        },
    };
});

const ConnectionBanner = ({
    websocketState,
    networkPerformanceState,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyle(theme);
    const appState = useAppState();
    const netInfo = useNetInfo();
    const height = useSharedValue(0);

    const {visible, bannerText, isShowingConnectedBanner} = useConnectionBanner({
        websocketState,
        networkPerformanceState,
        netInfo,
        appState,
        intl,
    });

    useEffect(() => {
        height.value = withTiming(visible ? ANNOUNCEMENT_BAR_HEIGHT : 0, {
            duration: 200,
        });
    }, [height, visible]);

    const bannerStyle = useAnimatedStyle(() => ({
        height: height.value,
    }));

    return (
        <Animated.View
            style={[style.background, bannerStyle]}
        >
            <View
                style={isShowingConnectedBanner ? style.bannerContainerConnected : style.bannerContainerNotConnected}
            >
                {visible &&
                <View
                    style={style.wrapper}
                >
                    <Text
                        style={style.bannerTextContainer}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                    >
                        <CompassIcon
                            color={theme.centerChannelBg}
                            name={isShowingConnectedBanner ? 'check' : 'information-outline'}
                            size={18}
                        />
                        {'  '}
                        <Text style={style.bannerText}>
                            {bannerText}
                        </Text>
                    </Text>
                </View>
                }
            </View>
        </Animated.View>
    );
};

export default ConnectionBanner;
